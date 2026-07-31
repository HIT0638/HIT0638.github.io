# L06/ · 性能调优 / 反压 / 流批一体 — 配套代码

对应文档：`docs/L06-tuning-streambatch.md`

## 架构

```
L06/
  model/
    OrderEvent.java            # 订单事件 POJO（Flink 序列化优化示例）
    AggregatedMetric.java      # 聚合结果 POJO
  operator/
    SkewTwoPhaseAggregator.java    # 两阶段倾斜打散 Phase 2 处理器
    ChainControlPipeline.java      # Operator Chain 控制示例
    MetricExposingEnricher.java    # 自定义 Dropwizard Metrics 暴露
  job/
    SkewTwoPhaseAggregationJob.java   # 完整倾斜打散两阶段聚合 Job
    BatchUnifiedOrderCountJob.java    # 流批统一 Job
```

## 每个文件覆盖的面试点

| 文件 | Day6 对应章节 | 面试点 |
|------|-------------|--------|
| `OrderEvent.java` | §5 序列化优化 | PojoTypeInfo vs Kryo、public 字段 vs getter、扁平 POJO 避免 Kryo fallback |
| `AggregatedMetric.java` | §3 数据倾斜 | 聚合结果类型设计 |
| `SkewTwoPhaseAggregator.java` | §3 数据倾斜 | Phase 2 去盐全局聚合、Timer 控制窗口触发、SideOutput 迟到数据、增量聚合 vs 全量缓存 |
| `ChainControlPipeline.java` | §4 Operator Chain | disableChaining/startNewChain/slotSharingGroup 三种拆链方式、拆链代价 |
| `MetricExposingEnricher.java` | §7 监控工具 | Counter/Meter/Histogram、Dropwizard 桥接、Prometheus Reporter |
| `SkewTwoPhaseAggregationJob.java` | §1-4 全套 | 完整 Pipeline：并行度→Watermark→Chain 控制→Phase1 加盐→Phase2 去盐→Sink、模拟热点数据 |
| `BatchUnifiedOrderCountJob.java` | §6 流批一体 | STREAMING vs BATCH 模式、runtime-mode 切换、有界流自动走批执行、Blocking vs Pipelined shuffle |

## 怎么读（推荐顺序）

1. **先读 model/**：理解数据结构，注意 `OrderEvent` 为什么这样设计（public 字段、无参构造、扁平类型）→ 对应 §5 序列化优化。
2. **读 `SkewTwoPhaseAggregationJob.java`**：直接看 `main()` 方法，顺 Pipeline 理解全流程 → 对应 §1-4。
3. **补充 `SkewTwoPhaseAggregator.java`**：深入 Phase 2 的状态管理和 Timer 机制 → 对应 §3。
4. **读 `ChainControlPipeline.java`**：三种拆链方式的具体区别 → 对应 §4。
5. **读 `BatchUnifiedOrderCountJob.java`**：理解 batch 模式的 switch 语句和运行时差异 → 对应 §6。
6. **读 `MetricExposingEnricher.java`**：自定义指标怎么暴露给 Prometheus → 对应 §7。

## 依赖

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
<dependency>
    <groupId>org.apache.flink</groupId>
    <artifactId>flink-connector-datagen</artifactId>
    <version>1.17.2</version>
</dependency>
<!-- Metrics 桥接 -->
<dependency>
    <groupId>org.apache.flink</groupId>
    <artifactId>flink-metrics-dropwizard</artifactId>
    <version>1.17.2</version>
</dependency>
<dependency>
    <groupId>io.dropwizard.metrics</groupId>
    <artifactId>metrics-core</artifactId>
    <version>4.2.19</version>
</dependency>
<!-- 生产 Kafka -->
<dependency>
    <groupId>org.apache.flink</groupId>
    <artifactId>flink-connector-kafka</artifactId>
    <version>1.17.2</version>
</dependency>
```

## 运行

```bash
# 流模式（默认）
flink run -c code.L06.job.SkewTwoPhaseAggregationJob target/flink-code.jar

# 批模式（流批统一作业）
flink run -Dexecution.runtime-mode=BATCH \
    -c code.L06.job.BatchUnifiedOrderCountJob target/flink-code.jar

# 自动模式（Flink 自行判断）
flink run -Dexecution.runtime-mode=AUTOMATIC \
    -c code.L06.job.BatchUnifiedOrderCountJob target/flink-code.jar
```
