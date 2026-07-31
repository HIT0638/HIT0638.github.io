import org.apache.flink.api.common.state.*;
import org.apache.flink.api.common.typeinfo.Types;
import org.apache.flink.configuration.Configuration;
import org.apache.flink.streaming.api.datastream.AsyncDataStream;
import org.apache.flink.streaming.api.datastream.DataStream;
import org.apache.flink.streaming.api.environment.StreamExecutionEnvironment;
import org.apache.flink.streaming.api.functions.KeyedProcessFunction;
import org.apache.flink.streaming.api.functions.async.ResultFuture;
import org.apache.flink.streaming.api.functions.async.RichAsyncFunction;
import org.apache.flink.util.Collector;

import java.util.Collections;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.TimeUnit;

/**
 * 模板 Job：KeyedState 去重 + Async I/O 维表关联
 * 对应 Day3（状态/TTL）+ Day5（去重/Async I/O）
 */
public class StatefulDedupJob {

    public static void main(String[] args) throws Exception {
        StreamExecutionEnvironment env = StreamExecutionEnvironment.getExecutionEnvironment();
        env.enableCheckpointing(5000);

        DataStream<Order> orders = env.fromElements(/* 示意 Source */)
                .keyBy(Order::getUserId);

        // ① 状态去重：按业务主键去重 + TTL
        DataStream<Order> deduped = orders
                .keyBy(Order::getUserId)
                .process(new DedupProcess());

        // ② 维表关联：Async I/O 异步查维度（带本地缓存）
        DataStream<Enriched> enriched = AsyncDataStream.unorderedWait(
                deduped,
                new DimJoinFunction(),
                5, TimeUnit.SECONDS, 100);

        enriched.print();
        env.execute("stateful-dedup");
    }

    /** 按业务主键去重的 KeyedProcessFunction */
    public static class DedupProcess extends KeyedProcessFunction<String, Order, Order> {
        private transient MapState<String, Boolean> seen;   // bizKey -> 已见

        @Override
        public void open(Configuration params) {
            StateTtlConfig ttl = StateTtlConfig.newBuilder(org.apache.flink.api.common.time.Time.hours(24))
                    .setUpdateType(StateTtlConfig.UpdateType.OnCreateAndWrite)
                    .setStateVisibility(StateTtlConfig.StateVisibility.NeverReturnExpired)
                    .build();
            MapStateDescriptor<String, Boolean> d =
                    new MapStateDescriptor<>("seen", Types.STRING, Types.BOOLEAN);
            d.enableTimeToLive(ttl);
            seen = getRuntimeContext().getMapState(d);
        }

        @Override
        public void processElement(Order o, Context ctx, Collector<Order> out) throws Exception {
            String bizKey = o.getBizKey();
            if (seen.contains(bizKey)) return;     // 已见过，丢弃
            seen.put(bizKey, true);
            out.collect(o);
        }
    }

    /** 维表异步关联（示意：用 CompletableFuture 模拟外部查询） */
    public static class DimJoinFunction extends RichAsyncFunction<Order, Enriched> {
        @Override
        public void asyncInvoke(Order o, ResultFuture<Enriched> resultFuture) {
            CompletableFuture.supplyAsync(() -> queryDim(o.getDimKey()))   // 真实用 Redis/HBase 异步客户端
                    .thenAccept(dim -> resultFuture.complete(Collections.singletonList(new Enriched(o, dim))));
        }
        private String queryDim(String key) { return "dim-" + key; }      // TODO: 真实查询
    }

    // ---- 示意 POJO ----
    public static class Order {
        public String getUserId() { return "u1"; }
        public String getBizKey() { return "b1"; }
        public String getDimKey() { return "d1"; }
    }
    public static class Enriched { public Enriched(Order o, String dim) {} }
}
