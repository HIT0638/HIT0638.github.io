# Pairtree 组会汇报 Slide Spec

> 状态：v0.1，待审阅  
> 用途：作为后续逐页制作幻灯片、绘制图示和准备讲稿的唯一内容基准。  
> 当前阶段：只准备内容规格，不创建幻灯片、不生成图片。

## 0. 汇报定位

### 0.1 默认场景

- **汇报对象**：熟悉测序数据和肿瘤亚克隆概念，但不一定熟悉 Pairtree 细节的组会听众。
- **预计时长**：25–30 分钟。
- **主线问题**：bulk 测序中，如何利用突变频率及突变之间的关系，恢复亚克隆结构？
- **与个人研究的连接**：三代数据可以直接观察部分 somatic mutation 的共现关系，因此重点关注 Pairtree 的 pairwise evidence、Pairs Tensor 和 TreeMCMC 架构，而不是逐行复述所有实现细节。
- **汇报目标**：让听众理解 Pairtree 的推断逻辑、关键假设、适用边界，以及它对三代数据亚克隆重建的启发。

### 0.2 一句话主旨

> Pairtree 将 bulk 测序中的亚克隆树重建拆成“突变聚类 → 两两关系证据 → 全局树搜索”三个层次；它的主要价值是推断架构，但结果依赖外部提供的 copy-number/purity 校正和相应的模型假设。

### 0.3 不在主讲部分展开的内容

- 不逐项推导所有 Beta-Binomial 积分。
- 不展示完整代码或伪代码实现。
- 不把 ω 当作 Pairtree 内部联合估计的变量。
- 不把三代数据直接套用 Pairtree 的二代 observation model；三代数据部分作为“架构迁移和待解决问题”讨论。

## 1. 全局视觉规范

### 1.1 页面和版式

- **比例**：16:9。
- **背景**：暖白或极浅灰，保持论文汇报的干净感。
- **主色**：深海军蓝，用于标题、主流程和树结构。
- **辅助色**：青绿色用于 φ/细胞比例，橙色用于 η/clone frequency，紫色用于 ω/CNA correction。
- **关系色**：祖先关系用蓝色，反向祖先关系用橙色，branching 用绿色；颜色必须同时配合箭头、线型或文字，避免只靠颜色区分。
- **强调色**：仅用于每页一个关键结论或警示框，不使用大面积高饱和背景。

### 1.2 文字和公式

- 每页只保留一个核心结论，正文通常不超过 3–4 个短句或要点。
- 标题建议 28–34 pt；正文建议 20–24 pt；图注和引用不低于 12–14 pt。
- 公式使用可编辑文本或矢量公式，避免低分辨率截图。
- 变量统一使用：\(V\) 为 variant reads，\(T\) 为 total reads，\(\omega\) 为 mutation multiplicity/copy-number correction，\(\phi\) 为 sample-level cellular prevalence，\(\eta\) 为 clone frequency。
- 第一次出现英文术语时给出中文解释，之后可使用英文简称。

### 1.3 讲稿规范

- 展示页只放听众需要看到的内容，推导和补充解释放入讲稿。
- 每页讲稿包含：开场句、解释重点、与前后页的连接、可能被问到的限定条件。
- 每页完成后先由用户审阅；未确认前不进入下一页。

## 2. 主线结构概览

