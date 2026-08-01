---
title: 理解 Parquet 的设计
date: 2026-07-28
summary: 从数据访问目标出发，理解 Parquet 为什么采用列式布局、层级化元数据、嵌套编码与跨引擎设计，并把它放回 Spark、Hive 和 Iceberg 的读取链路。
draft: true
---

# 理解 Parquet 的设计

---

## 🎯 Parquet 想解决的问题

如果只把 Parquet 理解成“按列存储”，很容易把它看成一种文件排列方式。

但 Parquet 真正关心的，是如何让分析型读取少碰一些无关的数据，同时保留足够的压缩、并行和跨引擎能力。

Parquet 官方的动机包含几个方向：提供高效的列式表示，支持复杂嵌套结构，为不同列选择合适的编码与压缩方式，并让不同的数据处理框架都能够使用这套存储基础设施。[^1]

因此，Parquet 的设计问题可以先被概括成一句话：

> **查询只需要少量列、少量行时，如何让 reader 尽量少读、少解压、少解码？**

这也是理解后面所有结构的入口。Footer、Row Group、Column Chunk、Page、Dictionary 和 Level 并不是互不相关的术语，它们共同组成了一条逐级缩小读取范围的路径。

## 🔍 一次查询如何逐层收缩

Parquet 是文件格式，不负责管理一张表的全部文件，也不负责生成完整的查询计划。

以常见的 Spark 加上 Hive 或 Iceberg 的数据链路为例，查询会先在表和文件层面缩小范围，再进入 Parquet 文件内部。

```mermaid
flowchart LR
    accTitle: Parquet scan layers
    accDescr: The diagram shows a query narrowing its read scope from table-level file pruning to Parquet metadata, column chunks, pages, and finally a decoded batch.

    query["查询：选择列与过滤条件"] --> table_pruning["表层：分区与文件裁剪"]
    table_pruning --> footer_lookup["文件层：读取 Footer"]
    footer_lookup --> row_group_filter["Row Group：过滤行组"]
    row_group_filter --> column_projection["Column Chunk：选择列"]
    column_projection --> page_decode["Page：解压与解码"]
    page_decode --> vector_batch["引擎：批量返回"]
```

这个过程有一个容易被忽略的特点：Parquet 并不是从“某个值的地址”开始工作，而是从较大的边界开始，逐层排除不需要读取的部分。

上层表格式负责判断哪些文件可能相关，Parquet 负责判断文件内部哪些行组、列块和页面值得读取，计算引擎再负责把这些数据解码成批量结果。

## 🧱 文件结构背后的职责分工

Parquet 的基本层次可以写成：

```text
File
└── Row Group
    └── Column Chunk
        └── Page
```

本文使用 `Column Chunk` 或“列块”，因为它表示的是某个 Row Group 中某一列的数据块，而不是一个独立的列族模型。[^2]

| 层次           | 它保存或划分什么                | 它主要服务什么            |
| ------------ | ----------------------- | ------------------ |
| Footer       | 文件级 Schema、行组、列块位置和统计信息 | 让 reader 先找到目标数据   |
| Row Group    | 一批逻辑上的行                 | 划分扫描、并行和粗粒度过滤边界    |
| Column Chunk | 一个行组中的一列                | 列裁剪、连续 I/O、按列编码和压缩 |
| Page         | 列块内部的编码与压缩单元            | 控制解码粒度和细粒度读取       |

Parquet 官方将 Row Group 描述为数据的水平逻辑分区，将 Column Chunk 描述为某个行组中特定列的连续数据，并将 Page 视为编码和压缩意义上的基本单元。[^2]

### Footer：文件尾部的目录

Footer 放在文件尾部，不只是因为“元数据最后写比较方便”。而是数据写完后，writer 才能知道每个 Column Chunk 的位置、大小和统计信息。

把 Footer 放在最后，可以支持单遍写入。reader 则可以先读取文件尾部的元数据，再定位感兴趣的列块。[^3]

