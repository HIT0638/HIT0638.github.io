package code.day06.model;

import java.io.Serializable;

/**
 * 聚合结果 — 两阶段倾斜打散后的最终指标。
 *
 * <p>和 {@link OrderEvent} 一样是扁平 POJO，走 PojoTypeInfo 快速通道。</p>
 */
public class AggregatedMetric implements Serializable {

    private static final long serialVersionUID = 1L;

    /** 聚合维度：userId */
    public String userId;
    /** 订单金额总和 */
    public double totalAmount;
    /** 订单笔数 */
    public long orderCount;
    /** 窗口起始时间（毫秒） */
    public long windowStart;
    /** 窗口结束时间（毫秒） */
    public long windowEnd;

    public AggregatedMetric() {
    }

    public AggregatedMetric(String userId, double totalAmount, long orderCount,
                            long windowStart, long windowEnd) {
        this.userId = userId;
        this.totalAmount = totalAmount;
        this.orderCount = orderCount;
        this.windowStart = windowStart;
        this.windowEnd = windowEnd;
    }

    @Override
    public String toString() {
        return "AggregatedMetric{userId='" + userId
                + "', totalAmount=" + totalAmount
                + ", orderCount=" + orderCount
                + ", window=[" + windowStart + ", " + windowEnd + ")}";
    }
}