| 页 | 标题 | 这一页要表达什么 | 类型 |
|---:|---|---|---|
| 1 | Pairtree：从突变关系到亚克隆树 | Pairtree 的核心是把局部突变关系转化为全局亚克隆树 | 开场 |
| 2 | 研究背景与问题 | bulk 频率模式本身不足以唯一确定亚克隆结构 | 问题 |
| 3 | Pairtree 的核心贡献 | Pairtree 用分层推断架构降低全局树重建的难度 | 贡献 |
| 4 | Pairtree 总体流程 | 输入 reads 和外部 ω，依次经过聚类、压缩、关系推断和树搜索 | 总览 |
| 5 | 观测模型 | ω 将细胞携带比例映射到测序层面的 variant fraction | 模型 |
| 6 | ω 的来源与局限 | Pairtree 把关键的 copy-number correction 作为外部输入 | 假设 |
| 7 | φ、η 与亚克隆频率 | φ 是突变携带率，η 是单个 clone 频率，两者不能混用 | 概念 |
| 8 | linfreq：先把突变聚成 cluster | 具有相似跨样本 prevalence 的突变被视为同一 cluster | 方法 |
| 9 | linfreq：用边际似然评价聚类 | 聚类通过 Beta 先验和 Beta-Binomial 边际似然完成，而非直接固定 φ | 方法 |
| 10 | Supervariant：压缩 cluster | 将 cluster 压缩成 supervariant，降低后续 pairwise 和 tree search 的规模 | 方法 |
| 11 | Pairs Tensor：三种两两关系 | 两个 supervariant 主要被判断为 A→B、B→A 或 branching | 方法 |
| 12 | Pairs Tensor：从 reads 到关系后验 | 在不同频率约束区域内积分 read likelihood，得到关系后验 | 方法 |
| 13 | Pairs Tensor 在算法中的位置 | tensor 指导树搜索，但不直接等于最终树评分或最终树 | 方法 |
| 14 | TreeMCMC：提出新的树结构 | MCMC 一次移动一个节点或分支，并用 tensor 引导候选位置 | 方法 |
| 15 | TreeMCMC：拟合频率并接受或拒绝 | 每个候选树都要重新拟合 η/φ 并计算全局 read likelihood | 方法 |
| 16 | 模拟数据评测 | Pairtree 在中等亚克隆数量下恢复能力较强，但规模增大后性能下降 | 评测 |
| 17 | 真实数据与方法边界 | 真实 B-ALL 数据支持其实用性，但结果依赖输入和 ISA 等假设 | 评测 |
| 18 | 对三代数据亚克隆重建的启发 | 三代数据最值得迁移的是关系推断架构，而不是原始 VAF observation layer | 讨论 |
| 19 | 总结与讨论 | Pairtree 提供了可迁移的推断框架，同时暴露了 ω 和 bulk 混合带来的瓶颈 | 收束 |

## 3. 逐页规格

### 第 1 页｜Pairtree：从突变关系到亚克隆树

- **主题**：Pairtree 的核心不是单独拟合某个 mutation 的频率，而是利用 mutation pairs 的关系约束恢复 clone tree。
- **展示内容**：
  - 主标题：`Pairtree：从突变关系到亚克隆树`
  - 副标题：`A Bayesian approach to inferring tumor phylogenies from bulk sequencing`
  - 右下角：论文信息、汇报人和日期。
- **视觉**：自绘一个极简亚克隆树，树上的 mutation 节点之间有少量 pairwise relation 连线；不要在标题页放完整算法流程。
- **排版**：左侧标题和副标题，右侧大面积留给树结构；底部只放论文引用。
- **讲稿要点**：先告诉听众这篇论文试图解决的是“从混合测序信号恢复亚克隆结构”，后面会围绕“关系证据如何进入树搜索”展开。
- **预计时间**：1 分钟。
- **视觉资产**：`A01_title_tree.svg`，自绘，待制作。
- **状态**：待审阅。

### 第 2 页｜研究背景与问题

- **主题**：bulk 测序提供的是混合后的频率，单看 VAF/CCF 模式通常不能唯一确定亚克隆关系。
- **展示内容**：
  - 肿瘤样本包含多个亚克隆和正常细胞。
  - 同一个 bulk frequency pattern 可能对应不同的克隆树。
  - 关键问题：哪些 mutation 出现在同一批细胞中？哪些 mutation 具有祖先—后代关系？
- **视觉**：自绘三段式图：`混合细胞 → bulk reads → 多棵可能的树`。中间用同一组频率，右侧展示两种不同树结构。
- **排版**：左 35% 放细胞混合示意，中间 25% 放 reads/VAF，右 40% 放两棵候选树；中间用问号连接。
- **讲稿要点**：强调“频率相似”不等于“共存关系已知”；这正是 Pairtree 引入 pairwise evidence 的动机。
- **预计时间**：1.5 分钟。
- **视觉资产**：`A02_bulk_ambiguity.svg`，自绘，待制作。
- **状态**：待审阅。

### 第 3 页｜Pairtree 的核心贡献

- **主题**：Pairtree 把难以直接求解的全局树问题拆成 mutation clustering、pairwise inference 和 tree search 三个层次。
- **展示内容**：
  1. `linfreq`：把共享 prevalence 的 mutations 聚成 clusters。
  2. `Supervariant`：把 cluster 压缩成后续分析的节点。
  3. `Pairs Tensor + TreeMCMC`：先获得局部关系证据，再搜索全局树。
  - 旁注：\(\omega\) 由外部提供，Pairtree 条件于该输入。
