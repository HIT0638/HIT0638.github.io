package code.day06.operator;

import code.day06.model.OrderEvent;

/**
 * Operator Chain 控制 — 演示何时、如何主动控制算子链。
 *
 * <h3>Flink 默认行为</h3>
 * 相邻算子满足以下条件时自动链成一个 Task：
 * <ol>
 *   <li>数据分发策略是 FORWARD（无 shuffle）</li>
 *   <li>并行度相同</li>
 *   <li>在同一 SlotSharingGroup</li>
 *   <li>下游只有一个上游输入</li>
 * </ol>
 *
 * <h3>拆链的三种方式</h3>
 * <table>
 *   <tr><th>方式</th><th>效果</th><th>场景</th></tr>
 *   <tr><td>{@code .disableChaining()}</td><td>该算子前后都断链</td><td>瓶颈算子需独立资源</td></tr>
 *   <tr><td>{@code .startNewChain()}</td><td>和上游断链，开启新链</td><td>从该算子起用新线程</td></tr>
 *   <tr><td>{@code .slotSharingGroup("heavy")}</td><td>换共享组 = 间接断链</td><td>资源隔离（重/轻量算子分家）</td></tr>
 * </table>
 *
 * <h3>拆链代价</h3>
 * 每多一个 Task = 多一次序列化/反序列化 + 多一次网络传输（如果在不同 Slot）。
 * 只在必要时拆，不要无脑全拆。
 *
 * @see org.apache.flink.streaming.api.datastream.SingleOutputStreamOperator#disableChaining()
 * @see org.apache.flink.streaming.api.datastream.SingleOutputStreamOperator#startNewChain()
 * @see <a href="https://nightlies.apache.org/flink/flink-docs-stable/docs/dev/datastream/operators/overview/#task-chaining-and-resource-groups">Flink 官方文档 - Task Chaining</a>
 */
public final class ChainControlPipeline {

    private ChainControlPipeline() {
        // 工具类，不实例化
    }

    /**
     * 典型场景：ETL 管道中，解析算子 CPU 密集但 map 算子轻量。
     * 拆链后两者在不同 Task 中运行，互不阻塞。
     *
     * <pre>{@code
     *   source
     *     .map(ParseOrder::parse)      // CPU 密集
     *       .name("parse")
     *       .disableChaining()         // ← 前后断链，独占线程
     *     .filter(e -> e.amount > 0)   // 轻量
     *     .map(e -> {
     *         e.amount = e.amount * 1.1;  // 轻量计算
     *         return e;
     *     })
     * }</pre>
     */
    public static OrderEvent heavyParse(OrderEvent raw) {
        // 模拟：复杂 JSON 解析、字段校验、类型转换
        // 在实际项目中这里可能有 100+ 行解析逻辑
        if (raw.orderId == null || raw.userId == null) {
            throw new IllegalArgumentException("orderId or userId is null");
        }
        return raw;
    }

    /**
     * 轻量算子：和上游断链后用 startNewChain 开启新链。
     * 后续的 filter/map 仍可以链在一起。
     *
     * <pre>{@code
     *   source
     *     .map(ChainControlPipeline::heavyParse).disableChaining()
     *     .filter(ChainControlPipeline::isValidEvent)
     *       .startNewChain()          // ← 从这开始新链
     *     .map(ChainControlPipeline::enrichEvent)
     *     .addSink(...)
     * }</pre>
     */
    public static boolean isValidEvent(OrderEvent event) {
        return event.amount > 0
                && event.eventTime > 0
                && event.userId != null
                && !event.userId.isBlank();
    }

    /**
     * 轻量字段增强：可以链在其他轻量算子后面。
     */
    public static OrderEvent enrichEvent(OrderEvent event) {
        // 例如：补齐默认值、统一单位
        if (event.eventType == null) {
            event.eventType = "UNKNOWN";
        }
        return event;
    }
}
