package code.L03.operator;

import org.apache.flink.api.common.state.*;
import org.apache.flink.api.common.time.Time;
import org.apache.flink.api.common.typeinfo.Types;
import org.apache.flink.configuration.Configuration;
import org.apache.flink.streaming.api.functions.KeyedProcessFunction;
import org.apache.flink.util.Collector;

/**
 * State 去重 + TTL 演示 — 覆盖 L03 核心知识点。
 *
 * <h3>面试点</h3>
 * <ul>
 *   <li>MapState 去重：{@code contains()} O(1) vs ListState.contains() O(N)</li>
 *   <li>ValueState 累计：当前累计值 + 新值</li>
 *   <li>State TTL：只去重最近 24 小时，过期自动清理</li>
 *   <li>TTL 配置：OnCreateAndWrite（创建和写入时刷新）、NeverReturnExpired（不返回过期值）</li>
 * </ul>
 *
 * <p>使用方式：</p>
 * <pre>{@code
 *   stream.keyBy(OrderEvent::getUserId)
 *         .process(new StatefulDedupAndAgg())
 * }</pre>
 */
public class StatefulDedupAndAgg extends KeyedProcessFunction<String, OrderEvent, OrderEvent> {

    private static final long serialVersionUID = 1L;

    // ---------- State ----------
    private transient MapState<String, Boolean> seenOrders;  // 去重：orderId → 已见
    private transient ValueState<Double> totalAmount;         // 累计金额

    @Override
    public void open(Configuration parameters) throws Exception {

        // ---- 1. 去重 MapState + TTL ----
        StateTtlConfig ttl = StateTtlConfig
                .newBuilder(Time.hours(24))
                .setUpdateType(StateTtlConfig.UpdateType.OnCreateAndWrite)
                .setStateVisibility(StateTtlConfig.StateVisibility.NeverReturnExpired)
                .cleanupFullSnapshot()                         // Checkpoint 时清理
                .build();

        MapStateDescriptor<String, Boolean> seenDesc =
                new MapStateDescriptor<>("seen-orders", Types.STRING, Types.BOOLEAN);
        seenDesc.enableTimeToLive(ttl);
        seenOrders = getRuntimeContext().getMapState(seenDesc);

        // ---- 2. 累计 ValueState ----
        ValueStateDescriptor<Double> amountDesc =
                new ValueStateDescriptor<>("total-amount", Types.DOUBLE);
        totalAmount = getRuntimeContext().getState(amountDesc);
    }

    @Override
    public void processElement(OrderEvent order, Context ctx,
                               Collector<OrderEvent> out) throws Exception {

        // ---- 去重：已见过的订单直接丢弃 ----
        if (seenOrders.contains(order.orderId)) {
            return;   // 重复数据，跳过
        }
        seenOrders.put(order.orderId, true);

        // ---- 累计：更新 GMV ----
        Double current = totalAmount.value();
        double newTotal = (current == null ? 0.0 : current) + order.amount;
        totalAmount.update(newTotal);

        // 附加累计值到订单（示意，实际用独立输出）
        order.amount = newTotal;
        out.collect(order);
    }

    // ========== 数据模型 ==========

    /** 扁平 POJO — 走 PojoTypeInfo 快通道，避免 Kryo fallback */
    public static class OrderEvent {
        public String orderId;
        public String userId;
        public double amount;
        public long eventTime;

        public OrderEvent() {}
    }
}