- **视觉**：三段式横向流程图，每个模块下方只放一个动词：`cluster → compress → infer/search`。
- **排版**：上方一句 takeaway，下方占 65% 页面宽度的流程图；右下角放“外部 ω”警示标签。
- **讲稿要点**：这页只讲架构，不进入公式；告诉听众后面每一页分别拆解一个模块。
- **预计时间**：1.5 分钟。
- **视觉资产**：`A03_architecture_overview.svg`，自绘，待制作。
- **状态**：待审阅。

### 第 4 页｜Pairtree 总体流程

- **主题**：Pairtree 的完整数据流是从 reads 和外部 ω 出发，逐步生成 clusters、pairwise relations 和 candidate trees。
- **展示内容**：
  - 输入：\(V_{js}\)、\(T_{js}\)、\(\omega_{js}\)。
  - `linfreq`：mutation-level data → cluster partition。
  - `supervariant`：cluster-level data → compressed variant units。
  - `Pairs Tensor`：pairwise data → relation posterior。
  - `TreeMCMC`：relation posterior + read likelihood → posterior tree samples/consensus tree。
- **视觉**：一张从左到右的主流程图；用不同颜色区分 observation layer、local relation layer、global tree layer。
- **排版**：上方显示数据对象如何变化，下方显示每个阶段的目的；不要把所有公式塞进本页。
- **讲稿要点**：提醒听众：cluster 和 tensor 是中间层，最终输出是树的后验样本或共识表示。
- **预计时间**：1.5 分钟。
- **视觉资产**：`A04_full_dataflow.svg`，自绘，待制作。
- **状态**：待审阅。

### 第 5 页｜观测模型

- **主题**：ω 把样本中携带 mutation 的细胞比例 φ 映射为 reads 层面的 variant probability。
- **展示内容**：
  - 核心公式：

    $$V_{js} \sim \operatorname{Binomial}\left(T_{js},\omega_{js}\phi_{js}\right)$$

  - \(V\)：variant reads；\(T\)：total reads。
  - \(\phi\)：样本全部细胞中携带该 mutation 的细胞比例。
  - \(\omega\)：由 purity、CNA、LOH 和 mutant multiplicity 等因素决定的校正项。
  - 期望关系：\(E[V/T] \approx \omega\phi\)。
- **视觉**：从“携带 mutation 的细胞比例”到“有效 variant probability”再到“观测 reads”的三层示意；公式放在中央。
- **排版**：左侧变量解释，中央公式，右侧 observation pipeline。
- **讲稿要点**：明确区分 cellular prevalence 和 VAF；VAF 不是直接等于 φ，除非 ω 恰好适合该位点。
- **预计时间**：2 分钟。
- **视觉资产**：`A05_observation_model.svg`，自绘，待制作。
- **状态**：待审阅。

### 第 6 页｜ω 的来源与局限

- **主题**：Pairtree 的树推断条件于外部提供的 ω，因此 copy-number correction 是输入前提而不是 Pairtree 自己解决的问题。
- **展示内容**：
  - 概念定义：\(\omega=Q/W\)，表示突变 allele 在该位点总 allele 中的有效贡献。
  - ω 依赖：purity、total copy number、minor/major copy number、LOH、mutation multiplicity。
  - 关键限制：bulk 数据下这些量本身可能不确定，ω 也会随样本和位点变化。
  - 讲清楚：Pairtree 不是联合估计 ω 不确定性的模型。
- **视觉**：自绘一个正常/肿瘤细胞混合与不同 copy-number 状态的例子；右侧用警示框标出“external input”。
- **排版**：左侧一个具体 copy-number 小例子，右侧列出输入依赖和方法边界。
- **讲稿要点**：这是评价 Pairtree 时必须保留的限定条件；它也直接对应三代数据中的现实困难。
- **预计时间**：2 分钟。
- **视觉资产**：`A06_omega_copy_number.svg`，自绘，待制作。
- **状态**：待审阅。

### 第 7 页｜φ、η 与亚克隆频率

