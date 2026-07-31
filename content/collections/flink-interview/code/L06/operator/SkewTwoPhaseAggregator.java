package code.day06.operator;

import code.day06.model.AggregatedMetric;
import code.day06.model.OrderEvent;
import org.apache.flink.api.common.state.ValueState;
import org.apache.flink.api.common.state.ValueStateDescriptor;
import org.apache.flink.api.common.typeinfo.Types;
import org.apache.flink.configuration.Configuration;
import org.apache.flink.streaming.api.functions.KeyedProcessFunction;
import org.apache.flink.util.Collector;
import org.apache.flink.util.OutputTag;


/**
 * 两阶段倾斜打散聚合 — 解决热点 key 导致的数据倾斜。
 *
 * <h3>问题场景</h3>
 * <pre>
 *   大促期间，热门商品对应 userId 的订单量是普通用户的 100-1000 倍。
 *   普通的 keyBy(userId) → window.aggregate 会让该 subTask 成为瓶颈，
 *   引发反压，拖慢整个作业。
 * </pre>
 *
 * <h3>两阶段解法</h3>
 * <ol>
 *   <li><b>Phase 1 — 加盐打散</b>：给 userId 加随机前缀 "userId#0" ~ "userId#N-1"，
 *       分散到 N 个 subTask 做窗口局部预聚合。
 *   </li>
 *   <li><b>Phase 2 — 去盐聚合</b>：去掉随机前缀，按原始 userId 做窗口全局最终聚合。
 *   </li>
 * </ol>
 *
 * <p>这个类就是 Phase 2 的 KeyedProcessFunction，负责去盐后的全局窗口聚合。</p>
 *
 * <p>TTL 设置 2 倍窗口长度，在窗口销毁后自然清理状态。</p>
 */
public class SkewTwoPhaseAggregator
        extends KeyedProcessFunction<String, OrderEvent, AggregatedMetric> {

    private static final long serialVersionUID = 1L;

    /** 迟到数据侧输出标签 */
    public static final OutputTag<OrderEvent> LATE_DATA_TAG =
            new OutputTag<OrderEvent>("late-data") {};

    // ---------- 配置 ----------
    private final long windowSizeMs;    // 窗口大小（毫秒）
    private final long allowedLatenessMs; // 允许迟到（毫秒）

    // ---------- 状态 ----------
    private transient ValueState<Double> amountAcc;    // 金额累加器
    private transient ValueState<Long> countAcc;       // 计数累加器

    public SkewTwoPhaseAggregator(long windowSizeMs, long allowedLatenessMs) {
        this.windowSizeMs = windowSizeMs;
        this.allowedLatenessMs = allowedLatenessMs;
    }

    @Override
    public void open(Configuration parameters) throws Exception {
        // 金额累加器：ValueState<Double>
        ValueStateDescriptor<Double> amountDesc =
                new ValueStateDescriptor<>("phase2-amount", Types.DOUBLE);
        amountAcc = getRuntimeContext().getState(amountDesc);

        // 计数累加器：ValueState<Long>
        ValueStateDescriptor<Long> countDesc =
                new ValueStateDescriptor<>("phase2-count", Types.LONG);
        countAcc = getRuntimeContext().getState(countDesc);
    }

    @Override
    public void processElement(OrderEvent event, Context ctx,
                               Collector<AggregatedMetric> out) throws Exception {

        // 计算数据所属窗口的结束时间（向下取整到窗口边界）
        long windowEnd = ((event.eventTime / windowSizeMs) + 1) * windowSizeMs;
        long windowStart = windowEnd - windowSizeMs;
        long currentWatermark = ctx.timerService().currentWatermark();

        // ---------- 迟到判断 ----------
        if (currentWatermark > windowEnd + allowedLatenessMs) {
            // 超过 allowedLateness，路由到侧输出
            ctx.output(LATE_DATA_TAG, event);
            return;
        }

        // ---------- 增量聚合 ----------
        // 选择增量而非全量缓存：每个 key+窗口 只存两个数字，
        // 而不存所有 event 列表，内存开销 O(1) vs O(N)

        Double currentAmount = amountAcc.value();
        Long currentCount = countAcc.value();

        double newAmount = (currentAmount == null ? 0.0 : currentAmount) + event.amount;
        long newCount = (currentCount == null ? 0L : currentCount) + 1;

        amountAcc.update(newAmount);
        countAcc.update(newCount);

        // 注册窗口触发 timer（watermark ≥ windowEnd 时触发）
        ctx.timerService().registerEventTimeTimer(windowEnd);
    }

    @Override
    public void onTimer(long timestamp, OnTimerContext ctx,
                        Collector<AggregatedMetric> out) throws Exception {

        // watermark 到达窗口结束时间 → 输出最终结果
        Double amount = amountAcc.value();
        Long count = countAcc.value();

        if (amount != null && count != null) {
            out.collect(new AggregatedMetric(
                    ctx.getCurrentKey(),    // 原始 userId
                    amount,
                    count,
                    timestamp - windowSizeMs,
                    timestamp
            ));
        }

        // 清理窗口状态（在 allowedLateness 之后才真正清理）
        if (timestamp + allowedLatenessMs <= ctx.timerService().currentWatermark()) {
            amountAcc.clear();
            countAcc.clear();
        }
    }
}