所以 Footer 更像一个文件级目录，而不是数据本身。它回答的是：

- 文件有哪些字段；
- 有哪些 Row Group；
- 目标列的 Column Chunk 从哪里开始；
- 这些块的大致范围和统计信息是什么。

### Row Group：给扫描划边界

Row Group 是一批逻辑上的行。它让多个列仍然共享同一段行范围，reader 才能在读取若干列之后，把它们重新对齐成记录。

从工程角度看，Row Group 还是一个重要的扫描和并行边界。

行组太大，连续 I/O 和压缩通常更有利，但跳过无关数据和任务切分会变粗；行组太小，过滤和并行更灵活，却会增加元数据、调度和读取开销。[^4]

因此，Row Group 不是一个只为“快速定位某个值”服务的索引。它更像是文件作者在写入时选择的扫描粒度：既要让一批数据足够大，又不能大到失去跳过和并行的意义。

### Column Chunk：让列裁剪真正发生

Column Chunk 是一个 Row Group 中某一列的全部 Page。它在文件中保持连续，这使 reader 可以只读取查询需要的列，并尽量以连续方式完成 I/O。[^2]

这也是列式存储和分析型查询之间最直接的连接。假设一张宽表有很多列，而查询只需要其中三列，那么 reader 不必为了重建一行而读取所有列的原始字节。

Column Chunk 还是编码、压缩和统计信息的重要作用域。不同列的数据分布不同，数值列、低基数字符串列和高基数字符串列并不一定适合相同的表示方式。

### Page：控制解码的细粒度

Page 位于 Column Chunk 内部。它把一列的数据进一步切成多个编码和压缩单元，使 reader 不必一次把整个列块解码到内存中。

Page 越小，细粒度读取的机会越多，但 Page Header 和解析次数也会增加；Page 越大，顺序读取的开销可能更低，却会让选择性读取的粒度变粗。

Parquet 的配置文档也特别提醒，Page 是编码和压缩意义上的单元，不应简单等同于顺序扫描时的底层 I/O 单元。[^4]

## 💾 为什么存成列，却没有丢掉行

Parquet 的物理布局以列为中心，但数据的逻辑含义仍然是记录。一个查询最终通常需要得到多列组成的行，嵌套数据还需要恢复列表、结构体和可选字段之间的关系。

这解释了为什么 Parquet 不能只保存一串“同类型的列值”。它还需要记录值是否存在、嵌套层级如何变化，以及重复结构怎样组装回逻辑记录。

Definition Level 和 Repetition Level 就是在这个位置发挥作用：它们不是用来定位文件的索引，而是让列式物理表示能够保留嵌套数据的结构语义。

Parquet 的设计动机明确包含复杂嵌套数据，并采用 record shredding 和 assembly 思路处理这类数据。[^1]

这也是 Parquet 和简单的“把每一列单独写成文件”之间的差别。后者可以保存列值，却没有自然地解决多列对齐、null、列表和嵌套结构的恢复问题。

## 🧮 编码和元数据如何共同工作

编码、压缩和元数据解决的是不同问题：

| 机制 | 主要回答的问题 |
| --- | --- |
| Column Chunk offset | 目标列块从哪里开始 |
| Row Group statistics | 这一批数据可能匹配条件吗 |
| Page Index | 哪些页面可能匹配条件 |
| Dictionary | 重复值能否用较小的编号表示 |
| RLE / Bit-Packing | 编号、Level 或重复模式如何少占空间 |
| Compression codec | 编码后的字节如何进一步压缩 |

因此，Dictionary、RLE 和 Bit-Packing 首先是表示和压缩机制，不是值级索引。reader 通常先通过 Footer、统计信息或 Page Index 缩小范围，再进入目标 Page，解压并解码其中的数据流。

Parquet 的 Page Index 是可选的 Column Chunk 元数据。它可以根据页面的边界值帮助 reader 跳过不相关页面；但它并不等价于面向任意字段的通用二级索引。[^5]

