export type Module = {
  code: string;
  title: string;
  detail: string;
  path: string;
};

export type Collection = {
  code: string;
  slug: string;
  title: string;
  subtitle: string;
  summary: string;
  stats: string[];
  supportPages: Module[];
  modules: Module[];
  references: Module[];
};

export const collections: Collection[] = [
  {
    code: "01",
    slug: "flink-interview",
    title: "Flink 面试课",
    subtitle: "数据开发岗 / 实时计算",
    summary: "把 74 道 Flink 面试题压缩成 7 个有主线的学习模块。",
    stats: ["7 modules", "74 questions", "reference + code"],
    supportPages: [
      { code: "DOC", title: "任务书 MISSION", detail: "为什么做这门课", path: "MISSION.md" },
      { code: "DOC", title: "我的笔记 NOTES", detail: "学习偏好与备忘", path: "NOTES.md" },
    ],
    modules: [
      { code: "L01", title: "定位 / 架构 / DataStream API", detail: "作业执行链路与基础认知", path: "L01-position-arch-api.md" },
      { code: "L02", title: "时间语义 / Watermark / 窗口", detail: "事件时间、乱序与窗口", path: "L02-time-watermark-window.md" },
      { code: "L03", title: "状态管理 / StateBackend", detail: "为什么实时计算离不开 State", path: "L03-state-backend.md" },
      { code: "L04", title: "Checkpoint / Exactly-once", detail: "容错与一致性语义", path: "L04-checkpoint-exactlyonce.md" },
      { code: "L05", title: "Kafka / Join / 去重 / SideOutput", detail: "实时链路里的常见组合", path: "L05-kafka-join-sideoutput.md" },
      { code: "L06", title: "性能调优 / 反压 / 流批一体", detail: "调优与流批一体口径", path: "L06-tuning-streambatch.md" },
      { code: "L07", title: "项目串讲 / 基础防守", detail: "把知识绑定到项目表达", path: "L07-project-recap.md" },
    ],
    references: [
      { code: "R01", title: "核心概念口诀", detail: "定位、架构、状态与容错", path: "reference/cheatsheet-core.md" },
      { code: "R02", title: "窗口与时间", detail: "Watermark、窗口与迟到", path: "reference/cheatsheet-window-time.md" },
      { code: "R03", title: "调优与反压", detail: "并行度、倾斜与监控", path: "reference/cheatsheet-tuning.md" },
    ],
  },
  {
    code: "02",
    slug: "dw-interview",
    title: "数据仓库面试课",
    subtitle: "数据开发岗 / 数仓与治理",
    summary: "覆盖 51 道高频数仓题，从定位、建模到实时数仓收尾。",
    stats: ["7 modules", "51 questions", "project linked"],
    supportPages: [],
    modules: [
      { code: "L01", title: "数仓定位与架构", detail: "分层、链路与系统边界", path: "L01-position-architecture.md" },
      { code: "L02", title: "建模基础 / ODS / DWD", detail: "从原始数据到明细层", path: "L02-ods-dwd-layer.md" },
      { code: "L03", title: "缓慢变化维度 / DWS / ADS", detail: "维度、汇总与应用层", path: "L03-dws-ads-mart.md" },
      { code: "L04", title: "建模进阶", detail: "模型选择与场景判断", path: "L04-modeling.md" },
      { code: "L05", title: "ETL / ELT 与离线链路", detail: "离线任务的组织方式", path: "L05-etl-elt-pipeline.md" },
      { code: "L06", title: "查询性能与分层优化", detail: "性能治理的常见抓手", path: "L06-performance-governance.md" },
      { code: "L07", title: "实时数仓与治理收尾", detail: "把离线和实时连起来", path: "L07-realtime-lakehouse.md" },
    ],
    references: [],
  },
];

export function getCollection(slug: string) {
  return collections.find((collection) => collection.slug === slug);
}