- **主题**：φ 是 mutation 的样本级携带率，η 是某个 clone 的自身频率，树结构把两者联系起来。
- **展示内容**：
  - \(\eta_{ks}\)：sample \(s\) 中 clone \(k\) 的 population frequency。
  - \(\phi_{js}\)：sample \(s\) 中携带 mutation/node \(j\) 的细胞比例。
  - 在 mutation 位于 node \(j\) 时：

    $$\phi_{js}=\sum_{k\in\operatorname{Desc}(j)}\eta_{ks}$$

  - φ 不是 VAF，也不是单个 clone 的 frequency；它通常包含该节点及其后代 clone。
- **视觉**：一棵 3–4 个节点的树，同时标注每个 clone 的 η 和每个 mutation/node 的 φ；用括号显示后代求和。
- **排版**：左侧树，右侧符号解释和一行公式；避免同时展示太多树。
- **讲稿要点**：这页是后面理解“频率约束”和 TreeMCMC 的基础，尤其要说明 φ 与 η 的层级关系。
- **预计时间**：2 分钟。
- **视觉资产**：`A07_phi_eta_tree.svg`，自绘，待制作。
- **状态**：待审阅。

### 第 8 页｜linfreq：先把突变聚成 cluster

- **主题**：linfreq 寻找跨样本 prevalence 模式相近的 mutations，并把它们分到共享 φ 的 cluster 中。
- **展示内容**：
  - 输入仍是 mutation-level 的 \(V_{js}\)、\(T_{js}\) 和 \(\omega_{js}\)。
  - cluster \(c\) 在样本 \(s\) 中共享一个潜在 prevalence \(\phi_{cs}\)。
  - 输出是 mutation partition，而不是已经确定的完整 clone tree。
  - 聚类的意义：减少后续需要比较的单位数，并把可能共同出现的 mutations 组织起来。
- **视觉**：mutation × sample 矩阵或点图；同一 cluster 的几行用同色包络，右侧显示 cluster-level profile。
- **排版**：左侧 mutation-level heatmap/dot plot，右侧 cluster profile；顶部一句“shared prevalence pattern”。
- **讲稿要点**：强调聚类是在 mutation 层面进行的；后续 supervariant 只是把这个 cluster 转为树搜索的基本单位。
- **预计时间**：1.5 分钟。
- **视觉资产**：`A08_linfreq_clustering.svg`，自绘，待制作。
- **状态**：待审阅。

### 第 9 页｜linfreq：用边际似然评价聚类

