# 速查卡 · 核心概念口诀

## 定位
- Flink = 流优先、真流（非微批）、原生事件时间、状态一等公民、精确一次。
- vs Spark Streaming：真流 vs 微批；毫秒 vs 秒；事件时间原生 vs 后期补；状态强 vs 弱。

## 架构
- JobManager（控制面）：Dispatcher 收作业、JobMaster 调度 Job、ResourceManager 管 Slot。
- TaskManager（执行面）：跑算子，含若干 Slot。
- Slot：隔离内存不隔离 CPU；Slot Sharing 让一条链共享 Slot。
- 链路：Client→JobGraph→JM→申请 Slot→部署 Task→算子链执行→TM 间 shuffle。

## 状态
- KeyedState（绑 key，主流）vs OperatorState（绑算子实例，记 offset）。
- 类型：ValueState / ListState / MapState / Reducing/AggregatingState。
- Backend：HashMap（堆，快但小）vs RocksDB（磁盘，大状态、增量 checkpoint）。
- TTL：去重集合/维表缓存控生命周期，`OnCreateAndWrite` + `NeverReturnExpired`。

## Checkpoint / 容错
- 机制：Barrier 注入 → 对齐（等所有输入 Barrier）→ 快照状态 → 持久化 → 全确认完成。
- 恢复：从最近 Checkpoint 恢复状态 + Source 位点，重放不重复。
- Checkpoint（自动/故障恢复）vs Savepoint（手动/运维升级迁移）。
- 增量 Checkpoint：仅 RocksDB，只传变化 SST。

## Exactly-once 三件套
1. Barrier + 状态快照（恢复一致）
2. Sink 两阶段提交：pre-commit → Checkpoint 完成→commit
3. Source 可重放（Kafka offset）

## 一句串讲
定位→架构→API→时间/窗口→状态→容错→集成→调优。