这条边界很重要：Footer 可以帮助定位 Column Chunk，Page Index 可以帮助定位候选 Page，但进入 Page 后，reader 仍然需要按照该 Page 的编码规则恢复逻辑值。

## 🔗 放回数据开发技术栈

把 Parquet 单独看成一个文件，很容易忽略一次查询实际上跨越了多个层次。以 Spark 加上 Hive 或 Iceberg 的典型链路为例，可以这样分工：

| 层次 | 主要职责 | 典型动作 |
| --- | --- | --- |
| 表格式 | 管理表的文件集合和快照 | 分区裁剪、Manifest 过滤 |
| 查询引擎 | 生成读取计划并执行任务 | 过滤下推、列裁剪、向量化读取 |
| Parquet | 组织单个文件的物理数据 | Footer、行组、列块、Page、编码 |
| 存储系统 | 提供文件读写能力 | 顺序读取、范围读取、并行访问 |

Iceberg 的 Manifest 会保存数据文件的分区信息和列级统计，在扫描规划阶段先过滤无关的 Manifest 和数据文件。[^6] Spark 则提供 Parquet 的过滤下推和向量化读取配置。[^7]

所以，一次查询变快，通常不是 Parquet 单独完成的。

它更像是整个链路中的“文件内部组织者”：上层决定读哪些文件，Parquet 决定文件内部如何少读，执行引擎决定如何把读出的字节高效地变成批量数据。

写入时也一样。分区方式、文件大小、Row Group 大小、Page 大小、排序或聚簇方式，都会影响后续能否有效裁剪数据。

Parquet 提供了物理表达能力，但不会替数据开发者自动做出所有写入决策。

## ⚠️ 这些设计也带来边界

首先，Parquet 更适合大批量读取和分析型扫描。

它不是为频繁更新、事务型点查或为任意值建立二级索引而设计的。

这个判断是从它的列裁剪、批量解码和层级元数据设计推导出的工作负载结论，并不意味着 Parquet 不能被其他场景读取。

其次，“使用了 Parquet”不等于“查询一定很快”。如果文件过多且过小，表层规划和文件打开的开销会变大；如果数据分布没有形成可利用的范围，统计信息也很难跳过大量数据。

最后，Row Group、Page 和统计信息都不是越细越好。更细的边界带来更强的跳过能力，也会带来更多元数据和解析成本。

真正的设计目标不是让每一个值都能直接定位，而是让常见扫描在整体上少读、少传、少解码。

## 📋 最后留下几个判断

理解 Parquet 时，可以反复问下面几个问题：

1. 这项设计是在减少读取范围，还是在减少表示成本？
2. 它的作用域是文件、Row Group、Column Chunk 还是 Page？
3. 它由表格式、查询引擎、Parquet 还是存储系统负责？
4. 它改善了哪一种读取，又牺牲了什么？

如果想继续观察这些设计如何落到具体字节上，可以阅读[《从 Footer 到 RLE：Parquet 的物理表示与读取路径》](/articles/2026-07-28-parquet-physical-representation)。

前一篇回答“为什么这样组织”，后一篇继续回答“这些结构在文件里具体长什么样、reader 如何解码”。

## 🔗 参考资料

[^1]: Apache Parquet. “Motivation.” https://parquet.apache.org/docs/overview/motivation/

[^2]: Apache Parquet. “Concepts.” https://parquet.apache.org/docs/concepts/

[^3]: Apache Parquet. “File Format.” https://parquet.apache.org/docs/file-format/

[^4]: Apache Parquet. “Configurations.” https://parquet.apache.org/docs/file-format/configurations/

[^5]: Apache Parquet. “Page Index.” https://parquet.apache.org/docs/file-format/pageindex/

[^6]: Apache Iceberg. “Performance.” https://iceberg.apache.org/docs/latest/performance/

[^7]: Apache Spark. “Parquet Files.” https://spark.apache.org/docs/latest/sql-data-sources-parquet.html