- **主题**：linfreq 对 cluster 的 φ 使用 Beta 先验，并将潜在 φ 积分掉得到 cluster 的边际证据。
- **展示内容**：
  - 工作假设：cluster 内 mutation 共享 \(\phi_{cs}\)。
  - 先验：\(\phi_{cs}\sim\operatorname{Beta}(1,1)\)（按论文实现说明）。
  - 对 φ 积分后得到 Beta-Binomial 风格的 cluster marginal likelihood。
  - 实现中使用 \(T'_{js}=\max(V_{js},\omega_{js}T_{js})\) 等有效深度近似；这不是把原始 observation model 原封不动地替换成新的生物学模型。
  - 通过 Gibbs/DPMM 风格更新比较 mutation assignment。
- **视觉**：三段式：`mutation data → shared φ + Beta prior → integrated cluster evidence`；右下角标注“output = partition”。
- **排版**：只展示一个简化积分公式，完整推导放入备份页。
- **讲稿要点**：回答“cluster 的 φ 是否由一次最大似然直接算出”：主流程更接近对潜在 φ 积分、比较 assignment 的边际证据，而不是输出一组最终固定 φ。
- **预计时间**：2 分钟。
- **视觉资产**：`A09_linfreq_marginal_likelihood.svg`，自绘，待制作。
- **状态**：待审阅。

### 第 10 页｜Supervariant：压缩 cluster

- **主题**：supervariant 将一个 mutation cluster 压缩为一个后续分析单位，核心约束是尽量保持 variant reads 的期望。
- **展示内容**：
  - 典型转换：

    $$N^*_{js}=2N_{js}\omega_{js},\qquad V^*_{js}=\min(V_{js},N^*_{js}),\qquad \omega^*=0.5$$

  - 在不触发 cap 时：

    $$E[V^*]=N^*\omega^*\phi=N\omega\phi=E[V]$$

  - 重要限定：保持的是期望 reads，不代表完整 likelihood、方差和误差结构严格等价。
- **视觉**：左侧多个 mutation cards，经过压缩变成一个 supervariant card；下方用一条等号链表示 expected reads preservation。
- **排版**：上半部分 before/after，下半部分公式和 caveat；不展示过多实现细节。
- **讲稿要点**：解释为什么要压缩，以及为什么不能把这个转换说成完整的概率模型等价变换。
- **预计时间**：1.5 分钟。
- **视觉资产**：`A10_supervariant_compression.svg`，自绘，待制作。
- **状态**：待审阅。

### 第 11 页｜Pairs Tensor：三种两两关系

- **主题**：对于两个 distinct supervariants，Pairtree 用三种关系表示它们在克隆树中的可能位置。
- **展示内容**：
  - \(A\to B\)：A 是 B 的祖先，\(\phi_A\ge\phi_B\)。
  - \(B\to A\)：B 是 A 的祖先，\(\phi_B\ge\phi_A\)。
  - branching：A 和 B 位于不同分支，\(\phi_A+\phi_B\le1\)。
  - 这些约束来自无回突变和无限位点式的树一致性假设。
- **视觉**：三栏关系卡片；中央可用二维 \((\phi_A,\phi_B)\) 三角区域图表示三种约束。
- **排版**：左侧三种关系，右侧频率空间几何图；关系颜色与全篇保持一致。
- **讲稿要点**：把“突变两两关系”从直觉图形转换成明确的频率不等式。
- **预计时间**：2 分钟。
- **视觉资产**：`A11_pairwise_relation_geometry.svg`，自绘，待制作。
- **状态**：待审阅。

### 第 12 页｜Pairs Tensor：从 reads 到关系后验

- **主题**：Pairs Tensor 在每种允许的频率区域内积分 read likelihood，再结合关系先验，得到关系后验。
- **展示内容**：
  - 对关系 \(r\) 的证据：

    $$P(D_{AB}\mid r)=\int_{\Omega_r}P(D_{AB}\mid\phi_A,\phi_B)\,d\phi_A\,d\phi_B$$

  - 关系后验：

    $$P(r\mid D_{AB})\propto P(D_{AB}\mid r)P(r)$$

  - tensor 的一个元素是三种关系的后验分布，而不是简单的 pairwise likelihood 或一条确定的边。
- **视觉**：用三个 \((\phi_A,\phi_B)\) 区域的颜色深浅表示 evidence；右侧转成一个三元素 posterior vector。
- **排版**：左侧几何积分，右侧 posterior vector；中间用箭头连接。
- **讲稿要点**：说明 pairs tensor 间接使用 mutation reads：reads 进入关系证据，但 tensor 本身存储的是关系后验。
- **预计时间**：2 分钟。
- **视觉资产**：`A12_pairs_tensor_posterior.svg`，自绘，待制作。
- **状态**：待审阅。

### 第 13 页｜Pairs Tensor 在算法中的位置

- **主题**：Pairs Tensor 提供局部关系证据和 proposal guidance，但最终树需要通过全局频率约束和 read likelihood 重新评价。
- **展示内容**：
  - tensor 不直接输出最终 clone tree。
  - tensor 用于影响 TreeMCMC 的节点移动和候选位置。
  - 候选树生成后，要重新求解树约束下的 \(\eta\) 和 \(\phi\)，再计算整棵树的 read likelihood。
  - 因此：`pairwise posterior ≠ final tree posterior`，但两者通过 proposal 和全局评价相连。
- **视觉**：局部 pairwise matrix/tensor → candidate tree → global likelihood；在 pairwise matrix 和 candidate tree 之间标注“guides proposal”。
- **排版**：横向三阶段流程，突出中间的“指导”而非“决定”。
- **讲稿要点**：这页专门澄清常见误解：tensor 不是把每条 pairwise edge 的分数简单相加后直接选树。
- **预计时间**：1.5 分钟。
- **视觉资产**：`A13_tensor_to_tree_role.svg`，自绘，待制作。
- **状态**：待审阅。

### 第 14 页｜TreeMCMC：提出新的树结构

- **主题**：TreeMCMC 通过局部树操作探索候选拓扑，并使用 Pairs Tensor 让 proposal 更倾向于符合已观察关系的移动。
- **展示内容**：
  - 当前树：parent/child 结构和节点频率。
  - 一次 proposal：移动一个节点、改变 parent 或调整局部拓扑。
  - tensor 提供局部关系倾向，但候选位置还必须满足树的可行性。
- **视觉**：`current tree → local move → proposed tree` 三棵小树；移动节点用高亮显示。
- **排版**：三栏操作示意，底部一行说明 proposal 和 scoring 的区别。
- **讲稿要点**：让听众先理解“树结构如何被探索”，暂时不讲频率优化和 MH 公式。
- **预计时间**：1.5 分钟。
- **视觉资产**：`A14_treemcmc_proposal.svg`，自绘，待制作。
- **状态**：待审阅。

### 第 15 页｜TreeMCMC：拟合频率并接受或拒绝

- **主题**：每个候选树都要在结构约束下拟合 clone frequencies，并用全局 read likelihood 做 Metropolis-Hastings 判断。
- **展示内容**：
  - 树结构确定后，clone frequency 为 \(\eta\)。
  - 由树的祖先—后代关系得到 mutation prevalence：

    $$\boldsymbol{\phi}=Z\boldsymbol{\eta}$$

  - 在候选树上重新计算 read likelihood。
  - 根据 posterior ratio 接受新树或保留旧树；经过多次迭代得到树后验样本和共识表示。
- **视觉**：上下两层：上层是 topology move，下层是 `fit η/φ → score → accept/reject`；用一个 MH decision node 收束。
- **排版**：左侧结构层，右侧频率/likelihood 层；不要在主页面展示完整接受率公式。
- **讲稿要点**：强调 tensor 的作用是引导搜索，最终是否保留候选树仍由全局模型评价。
- **预计时间**：2.5 分钟。
- **视觉资产**：`A15_treemcmc_scoring.svg`，自绘，待制作。
- **状态**：待审阅。

### 第 16 页｜模拟数据评测

- **主题**：模拟评测显示 Pairtree 在中等亚克隆数量下恢复能力较强，但随着树规模增加，推断难度明显上升。
- **展示内容**：
  - 数据规模：576 个 simulated datasets。
  - 主要趋势：在约 30 个 subclones 以内表现较强；到 100 个 subclones 时性能下降。
  - 评测重点：树结构恢复、关系一致性、不同样本数/测序深度/亚克隆规模下的鲁棒性。
  - 只保留论文中可以直接支持的指标和比较，不在本页自行推断新的性能结论。
- **视觉**：优先复用论文模拟结果图；在图上添加一条简短 takeaway 标注，突出“规模增加带来性能下降”。
- **排版**：左侧大图，右侧三条结果解读；图号、方法名和指标定义必须在最终版核对。
- **讲稿要点**：解释这不是“所有规模都同样可靠”；方法的实际边界与 subclone 数量和输入质量相关。
- **预计时间**：2 分钟。
- **视觉资产**：`P16_simulation_result`，优先复用论文原图，图号待核对；必要时重绘简化版。
- **状态**：待审阅。

### 第 17 页｜真实数据与方法边界

- **主题**：真实 B-ALL 数据支持 Pairtree 的实用性，但不能脱离 ω、ISA 和输入质量来解读树结果。
- **展示内容**：
  - 真实数据：14 个 B-ALL cases，样本数最多约 90，亚克隆数最多约 26。
  - 结果概括：Pairtree 在多数案例中与专家基于 VAF 的拟合相当或更好；最终数字和图号以论文原文核对为准。
  - 边界：ω 依赖外部估计；ISA violation、混合比例和 CNA/LOH 错误都会影响树。
  - 评测能说明“在给定输入和假设下有效”，不能说明真实树一定被唯一识别。
- **视觉**：优先复用论文真实数据图；右侧放一个“能说明什么 / 不能说明什么”的双栏边界框。
- **排版**：左 60% 结果图，右 40% 解释和限制；限制部分使用低饱和警示色。
- **讲稿要点**：把方法性能和生物学真值区分开；真实数据 benchmark 并不等于完全验证了真实 clone tree。
- **预计时间**：2 分钟。
- **视觉资产**：`P17_real_data_result`，优先复用论文原图，图号待核对；`A17_limitations.svg`，自绘，待制作。
- **状态**：待审阅。

### 第 18 页｜对三代数据亚克隆重建的启发

- **主题**：三代数据最值得借鉴的是“局部关系证据 → 全局树搜索”的架构，而不是直接照搬 VAF observation model。
- **展示内容**：
  - 三代数据优势：长 reads 可以直接观察多个 somatic mutations 的共现/相位关系。
  - 可迁移部分：pairwise evidence、关系后验、全局树约束和后验搜索。
  - 需要替换或扩展的部分：observation layer、长读长错误模型、覆盖度差异、allele-specific CN 和 ω 不确定性。
  - 进一步问题：是否还需要 supervariant？关系状态是否需要增加“同一 haplotype/同一 molecule”等状态？
- **视觉**：左右对比：short-read bulk 的 `V/T + ω` 关系证据 vs long-read 的 `molecule-level co-occurrence` 关系证据；下方连接到共同的 tree inference layer。
- **排版**：上半部分数据层对比，下半部分展示可复用的推断层；明确标注“架构迁移，不是直接套用”。
- **讲稿要点**：把 Pairtree 作为设计参考，而不是说它已经解决了三代数据亚克隆重建。
- **预计时间**：2.5 分钟。
- **视觉资产**：`A18_short_long_read_transfer.svg`，自绘，待制作。
- **状态**：待审阅。

### 第 19 页｜总结与讨论

- **主题**：Pairtree 的主要启发是分层推断架构；它的主要瓶颈是 bulk 混合下 ω/φ 的不确定性和模型假设。
- **展示内容**：
  1. `linfreq` 把 mutation-level signal 组织成 clusters。
  2. `Pairs Tensor` 把局部 read evidence 转化为 pairwise relation posterior。
  3. `TreeMCMC` 在全局树约束下搜索并评价候选结构。
  4. 对三代数据：应优先替换 observation layer，并利用 molecule-level mutation relations。
  - 讨论问题：
    - 长 reads 的直接共现信息能否替代或补充 VAF-based tensor？
    - 如何把 ω 的不确定性纳入联合推断？
    - 什么时候 mutation cluster/supervariant 仍然是必要的？
- **视觉**：三个核心模块 + 一个 long-read extension 的四块总结图；右下角放两个讨论问题。
- **排版**：上方三步总结，下方“对三代数据的下一步”横条；避免重复第 4 页的完整流程图。
- **讲稿要点**：最后不要再讲新方法，只回收“关系证据如何进入树推断”这条主线。
- **预计时间**：1.5 分钟。
- **视觉资产**：`A19_take_home.svg`，自绘，待制作。
- **状态**：待审阅。

## 4. 备份页建议

这些内容不放入主线，但可以在问答时使用：

### B1｜φ、η、CCF 和 VAF 的关系

- 用一个三 clone 数值例子展示 φ 是后代频率之和、VAF 还要经过 ω 映射。
- 回答“50% 细胞携带 mutation 是否等于 50% VAF”等常见问题。

### B2｜copy-number 例子与 ω

- 展示 mutation-bearing cells 和 non-mutant cells 在位点 copy number 不同的情况。
- 说明为什么不能简单使用 `0.5 × 0 + 0.5 × 1/2`，而应按细胞群体和 allele copy 数计算。

### B3｜linfreq 的 Beta-Binomial 积分

- 展示 cluster-level marginal likelihood 的完整积分形式。
- 单独解释 \(T'=\max(V,\omega T)\) 是计算近似，不要让主线被公式打断。

### B4｜Pairs Tensor 三角区域

- 画出 \((\phi_A,\phi_B)\) 单纯形和三种关系的可行区域。
- 标出测序证据如何在区域内积累。

### B5｜TreeMCMC 简化伪代码

```text
initialize tree
repeat:
    propose a local tree move using pairwise evidence
    fit eta under the proposed tree
    derive phi from tree structure
    compute global read likelihood
    accept or reject with Metropolis-Hastings rule
return posterior tree samples / consensus tree
```

### B6｜三代数据的最小迁移模型

- 把 read-level observation 替换成 molecule/haplotype-level likelihood。
- 保留 pairwise relation posterior 和 global tree search。
- 标出需要重新设计的 error model、CNA/LOH correction 和 relation states。

## 5. 视觉资产清单

### 5.1 建议自行绘制

| 资产 ID | 用于页码 | 内容 | 形式 | 状态 |
|---|---:|---|---|---|
| A01 | 1 | 极简亚克隆树和 mutation relations | SVG/矢量 | 待制作 |
| A02 | 2 | bulk 混合导致的多树歧义 | SVG/矢量 | 待制作 |
| A03 | 3 | 三层算法架构 | SVG/矢量 | 待制作 |
| A04 | 4 | 完整数据流 | SVG/矢量 | 待制作 |
| A05 | 5 | observation model | SVG/矢量 | 待制作 |
| A06 | 6 | ω 与 CNA/LOH/purity | SVG/矢量 | 待制作 |
| A07 | 7 | φ/η/后代求和 | SVG/矢量 | 待制作 |
| A08 | 8 | linfreq mutation clustering | SVG/矢量 | 待制作 |
| A09 | 9 | Beta prior 与边际似然 | SVG/矢量 | 待制作 |
| A10 | 10 | supervariant compression | SVG/矢量 | 待制作 |
| A11 | 11 | 三种 pairwise relation 几何区域 | SVG/矢量 | 待制作 |
| A12 | 12 | Pairs Tensor posterior | SVG/矢量 | 待制作 |
| A13 | 13 | tensor 指导 proposal、而非直接定树 | SVG/矢量 | 待制作 |
| A14 | 14 | TreeMCMC local move | SVG/矢量 | 待制作 |
| A15 | 15 | fit η/φ、score、MH | SVG/矢量 | 待制作 |
| A17 | 17 | 方法边界双栏框 | SVG/矢量 | 待制作 |
| A18 | 18 | short-read 与 long-read 架构迁移 | SVG/矢量 | 待制作 |
| A19 | 19 | take-home 总结 | SVG/矢量 | 待制作 |

### 5.2 优先复用论文图表

| 资产 | 用于页码 | 使用原则 | 状态 |
|---|---:|---|---|
| 模拟数据结果图 | 16 | 保留原坐标轴和图例，只添加必要 takeaway 标注 | 待核对图号 |
| 真实 B-ALL 结果图 | 17 | 优先使用原图；若信息过密，再做忠实简化版 | 待核对图号 |
| 论文方法总览图 | 3/4 | 只有在信息密度适合组会时复用，否则自绘 | 待核对图号 |

### 5.3 图表制作规则

- 结果图中的数值、坐标轴、误差线和图例不自行重画或改写，除非已经从原始数据重新生成。
- 方法概念图优先自绘，以保证符号和叙事与本次汇报一致。
- 所有复用论文图表在图注中标注原文出处和图号。
- 所有自绘图在图注中标注“示意图，基于 Pairtree 模型整理”。
- 公式、箭头、关系边和树结构尽量使用矢量元素，方便在飞书中修改。

## 6. 逐页制作协议

每一页正式制作前，先在对话中确认以下内容：

1. 这一页的标题和主题句是否保留。
2. 展示内容是否需要删减或调整技术深度。
3. 图是复用论文原图，还是先制作自绘示意图。
4. 这一页是否需要独立的公式或备份页。
5. 讲稿需要强调什么、避免什么。

每一页制作完成后，交付：

- 飞书中的单页预览；
- 本页使用的图或公式素材；
- 本页讲稿；
- 本页的科学内容检查清单；
- 等待用户确认后才进入下一页。

## 7. 科学内容检查清单

- [ ] φ 没有被写成 VAF 或单个 clone frequency。
- [ ] η 和 φ 的方向、求和关系正确。
- [ ] ω 被明确标注为外部输入，而不是 Pairtree 联合估计结果。
- [ ] linfreq 的输出被描述为 mutation clustering/partition，而不是最终 clone tree。
- [ ] supervariant 的核心约束被描述为保持 expected variant reads，而不是完整 likelihood 等价。
- [ ] Pairs Tensor 被描述为 relation posterior/evidence，而不是最终树或简单边分数。
- [ ] TreeMCMC 被描述为 proposal + constrained frequency fitting + global likelihood evaluation。
- [ ] 三代数据部分区分“可以迁移的架构”和“需要重新建模的 observation layer”。
- [ ] 论文结果数字、图号和方法比较在最终制作前再次对照原文。

## 8. 待用户审阅的关键选择

- [ ] 主线是否保持 19 页，还是压缩为 16–17 页。
- [ ] 汇报重点是否继续偏向“三代数据启发”，还是更完整地讲 Pairtree 原算法。
- [ ] 是否在主线保留第 9 页 linfreq 的数学细节。
- [ ] 是否把第 14–15 页 TreeMCMC 拆成两页保留。
- [ ] 主色和整体风格是否采用“暖白背景 + 海军蓝/青绿/橙色”的方案。
- [ ] 是否需要单独准备 5–6 页 backup slides。
