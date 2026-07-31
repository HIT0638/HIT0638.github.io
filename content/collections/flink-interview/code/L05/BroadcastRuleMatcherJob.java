import org.apache.flink.api.common.state.BroadcastState;
import org.apache.flink.api.common.state.MapStateDescriptor;
import org.apache.flink.api.common.state.ReadOnlyBroadcastState;
import org.apache.flink.api.common.typeinfo.Types;
import org.apache.flink.streaming.api.datastream.BroadcastStream;
import org.apache.flink.streaming.api.datastream.DataStream;
import org.apache.flink.streaming.api.environment.StreamExecutionEnvironment;
import org.apache.flink.streaming.api.functions.co.BroadcastProcessFunction;
import org.apache.flink.util.Collector;

/**
 * Broadcast State 规则广播模板：规则流广播到所有算子实例，事实流到来时查本地广播状态。
 * 覆盖：L05 Broadcast State
 *
 * 关键设计意图：
 * - 规则流必须低吞吐（配置变更 / 风控黑名单 / 白名单更新），不适合广播高吞吐数据流
 * - 每个算子实例维护自己的 BroadcastState 副本 → 查规则零网络开销，延迟 O(1)
 * - BroadcastState 是非 Keyed State（对所有 key 可见），这正是它的核心价值
 * - MapStateDescriptor 在 connect() 和 getBroadcastState() 两端必须用同一个实例（引用相等比较）
 * - 规则更新通过 processBroadcastElement 写入 → 所有并行实例秒级生效（无需重启）
 */
public class BroadcastRuleMatcherJob {

    // 广播状态描述符 — connect() 和 process 内部必须用同一个实例
    private static final MapStateDescriptor<String, String> RULE_DESC =
            new MapStateDescriptor<>("rules", Types.STRING, Types.STRING);

    public static void main(String[] args) throws Exception {
        StreamExecutionEnvironment env = StreamExecutionEnvironment.getExecutionEnvironment();
        env.enableCheckpointing(5000);

        // 事实流：交易流水，高吞吐
        DataStream<String> facts = env.socketTextStream("localhost", 9991);

        // 规则流：风控规则变更（黑名单用户、限额阈值等），低吞吐，每分钟几条
        DataStream<String> rules = env.socketTextStream("localhost", 9992);

        // 规则流广播 — 每个算子实例都会收到全部规则
        BroadcastStream<String> broadcastRules = rules.broadcast(RULE_DESC);

        // 事实流 connect 广播流 — 双输入算子
        facts.keyBy(f -> f.split(",")[0])              // 按用户 ID keyBy
                .connect(broadcastRules)
                .process(new BroadcastProcessFunction<String, String, String>() {

                    @Override
                    public void processElement(String fact, ReadOnlyContext ctx, Collector<String> out)
                            throws Exception {
                        // 读本地广播状态 — 零网络开销
                        ReadOnlyBroadcastState<String, String> ruleState =
                                ctx.getBroadcastState(RULE_DESC);
                        String blacklist = ruleState.get("blacklist");
                        String txLimit = ruleState.get("tx_limit");

                        String[] parts = fact.split(",");
                        String userId = parts[0];
                        double amount = Double.parseDouble(parts[1]);

                        // 黑名单检查：名单包含该用户 → 直接拦截
                        if (blacklist != null && blacklist.contains(userId)) {
                            out.collect("BLOCKED|user=" + userId);
                            return;
                        }
                        // 限额检查：交易金额超阈值 → 标记
                        if (txLimit != null && amount > Double.parseDouble(txLimit)) {
                            out.collect("OVER_LIMIT|user=" + userId + "|amount=" + amount);
                            return;
                        }
                        out.collect("PASS|" + fact);
                    }

                    @Override
                    public void processBroadcastElement(String rule, Context ctx,
                                                        Collector<String> out) throws Exception {
                        // 规则更新写入 BroadcastState → 所有算子实例秒级生效
                        BroadcastState<String, String> state = ctx.getBroadcastState(RULE_DESC);
                        String[] kv = rule.split("=");
                        state.put(kv[0], kv[1]);                // 格式：key=value
                    }
                })
                .addSink(new PrintSink<>());

        env.execute("broadcast-rule-matcher");
    }

    static class PrintSink<T> implements org.apache.flink.streaming.api.functions.sink.SinkFunction<T> {
        @Override
        public void invoke(T value, Context context) {
            System.out.println(value);
        }
    }
}
