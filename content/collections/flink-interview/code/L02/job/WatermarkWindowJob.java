package code.L02.job;

import org.apache.flink.api.common.eventtime.*;
import org.apache.flink.api.common.typeinfo.Types;
import org.apache.flink.api.java.tuple.Tuple2;
import org.apache.flink.streaming.api.datastream.DataStream;
import org.apache.flink.streaming.api.datastream.SingleOutputStreamOperator;
import org.apache.flink.streaming.api.environment.StreamExecutionEnvironment;
import org.apache.flink.streaming.api.windowing.assigners.TumblingEventTimeWindows;
import org.apache.flink.streaming.api.windowing.time.Time;
import org.apache.flink.util.OutputTag;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.time.Duration;
import java.util.Random;

/**
 * Watermark + Event Time 窗口 + 乱序三层防线 — 覆盖 L02 核心知识点。
 *
 * <h3>Pipeline</h3>
 * <pre>
 *   Simulated Source (OrderEvent，含乱序)
 *     → Watermark: boundedOutOfOrderness(5s) + withIdleness(1min)
 *     → keyBy(userId)
 *     → TumblingEventTimeWindows(5min)
 *       → allowedLateness(1min)        ← 迟到更新
 *       → sideOutputLateData(lateTag)   ← 严重迟到分流
 *     → aggregate(CountAgg + WindowInfo)
 *     → Sink
 *   Late Data → SideOutput → 日志/告警
 * </pre>
 *
 * <h3>面试点</h3>
 * <ul>
 *   <li>Watermark 是怎么生成的：{@code maxEventTime - 5s}</li>
 *   <li>多输入算子 watermark = min(上游)：keyBy 后取最小值</li>
 *   <li>三层防线：Watermark 容忍 → allowedLateness → SideOutput</li>
 *   <li>增量聚合：aggregate 每次更新累加器，状态 O(1)</li>
 * </ul>
 */
public class WatermarkWindowJob {

    private static final Logger LOG = LoggerFactory.getLogger(WatermarkWindowJob.class);

    // ========== 配置 ==========
    private static final Duration OUT_OF_ORDERNESS = Duration.ofSeconds(5);
    private static final Duration IDLENESS_TIMEOUT = Duration.ofMinutes(1);
    private static final long WINDOW_SIZE_MS = 5 * 60 * 1000L;   // 5 分钟
    private static final long ALLOWED_LATENESS_MS = 60 * 1000L;  // 1 分钟

    public static void main(String[] args) throws Exception {

        StreamExecutionEnvironment env = StreamExecutionEnvironment.getExecutionEnvironment();
        env.setParallelism(4);
        env.enableCheckpointing(10_000);

        // ===== 1. Watermark 策略 =====
        WatermarkStrategy<OrderEvent> wm = WatermarkStrategy
                .<OrderEvent>forBoundedOutOfOrderness(OUT_OF_ORDERNESS)
                .withTimestampAssigner((event, ts) -> event.eventTime)
                .withIdleness(IDLENESS_TIMEOUT);   // 空闲分区不拖全局

        // ===== 2. Source（模拟，生产用 KafkaSource）=====
        DataStream<OrderEvent> source = env
                .addSource(new SimulatedOrderSource())
                .name("order-source")
                .assignTimestampsAndWatermarks(wm)
                .name("watermark-assigner");

        // ===== 3. Window + 三层防线 =====
        OutputTag<OrderEvent> lateTag = new OutputTag<OrderEvent>("late-data") {};

        SingleOutputStreamOperator<Tuple2<String, Long>> result = source
                .filter(e -> e.eventType.equals("PAY"))        // 只统计已支付
                .name("filter-pay")
                .keyBy(e -> e.userId)                           // 按用户聚合
                .window(TumblingEventTimeWindows.of(Time.milliseconds(WINDOW_SIZE_MS)))
                .allowedLateness(Time.milliseconds(ALLOWED_LATENESS_MS))
                .sideOutputLateData(lateTag)
                .aggregate(
                        // 增量聚合：每条数据更新累加器
                        new org.apache.flink.api.common.functions.AggregateFunction<
                                OrderEvent, Tuple2<String, Long>, Tuple2<String, Long>>() {
                            @Override
                            public Tuple2<String, Long> createAccumulator() {
                                return Tuple2.of("", 0L);
                            }
                            @Override
                            public Tuple2<String, Long> add(
                                    OrderEvent e, Tuple2<String, Long> acc) {
                                return Tuple2.of(e.userId, acc.f1 + 1);
                            }
                            @Override
                            public Tuple2<String, Long> getResult(
                                    Tuple2<String, Long> acc) {
                                return acc;
                            }
                            @Override
                            public Tuple2<String, Long> merge(
                                    Tuple2<String, Long> a, Tuple2<String, Long> b) {
                                return Tuple2.of(a.f0, a.f1 + b.f1);
                            }
                        }
                )
                .name("window-agg");

        // ===== 4. Sink =====
        result.print().name("console-result");

        // ===== 5. 迟到数据侧输出 =====
        DataStream<OrderEvent> lateStream = result.getSideOutput(lateTag);
        lateStream.map(e -> {
            LOG.warn("Late order dropped: orderId={}, eventTime={}",
                    e.orderId, e.eventTime);
            return e;
        }).name("late-logger");

        env.execute("watermark-window-job");
    }

    // ========== 模拟数据模型 ==========

    /** 扁平 POJO — 走 PojoTypeInfo 快通道 */
    public static class OrderEvent {
        public String orderId;
        public String userId;
        public long eventTime;
        public String eventType;

        public OrderEvent() {}
        public OrderEvent(String oid, String uid, long ts, String type) {
            this.orderId = oid;
            this.userId = uid;
            this.eventTime = ts;
            this.eventType = type;
        }
    }

    /** 模拟源 — 生成含乱序的订单数据 */
    static class SimulatedOrderSource
            extends org.apache.flink.streaming.api.functions.source.RichParallelSourceFunction<OrderEvent> {
        private volatile boolean running = true;

        @Override
        public void run(SourceContext<OrderEvent> ctx) throws Exception {
            Random rand = new Random();
            long id = 0;
            while (running) {
                long now = System.currentTimeMillis();
                // 随机乱序 0-10 秒
                long et = now - rand.nextInt(10_000);
                ctx.collect(new OrderEvent(
                        "order_" + (id++),
                        "user_" + rand.nextInt(10),
                        et,
                        rand.nextDouble() < 0.8 ? "PAY" : "CREATE"
                ));
                Thread.sleep(50);
            }
        }

        @Override
        public void cancel() { running = false; }
    }
}
