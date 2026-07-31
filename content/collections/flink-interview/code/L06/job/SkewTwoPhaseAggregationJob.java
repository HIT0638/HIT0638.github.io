package code.day06.job;

import code.day06.model.AggregatedMetric;
import code.day06.model.OrderEvent;
import code.day06.operator.ChainControlPipeline;
import code.day06.operator.MetricExposingEnricher;
import code.day06.operator.SkewTwoPhaseAggregator;
import org.apache.flink.api.common.eventtime.*;
import org.apache.flink.streaming.api.datastream.DataStream;
import org.apache.flink.streaming.api.datastream.SingleOutputStreamOperator;
import org.apache.flink.streaming.api.environment.StreamExecutionEnvironment;
import org.apache.flink.util.OutputTag;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.time.Duration;
import java.util.Properties;
import java.util.Random;

/**
 * 倾斜打散两阶段聚合 Job — Day6 核心代码示例。
 *
 * <h3>Pipeline</h3>
 * <pre>
 *   Source (OrderEvent)
 *     → map(MetricExposingEnricher)          ← 自定义 Metrics + 校验
 *     → map(HeavyParse)   .disableChaining() ← CPU 密集算子拆链
 *     → filter(isValid)   .startNewChain()   ← 新链开启
 *     → map(enrich)
 *     → Phase 1: keyBy(userId#0..N-1).sum  ← 加盐打散，N=10
 *     → Phase 2: keyBy(userId).process()    ← 去盐全局聚合
 *     → Late Data SideOutput                ← 超时数据独立处理
 *     → Sink (print / write to ClickHouse)
 * </pre>
 *
 * <h3>设计决策</h3>
 * <ul>
 *   <li>不直接用 window().aggregate() — 窗口 API 的 Phase 1 需要在窗口函数内
 *       处理加盐前缀，而手动 KeyedProcessFunction + Timer 更灵活。</li>
 *   <li>Phase 1 用 map 加前缀 + keyBy + sum 走 Flink 内置聚合，避免自定义状态。</li>
 *   <li>Phase 2 用 KeyedProcessFunction + Timer 控制窗口触发，并输出迟到数据到 SideOutput。</li>
 *   <li>序列化：OrderEvent 和 AggregatedMetric 都是纯 POJO（PojoTypeInfo），不走 Kryo。</li>
 * </ul>
 *
 * <p><b>面试嘴替：</b>"热点 key 用两阶段聚合：
 *   Phase 1 给 key 加 0-9 随机前缀按 key#N 局部聚合，
 *   Phase 2 去掉前缀按原 key 全局聚合。"</p>
 */
public class SkewTwoPhaseAggregationJob {

    private static final Logger LOG = LoggerFactory.getLogger(SkewTwoPhaseAggregationJob.class);

    // ========== 配置常量（生产环境从配置文件或启动参数读取） ==========
    /** 两阶段聚合打散桶数：N 越大热 key 越分散，但 Phase 2 输入数据量变大 */
    private static final int SALT_BUCKETS = 10;

    /** 窗口大小：5 分钟 */
    private static final long WINDOW_SIZE_MS = 5 * 60 * 1000L;

    /** 允许迟到 1 分钟 */
    private static final long ALLOWED_LATENESS_MS = 60 * 1000L;

    /** Watermark 乱序容忍：允许数据乱序 5 秒 */
    private static final Duration OUT_OF_ORDERNESS = Duration.ofSeconds(5);

    /** 全局并行度：= source 并行度（这里用 4 示意，实际 = Kafka 分区数） */
    private static final int PARALLELISM = 4;

