# Flink 八股 · 数据开发岗面试课

> 内部主线：**概念 → 机制 → 代码 → 项目绑定 → 自测**。
> A 类基础，B 类补齐追问，C/D 类做基础防守。

## 专题地图

| 课 | 主题 | 覆盖原题 | 核心产出 |
|---|---|---|---|
| [L1](L01-position-arch-api.md) | 定位 / 架构 / API | 1,3,29,55,68,2,4,9,12,65 | Flink 基础认知与作业执行链路 |
| [L2](L02-time-watermark-window.md) | 时间语义 / Watermark / 窗口 | 7,22,8,27,53,69,6,15,44,52 | 事件时间+Watermark+窗口 串讲稿 |
| [L3](L03-state-backend.md) | 状态管理 / StateBackend | 5,10,32,57,26,33,34 | 为什么实时计算离不开 State |
| [L4](L04-checkpoint-exactlyonce.md) | Checkpoint / Exactly-once | 11,20,25,51,56,60,16,48,58 | Flink 容错与 Exactly-once |
| [L5](L05-kafka-join-sideoutput.md) | Kafka / Join / 去重 / SideOutput / AsyncIO | 28,39,43,49,18,21,35 | Kafka→Flink→维表/指标 链路模板 |
| [L6](L06-tuning-streambatch.md) | 调优 / 反压 / 流批一体 | 23,42,66,14,17,59,13,19,30,47 | 调优高频追问清单 + 流批一体口径 |
| [L7](L07-project-recap.md) | 项目串讲 / 基础防守 | 73,31,36,37,38,40,41,45,54,61 | 我的项目怎么答 Flink 八股 |

## 优先级速记
- **A 类（深背，能讲成故事线）**：定位、架构、State、窗口、Watermark、Checkpoint、Exactly-once、反压、Join、去重、TTL、并行度。
- **B 类（补齐常见追问）**：DataSet 差异、算子、SideOutput、Broadcast、AsyncIO、Kafka 消费、KeyBy、GlobalWindow。
- **C 类（1~3 句防守）**：Operator Chain、监控、调度、序列化、增量 Checkpoint、动态分区。
- **D 类（暂缓）**：Changelog、迭代、自定义 StateBackend、非对称 Join、全局窗口聚合、深层调优。

## 推荐源
- Apache Flink 官方文档（概念/运维/Connector）：<https://nightlies.apache.org/flink/flink-docs-stable/>
- Flink 中文社区 / 官网博客。
- 书：《Flink 基础教程》《Stream Processing with Apache Flink》。
