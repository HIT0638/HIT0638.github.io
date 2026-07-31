# 速查卡 · 窗口与时间

## 三种时间语义
- Event Time：事件发生时间（自带）— 实时指标默认选它。
- Processing Time：被处理时机器时钟 — 超低时延、不关心发生时刻。
- Ingestion Time：进入 Flink 时间 — 折中。

## Watermark
- 进度标记：`watermark = maxEventTime − 乱序容忍`。
- 作用：驱动事件时间窗口触发/关闭。
- 策略：单调 `forMonotonousTimestamps`；有界乱序 `forBoundedOutOfOrderness`。
- 空闲分区：`withIdleness` 防拖全局。

## 窗口类型
- 滚动 Tumbling：固定、不重叠（每 5 分钟）。
- 滑动 Sliding：固定、可重叠（size=10m, slide=5m，一条数据进多窗）。
- 会话 Session：按活跃间隔 gap 切分。
- 全局 GlobalWindow：无边界，须自定义 Trigger，少用。

## 触发与迟到
- 事件时间窗口：watermark ≥ 窗口 end 触发。
- allowedLateness：触发后保留，迟到数据更新结果（多次触发）。
- SideOutput：超 lateness 的严重迟到进侧输出分支。

## 聚合函数
- sum/min/max：最简单。
- Reduce/Aggregate：增量聚合，状态轻。
- ProcessWindowFunction：拿 window/上下文，状态重。
- 组合：`AggregateFunction + ProcessWindowFunction`（预聚合 + 补上下文）。

## keyed vs non-keyed
- keyBy 后开窗：每 key 每窗一份状态（主流）。
- windowAll：全流单窗口，易单点瓶颈。
