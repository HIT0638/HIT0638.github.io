package code.day06.job;

import code.day06.model.OrderEvent;
import org.apache.flink.api.common.RuntimeExecutionMode;
import org.apache.flink.api.common.eventtime.WatermarkStrategy;
import org.apache.flink.api.common.typeinfo.Types;
import org.apache.flink.api.connector.source.util.ratelimit.RateLimiterStrategy;
import org.apache.flink.api.java.tuple.Tuple2;
import org.apache.flink.connector.datagen.source.DataGeneratorSource;
import org.apache.flink.connector.datagen.functions.GeneratorFunction;
import org.apache.flink.streaming.api.datastream.DataStream;
import org.apache.flink.streaming.api.environment.StreamExecutionEnvironment;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.time.Duration;
import java.util.Random;

/**
 * 流批统一示例 — 同一套代码，两种运行模式。
 *
 * <h3>核心展示</h3>
 * 这段代码<strong>不修改一行逻辑</strong>，只需切换运行模式就能在两种场景下跑：
 *
 * <pre>
 *   # 流模式：无界数据（Kafka），持续运行
 *   flink run -Dexecution.runtime-mode=STREAMING -c ...BatchUnifiedOrderCountJob job.jar
 *
 *   # 批模式：有界数据（文件/Iceberg），跑完即停
 *   flink run -Dexecution.runtime-mode=BATCH -c ...BatchUnifiedOrderCountJob job.jar
 * </pre>
 *
 * <h3>运行时差异（对用户透明）</h3>
 * <table>
 *   <tr><th></th><th>STREAMING</th><th>BATCH</th></tr>
 *   <tr><td>shuffle</td><td>Pipelined（内存直传）</td><td>Blocking（先落盘，下游等上游全完）</td></tr>
 *   <tr><td>调度</td><td>全部算子同时启动</td><td>分 Stage 拓扑序调度</td></tr>
 *   <tr><td>容错</td><td>Checkpoint 周期快照</td><td>重算上游 Stage</td></tr>
 *   <tr><td>终止</td><td>永不终止</td><td>数据读完自动结束</td></tr>
 * </table>
 *
 * <p><b>面试嘴替：</b>
 * "实时和离线补数用同一套 Flink 逻辑，runtime-mode 切换即可。
 *  数据口径一致，不用维护两套代码。批模式走 Blocking Shuffle + 分 Stage 调度，
 *  容错靠重算而不是 Checkpoint，自动适配有界数据的特性。"</p>
 */
public class BatchUnifiedOrderCountJob {

    private static final Logger LOG = LoggerFactory.getLogger(BatchUnifiedOrderCountJob.class);

    public static void main(String[] args) throws Exception {

        // ==================== 1. 环境配置 ====================
        StreamExecutionEnvironment env = StreamExecutionEnvironment.getExecutionEnvironment();

        // ★ 关键：通过参数控制运行模式，不硬编码
        // 默认 STREAMING，可通过 args[0] = "BATCH" 切批模式
        String mode = args.length > 0 ? args[0].toUpperCase() : "STREAMING";
        switch (mode) {
            case "BATCH":
                env.setRuntimeMode(RuntimeExecutionMode.BATCH);
                LOG.info("Running in BATCH mode");
                break;
            case "AUTOMATIC":
                env.setRuntimeMode(RuntimeExecutionMode.AUTOMATIC);
                LOG.info("Running in AUTOMATIC mode (Flink decides)");
                break;
            default:
                env.setRuntimeMode(RuntimeExecutionMode.STREAMING);
                LOG.info("Running in STREAMING mode");
        }

        // ==================== 2. Source ====================
        // 流模式：KafkaSource → 无限流
        // 批模式：FileSource / IcebergSource → 有界流
        //
        // 这里用 DataGeneratorSource 模拟有界数据（10000 条），
        // 在 BATCH 模式下会自动检测为有界流走批执行
        GeneratorFunction<Long, OrderEvent> generator = new GeneratorFunction<Long, OrderEvent>() {
            private final Random random = new Random();

            @Override
            public OrderEvent map(Long seq) {
                return new OrderEvent(
                        "order_" + seq,
                        "user_" + random.nextInt(100),
                        "product_" + random.nextInt(50),
                        10.0 + random.nextDouble() * 990.0,
                        System.currentTimeMillis() - random.nextInt(3600_000), // 最近 1h 内
                        random.nextDouble() < 0.8 ? "CREATE" : "PAY"
                );
            }
        };

        DataGeneratorSource<OrderEvent> source = new DataGeneratorSource<>(
                generator,
                10000L,                              // 共 10000 条 → 有界源
                RateLimiterStrategy.perSecond(1000),  // 限速（流模式有意义）
                Types.POJO(OrderEvent.class)
        );

        DataStream<OrderEvent> orders = env.fromSource(
                source,
                WatermarkStrategy.<OrderEvent>forBoundedOutOfOrderness(Duration.ofSeconds(5))
                        .withTimestampAssigner((e, ts) -> e.eventTime),
                "data-gen-source"
        );

        // ==================== 3. 计算：按用户统计订单数和金额 ====================
        // 这就是全量离线补数的典型场景：
        //   实时用窗口算 5min 滑动，离线用全量重算一天的数据。
        //   同一套 map → keyBy → reduce，口径一致。

        DataStream<Tuple2<String, String>> result = orders
                .filter(e -> "PAY".equals(e.eventType))   // 只统计已支付
                .map(e -> Tuple2.of(e.userId, e.amount + ""))
                .returns(Types.TUPLE(Types.STRING, Types.STRING))
                .keyBy(t -> t.f0)
                .reduce((a, b) -> Tuple2.of(
                        a.f0,
                        String.valueOf(Double.parseDouble(a.f1) + Double.parseDouble(b.f1))
                ))
                .name("user-amount-agg");

        // ==================== 4. Sink ====================
        // 流模式：持续输出到 Kafka/ClickHouse
        // 批模式：汇总一次性写 Hive/Iceberg
        result.print().name("console-sink");

        // ==================== 5. 执行 ====================
        env.execute("batch-unified-order-count [" + mode + "]");
    }
}
