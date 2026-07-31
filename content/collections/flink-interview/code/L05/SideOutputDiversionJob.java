import org.apache.flink.streaming.api.datastream.DataStream;
import org.apache.flink.streaming.api.datastream.SingleOutputStreamOperator;
import org.apache.flink.streaming.api.environment.StreamExecutionEnvironment;
import org.apache.flink.streaming.api.functions.ProcessFunction;
import org.apache.flink.util.Collector;
import org.apache.flink.util.OutputTag;

/**
 * SideOutput 分流模板：主流正常数据，侧输出流路由脏数据/异常数据。
 * 覆盖：L05 SideOutput 分流
 *
 * 关键设计意图：
 * - OutputTag 必须声明为静态常量（确保序列化/反序列化后 id 一致，否则 ClassCastException）
 * - 侧输出流与主流完全独立：各自 keyBy、各自窗口、各自 sink
 * - 相比 filter 的本质优势：被"过滤"掉的数据仍在 Flink 管控范围内，可单独 sink/告警/写死信队列
 * - 生产环境常见用法：主流程走清洗后的干净数据 → 下游聚合/入仓；侧输出走脏数据 → Kafka 死信 topic 供数据治理团队溯源
 */
public class SideOutputDiversionJob {

    // OutputTag 必须为静态常量，否则序列化时匿名内部类 id 不一致
    private static final OutputTag<String> DIRTY_TAG =
            new OutputTag<String>("dirty-data") {};

    private static final OutputTag<String> LATENCY_TAG =
            new OutputTag<String>("late-data") {};

    public static void main(String[] args) throws Exception {
        StreamExecutionEnvironment env = StreamExecutionEnvironment.getExecutionEnvironment();
        env.enableCheckpointing(5000);

        DataStream<String> raw = env.socketTextStream("localhost", 9999);

        SingleOutputStreamOperator<String> main = raw
                .process(new ProcessFunction<String, String>() {
                    @Override
                    public void processElement(String value, Context ctx, Collector<String> out) {
                        try {
                            if (value == null || value.isEmpty()) {
                                // 空消息 → 侧输出（脏数据）
                                ctx.output(DIRTY_TAG, "EMPTY|" + System.currentTimeMillis());
                                return;
                            }
                            // 正常数据走主流
                            out.collect(value.toUpperCase());
                        } catch (Exception e) {
                            // 解析异常 → 侧输出
                            ctx.output(DIRTY_TAG, "PARSE_ERR|" + value);
                        }
                    }
                });

        // 侧输出流 — 独立处理链路
        DataStream<String> dirties = main.getSideOutput(DIRTY_TAG);
        dirties.addSink(new AlertSink());           // 脏数据写 Kafka 死信 topic / 告警

        main.addSink(new NormalSink());             // 主流正常输出

        env.execute("side-output-diversion");
    }

    // ---- 示意 Sink ----
    static class AlertSink implements org.apache.flink.streaming.api.functions.sink.SinkFunction<String> {
        @Override
        public void invoke(String value, Context context) {
            System.err.println("[ALERT] dirty: " + value);
        }
    }

    static class NormalSink implements org.apache.flink.streaming.api.functions.sink.SinkFunction<String> {
        @Override
        public void invoke(String value, Context context) {
            System.out.println("[MAIN] " + value);
        }
    }
}
