import org.apache.flink.api.common.eventtime.WatermarkStrategy;
import org.apache.flink.api.common.functions.AggregateFunction;
import org.apache.flink.api.common.functions.FilterFunction;
import org.apache.flink.api.common.functions.MapFunction;
import org.apache.flink.api.common.functions.RichMapFunction;
import org.apache.flink.api.java.tuple.Tuple2;
import org.apache.flink.configuration.Configuration;
import org.apache.flink.streaming.api.datastream.DataStream;
import org.apache.flink.streaming.api.datastream.KeyedStream;
import org.apache.flink.streaming.api.environment.StreamExecutionEnvironment;
import org.apache.flink.streaming.api.functions.sink.PrintSinkFunction;
import org.apache.flink.streaming.api.windowing.assigners.TumblingEventTimeWindows;
import org.apache.flink.streaming.api.windowing.time.Time;

/**
 * DataStream 作业骨架 —— 覆盖 L01 §4（API 骨架）和 §5（KeyBy / KeyedStream）。
 *
 * <p>设计意图：用一个"电商订单按类目实时统计 GMV"的完整管道，展示 Flink 作业从 source 到 sink 的标准骨架。
 * 这不是 WordCount——每个环节都有生产意义。</p>
 *
 * <p>管道结构：
 * <pre>
 *   Source（模拟订单流）
 *     → filter（剔除 null / 空行）
 *     → map（解析为 OrderRecord）
 *     → assignTimestampsAndWatermarks（水位线）
 *     → keyBy（按类目分组 → 得到 KeyedStream）
 *     → window（5 秒滚动窗口）
 *     → aggregate（类目内求和）
 *     → sink（打印）
 * </pre></p>
 *
 * <p>面试注意点：<ul>
 *   <li>keyBy 之后才能用 KeyedState 和按键窗口</li>
 *   <li>WatermarkStrategy 是 Event Time 语义的前提</li>
 *   <li>TumblingEventTimeWindows 触发靠 Watermark 推进</li>
 *   <li>env.execute() 是作业提交的唯一出口</li>
 * </ul></p>
 */
public class StreamProcessingSkeleton {

    // ---- 数据模型：扁平 POJO ----
    public static class OrderRecord {
        public long orderId;
        public String category;
        public double amount;
        public long eventTime;

        /** 无参构造：Flink POJO 序列化快通道的必要条件 */
        public OrderRecord() {}

        public OrderRecord(long orderId, String category, double amount, long eventTime) {
            this.orderId = orderId;
            this.category = category;
            this.amount = amount;
            this.eventTime = eventTime;
        }
    }

    public static void main(String[] args) throws Exception {
        // 1. 执行环境 —— 流批统一的入口
        StreamExecutionEnvironment env = StreamExecutionEnvironment.getExecutionEnvironment();
        env.setParallelism(2);                        // 全局并行度
        env.enableCheckpointing(5000);                // 5s checkpoint（L04 细讲）

        // 2. Source —— 模拟订单流
        DataStream<String> rawOrders = env.socketTextStream("localhost", 9999);

        // 3. Transform 管道
        DataStream<Tuple2<String, Double>> categoryGmv = rawOrders
                // 3a. filter：剔除脏数据
                .filter((FilterFunction<String>) s -> s != null && !s.trim().isEmpty())
                // 3b. map：解析为结构化 POJO
                .map((MapFunction<String, OrderRecord>) line -> {
                    String[] parts = line.split(",");
                    return new OrderRecord(
                            Long.parseLong(parts[0].trim()),
                            parts[1].trim(),
                            Double.parseDouble(parts[2].trim()),
                            System.currentTimeMillis()
                    );
                })
                // 3c. 分配 Watermark：Event Time 窗口语义的前提
                .assignTimestampsAndWatermarks(
                        WatermarkStrategy.<OrderRecord>forMonotonousTimestamps()
                                .withTimestampAssigner((order, ts) -> order.eventTime)
                )
                // 3d. keyBy：按类目哈希分区 → KeyedStream → 可以访问 KeyedState
                .keyBy(order -> order.category)
                // 3e. 开窗：5 秒滚动窗口（Event Time）
                .window(TumblingEventTimeWindows.of(Time.seconds(5)))
                // 3f. 聚合：窗口内累加 amount
                .aggregate(new AggregateFunction<OrderRecord, Tuple2<String, Double>, Tuple2<String, Double>>() {
                    @Override
                    public Tuple2<String, Double> createAccumulator() {
                        return Tuple2.of("", 0.0);
                    }

                    @Override
                    public Tuple2<String, Double> add(OrderRecord value, Tuple2<String, Double> acc) {
                        return Tuple2.of(value.category, acc.f1 + value.amount);
                    }

                    @Override
                    public Tuple2<String, Double> getResult(Tuple2<String, Double> acc) {
                        return acc;
                    }

                    @Override
                    public Tuple2<String, Double> merge(Tuple2<String, Double> a, Tuple2<String, Double> b) {
                        return Tuple2.of(a.f0, a.f1 + b.f1);
                    }
                });

        // 4. Sink —— 输出结果
        categoryGmv.addSink(new PrintSinkFunction<>());

        // 5. 提交作业 —— 没有这行代码不会跑
        env.execute("order-category-gmv-skeleton");
    }
}
