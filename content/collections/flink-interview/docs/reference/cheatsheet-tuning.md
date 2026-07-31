# 速查卡 · 调优与反压

## 并行度
- p = 算子并行子任务数；吞吐 ≈ 单并发 × p（资源够时）。
- 消费并行度建议 = Kafka 分区数。
- p 不能超过可用 slot 总数；不是越大越好。

## 反压
- 定义：下游慢于上游，缓冲堆积，反压信号沿网络反向回传使上游降速。
- 定位：Web UI Backpressure 页 + Metrics（in/outPoolUsage、吞吐断崖、checkpoint 变慢）。
- 治理：提瓶颈并行度 → 治数据倾斜 → 调网络缓冲 → 拆链 → 异步化外部访问 → 减状态/序列化。

## 数据倾斜
- keyBy 加随机前缀两阶段聚合（局部→去前缀全局）。
- source 预聚合；rebalance/rescale 重分区打散；热点走 SideOutput 隔离。

## Operator Chain
- 相邻无 shuffle、并行度一致、可链的算子链成 Task 同线程执行，省开销。
- 拆链 disableChaining：瓶颈算子单独并行/隔离/定位。

## 序列化
- 用 POJO/Avro/元组，避免 Kryo 回退；注册类型；对象复用减 GC。

## 流批一体
- DataStream 一套代码跑有界/无界。StreamGraph→JobGraph 流批共享。
- 项目：实时 Kafka 无界 + 离线 Iceberg 有界补数，同一套逻辑。

## 监控三件套
- Web UI（作业图/反压/checkpoint）、Metrics（Prometheus+Grafana）、日志。
