package code.day06.model;

import java.io.Serializable;
import java.util.Objects;

/**
 * 订单事件 — 生产级 POJO，针对 Flink 序列化深度优化。
 *
 * <h3>Flink 序列化优化要点</h3>
 * <ul>
 *   <li>字段全部 public：Flink PojoTypeInfo 通过反射访问字段，public 比 getter/setter 少一次反射调用。</li>
 *   <li>无参构造器：必备，反序列化时 Flink 需要先构造空对象再填充字段。</li>
 *   <li>避免包装类型嵌套：基本类型字段用 long/int 而非 Long/Integer，减少装箱和 null 判断开销。</li>
 *   <li>{@code equals/hashCode/toString}：调试和去重的刚需。</li>
 * </ul>
 *
 * <p>这是一个<strong>扁平 POJO</strong>——所有字段都是 Flink 原生类型（String/long/double），
 * 确保走 PojoTypeInfo 通道而非 Kryo fallback。Kryo fallback 比 PojoTypeInfo 慢 3-10x。</p>
 *
 * <p>用法：下游算子直接用 {@code event.orderId} 而非 {@code event.getOrderId()}，避免一次方法调用。</p>
 *
 * @see <a href="https://nightlies.apache.org/flink/flink-docs-stable/docs/dev/datastream/fault-tolerance/serialization/types_serialization/">Flink 类型与序列化</a>
 */
public class OrderEvent implements Serializable {

    private static final long serialVersionUID = 1L;

    // ---------- 业务字段 ----------
    /** 订单 ID（业务主键，用于去重） */
    public String orderId;
    /** 用户 ID（keyBy 维度） */
    public String userId;
    /** 商品 ID */
    public String productId;
    /** 订单金额（聚合指标） */
    public double amount;
    /** 事件时间戳（毫秒，Watermark 提取字段） */
    public long eventTime;
    /** 事件类型：CREATE / PAY / CANCEL */
    public String eventType;

    // ---------- 构造器 ----------

    /** 无参构造：Flink 反序列化必备 */
    public OrderEvent() {
    }

    public OrderEvent(String orderId, String userId, String productId,
                      double amount, long eventTime, String eventType) {
        this.orderId = orderId;
        this.userId = userId;
        this.productId = productId;
        this.amount = amount;
        this.eventTime = eventTime;
        this.eventType = eventType;
    }

    // ---------- equals / hashCode（按业务主键 orderId） ----------

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof OrderEvent)) return false;
        OrderEvent that = (OrderEvent) o;
        return Objects.equals(orderId, that.orderId);
    }

    @Override
    public int hashCode() {
        return Objects.hash(orderId);
    }

    @Override
    public String toString() {
        return "OrderEvent{orderId='" + orderId + "', userId='" + userId
                + "', productId='" + productId + "', amount=" + amount
                + ", eventTime=" + eventTime + ", eventType='" + eventType + "'}";
    }
}
