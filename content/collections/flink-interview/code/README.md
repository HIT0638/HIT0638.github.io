# code/ · Flink 面试课配套代码

每模块的生产级代码示例。按对应文档编号组织，文件名不叫 DayX。

## 目录结构

```
code/
  README.md                    # → 本文件
  L01/job/WordCountJob.java    # L01 定位/架构/API — 基础 DataStream 骨架
  L02/job/WatermarkWindowJob.java  # L02 时间/Watermark/窗口 — 乱序三层防线
  L03/operator/StatefulDedupAndAgg.java  # L03 状态管理 — MapState去重+ValueState累计+TTL
  L04/ (无专属代码)              # Checkpoint/Exactly-once — 文档内嵌内联代码
  L05/ (见顶层 KafkaWindowAggJob.java / StatefulDedupJob.java)
  L06/                         # 调优/反压/流批一体
    model/OrderEvent.java / AggregatedMetric.java
    operator/SkewTwoPhaseAggregator.java / ChainControlPipeline.java / MetricExposingEnricher.java
    job/SkewTwoPhaseAggregationJob.java / BatchUnifiedOrderCountJob.java
    README.md
  KafkaWindowAggJob.java       # L02/L05 模板 — Kafka→Watermark→窗口→Sink
  StatefulDedupJob.java        # L03/L05 模板 — MapState 去重 + Async I/O
```

## 依赖（Maven 片段）

```xml
<dependency>
  <groupId>org.apache.flink</groupId>
  <artifactId>flink-streaming-java</artifactId>
  <version>1.17.2</version>
</dependency>
<dependency>
  <groupId>org.apache.flink</groupId>
  <artifactId>flink-clients</artifactId>
  <version>1.17.2</version>
</dependency>
```

| 模块 | 对应文档 | 面试点 |
|------|---------|--------|
| `L01/job/WordCountJob.java` | L01 定位/架构/API | map/flatMap/filter/keyBy/sum, keyBy 触发 shuffle 断 Chain, `.returns()` 避 Kryo |
| `L02/job/WatermarkWindowJob.java` | L02 时间/Watermark/窗口 | boundedOutOfOrderness + withIdleness, allowedLateness+sideOutput 三层防线, 增量聚合 |
| `L03/operator/StatefulDedupAndAgg.java` | L03 状态管理/StateBackend | MapState O(1) 去重, ValueState 累计, State TTL(OnCreateAndWrite+NeverReturnExpired+cleanupFullSnapshot) |
| `L06/` | L06 调优/流批一体 | 两阶段聚合治倾斜, disableChaining/startNewChain 拆链, BATCH/STREAMING 切换, 自定义 Metrics |
