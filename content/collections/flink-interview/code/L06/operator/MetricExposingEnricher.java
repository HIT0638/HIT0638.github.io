package code.day06.operator;

import code.day06.model.OrderEvent;
import org.apache.flink.api.common.functions.RichMapFunction;
import org.apache.flink.configuration.Configuration;
import org.apache.flink.dropwizard.metrics.DropwizardMeterWrapper;
import org.apache.flink.metrics.Counter;
import org.apache.flink.metrics.Histogram;
import org.apache.flink.metrics.Meter;

/**
 * 自定义 Metrics 暴露 — 生产级监控不可只靠 Flink 内置指标。
 *
 * <h3>暴露哪些自定义指标</h3>
 * <ul>
 *   <li>{@code numOrders.total} — Counter：总订单量</li>
 *   <li>{@code numOrders.invalid} — Counter：无效订单量</li>
 *   <li>{@code amount.perSecond} — Meter：每秒金额吞吐（Dropwizard 集成）</li>
 *   <li>{@code latencyMs} — Histogram（或用 Meter）：端到端延迟分布</li>
 * </ul>
 *
 * <p>这些指标通过 Flink Metrics Reporter（如 PrometheusReporter）暴露给
 * Prometheus + Grafana，在监控大盘上可视化。</p>
 *
 * <p>使用方法：</p>
 * <pre>{@code
 *   source.map(new MetricExposingEnricher()).name("metric-enricher")
 * }</pre>
 *
 * @see <a href="https://nightlies.apache.org/flink/flink-docs-stable/docs/ops/metrics/">Flink Metrics 官方文档</a>
 */
public class MetricExposingEnricher extends RichMapFunction<OrderEvent, OrderEvent> {

    private static final long serialVersionUID = 1L;

    // ---------- Flink Metrics ----------
    private transient Counter totalCounter;
    private transient Counter invalidCounter;
    private transient Meter amountPerSecond;    // via Dropwizard
    private transient Histogram latencyHist;    // Flink 原生不支持 Histogram，用 Dropwizard

    @Override
    public void open(Configuration parameters) throws Exception {
        // ---- Counter：累加值 ----
        totalCounter = getRuntimeContext()
                .getMetricGroup()
                .addGroup("orders")
                .counter("total");

        invalidCounter = getRuntimeContext()
                .getMetricGroup()
                .addGroup("orders")
                .counter("invalid");

        // ---- Meter：速率（事件/秒），需要 Dropwizard 集成 ----
        amountPerSecond = getRuntimeContext()
                .getMetricGroup()
                .addGroup("orders")
                .meter("amountPerSecond",
                        new DropwizardMeterWrapper(new com.codahale.metrics.Meter()));

        // ---- Histogram：延迟分布 ----
        // Flink 1.17+ 原生不支持 Histogram，用 Dropwizard 桥接
        com.codahale.metrics.Histogram dropwizardHist = new com.codahale.metrics.Histogram(
                new com.codahale.metrics.ExponentiallyDecayingReservoir());
        latencyHist = getRuntimeContext()
                .getMetricGroup()
                .addGroup("orders")
                .histogram("latencyMs",
                        new DropwizardHistogramWrapper(dropwizardHist));
    }

    @Override
    public OrderEvent map(OrderEvent event) throws Exception {
        totalCounter.inc();

        // 业务校验：标记无效数据
        if (event.amount <= 0 || event.userId == null) {
            invalidCounter.inc();
            return event;   // 或不输出，走 SideOutput
        }

        // 记录金额吞吐速率（Meter 自动计算 1min/5min/15min 均值）
        amountPerSecond.markEvent((long) event.amount);

        // 记录处理延迟（从 eventTime 到当前系统时间）
        long latency = System.currentTimeMillis() - event.eventTime;
        latencyHist.update(latency);

        return event;
    }

    // ========== Dropwizard Histogram Wrapper（Flink 桥接） ==========

    /**
     * 将 Dropwizard Histogram 暴露为 Flink Histogram。
     * Flink Metrics Reporter 会自动发现并上报。
     */
    static class DropwizardHistogramWrapper implements org.apache.flink.metrics.Histogram {
        private final com.codahale.metrics.Histogram histogram;

        DropwizardHistogramWrapper(com.codahale.metrics.Histogram histogram) {
            this.histogram = histogram;
        }

        @Override
        public void update(long value) {
            histogram.update(value);
        }

        @Override
        public long getCount() {
            return histogram.getCount();
        }

        // 注意：Flink Histogram 接口的方法，需要向高级 Prometheus reporter 暴露统计量
        // 实际生产用 Flink 1.17+ 推荐直接接入 OpenTelemetry
    }
}