    public static void main(String[] args) throws Exception {

        // ==================== 1. 环境配置 ====================
        StreamExecutionEnvironment env = StreamExecutionEnvironment.getExecutionEnvironment();

        // ---- Checkpoint 配置 ----
        env.enableCheckpointing(10_000);  // 10s 一次（窗口 5min，checkpoint 开销不大）
        env.getCheckpointConfig().setCheckpointTimeout(60_000); // 1min 超时
        env.getCheckpointConfig().setMinPauseBetweenCheckpoints(5_000); // 两次间最少 5s

        // 全局并行度
        env.setParallelism(PARALLELISM);

        LOG.info("Job starting: parallelism={}, windowSize={}ms, saltBuckets={}",
                PARALLELISM, WINDOW_SIZE_MS, SALT_BUCKETS);

        // ==================== 2. Watermark 策略 ====================
        // 有界乱序 5s；空闲分区 1min 不拖全局
        WatermarkStrategy<OrderEvent> watermarkStrategy = WatermarkStrategy
                .<OrderEvent>forBoundedOutOfOrderness(OUT_OF_ORDERNESS)
                .withTimestampAssigner((event, ts) -> event.eventTime)
                .withIdleness(Duration.ofMinutes(1));

        // ==================== 3. Source ====================
        // 生产用：KafkaSource<OrderEvent>
        //   KafkaSource.<OrderEvent>builder()
        //       .setBootstrapServers("broker:9092")
        //       .setTopics("order-events")
        //       .setGroupId("skew-agg-group")
        //       .setStartingOffsets(OffsetsInitializer.latest())
        //       .setDeserializer(new OrderEventDeserializationSchema())
        //       .build();
        //
        // 这里用模拟 Source 替代，让你能直观看到数据流结构。
        DataStream<OrderEvent> source = env.addSource(new SimulatedOrderSource(PARALLELISM))
                .name("order-source")
                .assignTimestampsAndWatermarks(watermarkStrategy)
                .name("watermark-assigner");

        // ==================== 4. Metrics + 校验 ====================
        DataStream<OrderEvent> enriched = source
                .map(new MetricExposingEnricher())
                .name("metric-enricher");

        // ==================== 5. ETL + Chain 控制 ====================
        // heavyParse: CPU 密集 → disableChaining 独占线程
        // filter + enrich: 轻量 → startNewChain 后继续链在一起
        DataStream<OrderEvent> cleaned = enriched
                .map(ChainControlPipeline::heavyParse)
                .name("heavy-parse")
                .disableChaining()                          // ← 拆链！瓶颈算子独立
                .filter(ChainControlPipeline::isValidEvent)
                .name("filter-valid")
                .startNewChain()                            // ← 从这开新链
                .map(ChainControlPipeline::enrichEvent)
                .name("enrich");

        // ==================== 6. Phase 1 — 加盐打散 + 局部聚合 ====================
        // 核心逻辑：map 给 userId 加随机桶号前缀 → keyBy 新 key → sum
        // 这样热点 userId（如 "hot_user_123"）被分散到 SALT_BUCKETS 个 subTask

        DataStream<OrderEvent> phase1Result = cleaned
                .map(event -> {
                    // 给 userId 加随机盐值："hot_user_123" → "hot_user_123#7"
                    String saltedKey = event.userId + "#"
                            + ThreadLocalRandom.current().nextInt(SALT_BUCKETS);
                    event.userId = saltedKey;   // 原地修改（Flush Object Reuse 开启时慎用）
                    return event;
                })
                .name("add-salt")
                .returns(OrderEvent.class)      // ← 显式声明返回类型，避 Kryo fallback
                .keyBy(e -> e.userId)            // 按 saltedKey 重分区
                .sum("amount")                   // 局部金额聚合（Flink 内置 sum，零额外状态）
                .name("phase1-local-agg");

        // ==================== 7. Phase 2 — 去盐全局聚合 ====================
        // 核心逻辑：去掉加盐前缀 → keyBy 原始 userId → 窗口内全局聚合

        OutputTag<OrderEvent> lateDataTag = SkewTwoPhaseAggregator.LATE_DATA_TAG;

        SingleOutputStreamOperator<AggregatedMetric> phase2Result = phase1Result
                .map(event -> {
                    // 去掉盐值前缀恢复原始 userId："hot_user_123#7" → "hot_user_123"
                    int saltIdx = event.userId.lastIndexOf('#');
                    if (saltIdx > 0) {
                        event.userId = event.userId.substring(0, saltIdx);
                    }
                    return event;
                })
                .name("remove-salt")
                .returns(OrderEvent.class)
                .keyBy(e -> e.userId)                            // 按原始 userId 重分区
                .process(new SkewTwoPhaseAggregator(WINDOW_SIZE_MS, ALLOWED_LATENESS_MS))
                .name("phase2-global-agg");

        // ==================== 8. 迟到数据侧输出 ====================
        DataStream<OrderEvent> lateStream = phase2Result.getSideOutput(lateDataTag);
        lateStream
                .map(event -> {
                    LOG.warn("Late event dropped: orderId={}, eventTime={}, userId={}",
                            event.orderId, event.eventTime, event.userId);
                    return event;
                })
                .name("late-data-logger");

        // ==================== 9. Sink ====================
        // 生产用：写入 ClickHouse / Kafka / MySQL
        // 这里打印到控制台，展示完整输出结构
        phase2Result.print().name("console-sink");

        // ==================== 10. 执行 ====================
        env.execute("skew-two-phase-aggregation");
    }

    // ====================================================================
    //  模拟 Source：随机生成 OrderEvent（仅用于 demo，替换为 KafkaSource）
    // ====================================================================

    /**
     * 模拟订单事件源，生成包含热点 key 的数据。
     * 90% 数据集中在 3 个"热门用户"上，模拟真实倾斜场景。
     */
    static class SimulatedOrderSource extends org.apache.flink.streaming.api.functions.source.RichParallelSourceFunction<OrderEvent> {

        private final int parallelism;
        private volatile boolean running = true;

        SimulatedOrderSource(int parallelism) {
            this.parallelism = parallelism;
        }

        @Override
        public void run(SourceContext<OrderEvent> ctx) throws Exception {
            Random random = new Random();
            // 热门用户（占 90% 流量）— 模拟倾斜
            String[] hotUsers = {"hot_user_A", "hot_user_B", "hot_user_C"};
            // 普通用户（占 10% 流量）
            String[] normalUsers = {"user_1", "user_2", "user_3", "user_4", "user_5"};

            long orderIdCounter = 0;

            while (running) {
                long eventTime = System.currentTimeMillis()
                        - random.nextInt(10_000); // 最近 10s 内，允许乱序

                String userId;
                if (random.nextDouble() < 0.9) {
                    // 90% 概率命中热门用户 → 模拟倾斜
                    userId = hotUsers[random.nextInt(hotUsers.length)];
                } else {
                    userId = normalUsers[random.nextInt(normalUsers.length)];
                }

                OrderEvent event = new OrderEvent(
                        "order_" + (orderIdCounter++),
                        userId,
                        "product_" + random.nextInt(100),
                        10.0 + random.nextDouble() * 990.0,
                        eventTime,
                        "CREATE"
                );
                ctx.collect(event);
                Thread.sleep(10); // 控制发送速率
            }
        }

        @Override
        public void cancel() {
            running = false;
        }
    }
}
