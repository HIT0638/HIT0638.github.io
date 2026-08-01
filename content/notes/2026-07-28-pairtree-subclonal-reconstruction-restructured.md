---
title: Pairtree 亚克隆重建论文笔记
date: 2026-07-28
summary: 从输入数据、频率模型和局部关系到整体树搜索，整理 Pairtree 的方法链路及其对三代数据的启发。
draft: false
---

# Pairtree 亚克隆重建论文笔记
---

## 0. Pairtree 解决什么问题
 
Pairtree 的目标，是从多个 bulk DNA 样本中的 somatic mutation read counts 出发，推断不同亚克隆之间的祖先关系，并给出一个或多个可能的 clone tree。

它的主线可以压缩成：

1. 使用每个变异的 alt reads、total reads 和外部提供的 \(\omega\)，得到变异携带率的观测约束
2. 将跨样本频率模式相近的 mutation 聚成 cluster（补：（注：跨样本频率模式相近并不是两两mutation判断（我没看pairwise聚类方式，只看了linfreq），而是CRP过程主导的采样方式下，mutation不同的cluster归属模式计算出来的以cluster为单位的边际似然增量之间比较得到的结果）
3. 将每个 cluster 压缩成一个 supervariant（补：压缩是有目的的）
4. 对任意两个 supervariant，计算三种祖先关系的后验概率，组成 Pairs Tensor
5. 用 Pairs Tensor 指导 TreeMCMC 搜索整体 clone tree（补：是不是主要两关键部分，一个是如何用tensor指导树结构的改变，另一个是怎么定义和计算树的评分）

这篇论文最值得借鉴的思想，是把“整体树重建”拆成两层：

- **局部关系层**：两个变异集合更像祖先—后代，还是不同分支？
- **整体树层**：在所有 pairwise 关系和频率约束下，哪棵树最能解释 read data？

对三代数据项目而言，Pairs Tensor 的思想确实可能有启发：长 reads 可以直接提供 mutation 之间的 read-level 共现信息。但需要注意，Pairtree 原始的 Pairs Tensor 主要由 VAF/read-count likelihood、\(\omega\) 和频率约束得到，并不是直接利用长 reads 上的 mutation 共现；如果迁移到三代数据，需要替换或扩展 observation model。

这篇笔记中还要始终区分两件事：

- Pairtree 的 \(\phi\) 是带有测序噪声和 \(\omega\) 校正的变异携带率参数，不是无误差的真实 CCF
- Pairs Tensor 主要用于指导树搜索的 proposal；最终树仍然要根据树约束下的 read likelihood 进行评价

---

## 1. 符号和核心概念

理解 Pairtree 前，最好先固定四个层次：**reads、alleles、cells、clones**。它们对应的“比例”不是同一个量。

### 1.1 基本符号

| 符号 | 含义 | 所在层次 |
| --- | --- | --- |
| \(j\) | 第 \(j\) 个 mutation | mutation |
| \(s\) | 第 \(s\) 个 sample | sample |
| \(c\) | 一个 mutation cluster 或 supervariant | cluster |
| \(V_{js}\) | mutation \(j\) 在 sample \(s\) 中的 variant/alt reads 数 | reads |
| \(T_{js}\) | mutation \(j\) 在 sample \(s\) 中的 total reads 数 | reads |
| \(\mathrm{VAF}_{js}=V_{js}/T_{js}\) | 直接从 reads 观察到的变异等位基因频率 | reads / alleles |
| \(Q_{js}\) | 携带 mutation 的细胞中，平均有多少个 mutant allele copies | alleles |
| \(W_{js}\) | 该位点在 sample 中所有细胞上的平均 total copy number | alleles |
| \(\omega_{js}=Q_{js}/W_{js}\) | 将细胞携带率映射为期望 VAF 的位点校正因子 | copy-number ratio |
| \(\phi_{js}\) | mutation \(j\) 在 sample \(s\) 中的细胞层面携带率 | cells |
| \(\phi_{cs}\) | cluster/supervariant \(c\) 在 sample \(s\) 中共享的携带率参数 | cells |
| \(\eta_{ks}\) | clone \(k\) 本身在 sample \(s\) 中的细胞频率 | clones / cells |

### 1.2 \(\phi\) 的准确含义

在 Pairtree 的语境中，\(\phi_{js}\) 应该写成：

\[
\phi_{js}
=
\frac{
\text{sample }s\text{ 中携带 mutation }j\text{ 的细胞数}
}{
\text{sample }s\text{ 中的全部细胞数}
}
\]

也就是说，\(\phi\) 统计的是“有多少细胞携带至少一个 mutant copy”，不是 mutant reads 的比例，也不是 mutant allele copies 的比例。

因此：

- 一个细胞携带 1 个 mutant copy，计作 1 个携带突变的细胞
- 一个细胞携带 2 个 mutant copies，也仍然计作 1 个携带突变的细胞
- mutant copy 数的差异进入 \(Q\)，总 copy number 的差异进入 \(W\)，最终体现在 \(\omega=Q/W\) 中

Pairtree 论文将这种量称为 mutation 的 subclonal frequency，即样本中携带该 mutation 的细胞比例。[^1]

### 1.3 \(\phi\)、CCF 和 clone frequency 不是同一个概念

癌症文献中常见的 CCF 往往指：

\[
\mathrm{CCF}_{\mathrm{tumor}}
=
\frac{
\text{携带 mutation 的肿瘤细胞数}
}{
\text{全部肿瘤细胞数}
}
\]

如果正常细胞不携带该 somatic mutation，且 purity 为 \(\pi\)，则在简单情况下：

\[
\phi_{\mathrm{sample}}
\approx
\pi\cdot\mathrm{CCF}_{\mathrm{tumor}}
\]

所以在这份笔记里，最好把 Pairtree 的 \(\phi\) 称为：

> **样本细胞层面的 mutation/subclonal frequency**

而不要直接把它写成没有分母说明的“CCF”。

还要区分 \(\phi\) 和 \(\eta\)：

- \(\eta_{ks}\) 是某个 clone 本身的细胞频率
- \(\phi_{js}\) 是携带 mutation \(j\) 的细胞频率

在无限位点假设下，如果 mutation \(j\) 出现在 clone \(k\)，那么它会被后代继承。因此：

\[
\phi_{js}
=
\sum_{k\in\mathcal C(j)}\eta_{ks}
\]

其中 \(\mathcal C(j)\) 表示携带 mutation \(j\) 的 clone 及其所有后代 clone。

所以把 \(\phi\) 直接叫作“某个 clone 的 frequency”有时会产生歧义；更准确的是“某个 mutation 或 mutation cluster 的 subclonal frequency”。

### 1.4 \(\omega\) 将细胞比例映射到 VAF

Pairtree 使用的基本观测模型是：

\[
V_{js}
\sim
\operatorname{Binomial}
\left(
T_{js},
\omega_{js}\phi_{js}
\right)
\]

因此：

\[
E\left[\frac{V_{js}}{T_{js}}\right]
\approx
\omega_{js}\phi_{js}
\]

以及：

\[
E[V_{js}]
\approx
T_{js}\omega_{js}\phi_{js}
\]

这里：

\[
\omega_{js}=\frac{Q_{js}}{W_{js}}
\]

- \(Q_{js}\) 是 mutation-bearing cells 中的平均 mutant allele copy number
- \(W_{js}\) 是样本所有细胞在该位点的平均 total copy number

Pairtree 将 \(\omega\) 作为输入，而不是在主要算法中从 reads 重新估计它。正确设置 var_read_prob 对后续 data-implied subclonal frequency 和树重建都很关键。[^2]

### 1.5 四种比例不要混用

| 量 | 分子 | 分母 | 是否直接由 reads 观察 |
| --- | --- | --- | --- |
| VAF | mutant reads | total reads | 是 |
| \(\phi\) | 携带 mutation 的细胞 | sample 中全部细胞 | 否，需要 \(\omega\) 校正 |
| 肿瘤 CCF | 携带 mutation 的肿瘤细胞 | 全部肿瘤细胞 | 否，需要 purity 等信息 |
| mutant allele fraction | mutant allele copies | 所有 allele copies | 一般不是 Pairtree 直接使用的主参数 |

---

## 2. Pairtree 整体数据流

Pairtree 的输入和输出之间，可以先用下面这条主线理解：

~~~mermaid
flowchart LR
    accTitle: Pairtree Overall Workflow
    accDescr: The diagram summarizes Pairtree from read-count inputs and external omega values through mutation clustering, supervariant construction, pairwise relation posteriors, and tree posterior sampling.

    input_data([📥 输入 V、T、ω]) --> frequency_evidence[⚙️ 构造频率证据]
    frequency_evidence --> linfreq_clustering[🧩 linfreq mutation clustering]
    linfreq_clustering --> supervariant_building[📦 压缩为 supervariants]
    supervariant_building --> pair_tensor[🔗 计算 Pairs Tensor]
    pair_tensor --> tree_mcmc[🔄 TreeMCMC 搜索 clone tree]
    tree_mcmc --> posterior_trees([📤 输出树及其后验概率])

    classDef input_style fill:#ede9fe,stroke:#7c3aed,stroke-width:2px,color:#3b0764
    classDef process_style fill:#dbeafe,stroke:#2563eb,stroke-width:2px,color:#1e3a5f
    classDef output_style fill:#dcfce7,stroke:#16a34a,stroke-width:2px,color:#14532d

    class input_data input_style
    class frequency_evidence,linfreq_clustering,supervariant_building,pair_tensor,tree_mcmc process_style
    class posterior_trees output_style
~~~

### 2.1 输入：reads 和外部 \(\omega\)

每个 mutation 在每个 sample 中至少需要：

- variant/alt reads \(V_{js}\)
- total reads \(T_{js}\)
- var_read_prob，即 \(\omega_{js}\)

Pairtree 的基本观测关系是：

\[
\mathrm{VAF}_{js}
\approx
\omega_{js}\phi_{js}
\]

这里的 \(\omega\) 需要 CNA、LOH、purity、allele-specific copy number 等信息。实际数据中，\(\omega\) 可能是不确定甚至有偏的；这会直接影响后续的频率证据。

### 2.2 linfreq：从 mutation 得到 cluster

linfreq 假设同一个 cluster 内的 mutation 在每个 sample 中共享一个 \(\phi_{cs}\)，然后：

1. 使用 \(V\)、\(T\) 和 \(\omega\) 构造工作模型
2. 对共享的 \(\phi_{cs}\) 积分，得到 cluster 的边际似然
3. 通过 Gibbs/DPMM 风格的更新，采样 mutation 的 cluster assignment

这里要注意：Pairtree 并不是先计算一个固定的 \(\boldsymbol{\phi}_j\) 向量，再把这个向量直接交给聚类器。频率信息是通过 read counts、\(\omega\) 和 cluster likelihood 进入的；cluster 的 \(\phi_{cs}\) 在边际似然中被积分掉。

### 2.3 Supervariant：降低后续树搜索的规模

聚类完成后，每个 cluster 被压缩成一个 supervariant：

- 将不同 mutation 的 \(\omega\) 统一到 \(\omega^*=0.5\)
- 按 sample 汇总 cluster 内 mutation 的 variant reads 和有效 total reads
- 用一个 supervariant 表示整个 cluster

这样做的目的，是在尽量保留 read-count 证据的同时，减少后续需要参与树搜索的节点数量。

### 2.4 Pairs Tensor：先判断局部关系

对于每一对 supervariant \(A,B\)，Pairtree 考虑：

- \(A\to B\)：A 是 B 的祖先
- \(B\to A\)：B 是 A 的祖先
- \(A\parallel B\)：二者位于不同分支

三种关系分别对应不同的 \(\phi\) 约束区域。Pairtree 将 read likelihood 在这些区域内积分，再结合关系先验，得到三种关系的后验概率：

\[
\left[
P(A\to B\mid D),
P(B\to A\mid D),
P(A\parallel B\mid D)
\right]
\]

所有 pair 的这些概率共同组成 Pairs Tensor。

### 2.5 TreeMCMC：从局部关系走向整体树

Pairs Tensor 主要用于指导 TreeMCMC 的节点移动和 proposal：

1. 以一个初始树开始
2. 根据当前树和 Pairs Tensor 选择要移动的节点及候选位置
3. 对新树拟合满足树约束的 \(\phi/\eta\)
4. 根据树约束下的 read likelihood 评价新树
5. 通过 Metropolis-Hastings 规则接受或拒绝这次移动

所以整体关系是：

\[
\text{Pairs Tensor}
\longrightarrow
\text{proposal guidance}
\longrightarrow
\text{tree-constrained likelihood}
\longrightarrow
\text{tree posterior}
\]

Pairs Tensor 不是简单地作为一个额外分数项加到最终树 likelihood 中；它主要影响树搜索的提议分布，而最终树仍由树约束下的数据 likelihood 和 proposal ratio 共同决定。

---

## 3. \(\omega\) 与 \(\phi\)：模型假设和现实局限

### 3.1 从细胞混合到 VAF

设 sample 中的细胞为 \(i=1,\ldots,n\)，细胞 \(i\) 的比例为 \(p_i\)，在 mutation 位点上的 total copy number 为 \(C_i\)，mutant allele copy number 为 \(m_i\)。则期望 VAF 为：

\[
E[\mathrm{VAF}]
=
\frac{\sum_i p_i m_i}{\sum_i p_i C_i}
\]

令 \(\mathcal M\) 表示携带该 mutation 的细胞集合，则：

\[
\phi=\sum_{i\in\mathcal M}p_i
\]

\[
Q=\frac{\sum_{i\in\mathcal M}p_i m_i}{\phi},
\qquad
W=\sum_i p_i C_i
\]

于是：

\[
E[\mathrm{VAF}]
=
\frac{\phi Q}{W}
=
\phi\omega,
\qquad
\omega=\frac{Q}{W}
\]

因此，\(\mathrm{VAF}\approx\omega\phi\) 不是凭空假设出来的，而是把复杂的细胞混合压缩成 \(\phi\)、\(Q\)、\(W\) 三个量后的结果。

真正困难的是：真实数据通常只直接给出 VAF，\(\omega\) 需要依赖外部的 purity、CNA、LOH、allele-specific CN 和 mutant multiplicity 等信息。只知道 VAF 时，\(\omega\) 和 \(\phi\) 的乘积较容易被观测，而两者本身难以完全区分。

### 3.2 一个简单的 copy-number 例子

假设：

- 50% 的细胞携带 mutation
- 携带 mutation 的细胞在该位点平均总 CN 为 4，平均 mutant copy 为 2
- 不携带 mutation 的细胞在该位点总 CN 为 6

则：

\[
\phi=0.5,\qquad Q=2
\]

\[
W=0.5\times4+0.5\times6=5
\]

\[
\omega=\frac{2}{5}=0.4
\]

最终：

\[
E[\mathrm{VAF}]=\omega\phi=0.4\times0.5=0.2
\]

这里不携带 mutation 的细胞总 CN 与携带 mutation 的细胞不同，完全可以成立；它的影响已经进入总体平均 copy number \(W\)。

### 3.3 Pairtree 实际上条件于外部 \(\omega\)

Pairtree 的主要推断更准确地写成：

\[
p(\text{tree},\phi
\mid
\text{read counts},\omega)
\]

而不是：

\[
p(\text{tree},\phi,\omega
\mid
\text{read counts})
\]

也就是说，Pairtree 将 \(\omega\) 当作给定输入，不在主算法中联合估计 purity、CNA、LOH 和 mutant multiplicity。

这会形成一个现实中的依赖链：

~~~mermaid
flowchart TD
    accTitle: Omega Frequency Dependence
    accDescr: The diagram shows how external copy-number correction affects mutation frequency, clustering, pairwise relations, and the final clone tree, while the same tree composition can also influence the ideal correction.

    external_omega[外部提供 ω] --> data_frequency[得到 data-implied φ]
    data_frequency --> mutation_clusters[mutation clustering]
    mutation_clusters --> pairwise_relations[Pairs Tensor]
    pairwise_relations --> clone_tree[clone-tree posterior]
    clone_tree -.-> unknown_composition[真实 clone composition]
    unknown_composition -.-> external_omega
~~~

这不是说 Pairtree 的代码在每一步都显式循环估计 \(\omega\)，而是说真实数据中的 \(\omega\) 并非天然已知；它的误差会依次影响 \(\phi\)、聚类、Pairs Tensor 和树后验。

### 3.4 三代数据可以改善什么

长 reads 可以为 \(\omega\) 或其组成部分提供更多约束：

- SNV 与附近 germline SNP 的 phasing
- SNV 与局部 CN/SV breakpoint 的 read-level linkage
- mutant allele 是否位于某个扩增 haplotype 上
- 复杂结构变异与 SNV 的共同单分子证据
- allele-specific copy number 的相位信息

但这些信息仍然不一定能直接告诉我们：

- 该 mutation 属于哪个完整 clone
- 这个 clone 在样本中的细胞比例是多少
- CNA 是在 mutation 之前还是之后发生的

因此，三代数据更现实的目标不是假设存在一个绝对准确的 \(\omega\)，而是让 \(\omega\) 具有可量化的不确定性，并把它传播到后续关系和树的后验中。

### 3.5 更严格的 benchmark 应该怎样设计

如果只在模拟数据中使用 truth \(\omega\)，评测的主要是“给定正确校正量时，Pairtree 能否恢复树”。为了评估真实数据中的端到端可靠性，可以区分：

~~~text
Oracle ω：
直接使用 truth ω

Estimated ω：
从模拟的 bulk CN、purity、LOH 等信息估计 ω

Perturbed ω：
在 truth ω 上主动加入不同大小的误差

Misspecified ω：
假设所有 mutation multiplicity=1
~~~

这几种设置分别回答不同问题：算法本身的上限、上游估计误差的传播、以及错误模型下的鲁棒性。

---

## 4. Mutation clustering：linfreq

### 4.1 聚类目标

linfreq 的目标不是直接判断祖先关系，而是把跨样本携带率模式相近的 mutation 放到同一个 cluster 中。

对 cluster \(c\) 和 sample \(s\)，linfreq 假设 cluster 内的 mutation 共享一个潜在频率：

\[
\phi_{js}=\phi_{cs},
\qquad
j\in c
\]

这个假设有两个作用：

- 多个 mutation 共同提供证据，可以提高 cluster-level 频率的稳定性
- cluster 数量少于 mutation 数量，可以降低后续树搜索的规模

代价是：如果两个真实不同的 clone 恰好具有相似的跨样本频率，也可能被错误合并。

### 4.2 工作模型和 Beta 先验

原始观测模型是：

\[
V_{js}
\sim
\operatorname{Binomial}
\left(T_{js},\omega_{js}\phi_{cs}\right)
\]

linfreq 使用有效深度：

\[
T'_{js}
=
\max\left(V_{js},\omega_{js}T_{js}\right)
\]

并在工作模型中写成：

\[
V_{js}\mid\phi_{cs}
\sim
\operatorname{Binomial}(T'_{js},\phi_{cs})
\]

对每个 cluster/sample 的共享频率设置：

\[
\phi_{cs}\sim\operatorname{Beta}(\alpha_0,\beta_0),
\qquad
\alpha_0=\beta_0=1
\]

也就是 \([0,1]\) 区间上的均匀先验。

### 4.3 Cluster 边际似然

给定 \(\phi_{cs}\) 时，cluster 内 mutation 条件独立：

\[
L_{cs}(\phi_{cs})
=
\prod_{j\in c}
P(V_{js}\mid T'_{js},\phi_{cs})
\]

将 \(\phi_{cs}\) 积分掉：

\[
P(D_{cs})
=
\int_0^1
L_{cs}(\phi_{cs})
P(\phi_{cs})
\,d\phi_{cs}
\]

由于使用 Beta 先验，这个积分可写成 Beta-Binomial 形式：

\[
P(D_{cs})
=
\left[
\prod_{j\in c}
\binom{T'_{js}}{V_{js}}
\right]
\frac{
B\left(
\sum_{j\in c}V_{js}+\alpha_0,\,
\sum_{j\in c}(T'_{js}-V_{js})+\beta_0
\right)
}{
B(\alpha_0,\beta_0)
}
\]

多个 sample 之间按独立观测处理：

\[
P(D_c)=\prod_sP(D_{cs}),
\qquad
\log P(D_c)=\sum_s\log P(D_{cs})
\]

所以 linfreq 评价的是：“这个 cluster 内的 mutation 是否可以共享一个跨样本频率模式”，而不是给每个 mutation 单独做一次最大似然估计。

### 4.4 Gibbs/DPMM 风格的更新

linfreq 的一次 assignment update 可以概括为：

~~~mermaid
flowchart TD
    accTitle: linfreq Assignment Update
    accDescr: The diagram shows how linfreq removes one mutation, evaluates existing and new cluster assignments using marginal likelihoods and partition priors, and samples a new assignment.

    select_mutation[选择 mutation j] --> remove_mutation[暂时从原 cluster 移除]
    remove_mutation --> evaluate_existing[评估加入每个已有 cluster]
    remove_mutation --> evaluate_new[评估创建 new cluster]
    evaluate_existing --> combine_score[边际似然加 cluster-size prior]
    evaluate_new --> combine_score
    combine_score --> normalize_score[归一化为条件后验]
    normalize_score --> sample_assignment[按条件后验采样]
    sample_assignment --> update_partition[更新 cluster assignment]
~~~

对已有 cluster \(c\)，条件概率的对数权重包含：

\[
\log n_c+\log P(D_{c\cup\{j\}})-\log P(D_c)
\]

创建新 cluster 时，则使用 concentration 参数 \(\alpha\) 和单 mutation cluster 的边际似然。

反复更新所有 mutation，得到一组可能的 cluster partition。linfreq 的输出重点是：

- mutation-to-cluster assignment
- cluster partition 的 likelihood 或采样结果

它不一定输出一个已经确定的、可直接作为后续树参数的 \(\phi_{cs}\) point estimate；共享 \(\phi_{cs}\) 在聚类的边际似然中已经被积分掉。

### 4.5 \(T'\) 是有效深度近似

如果直接令 \(T'=\omega T\)，则：

\[
E[V]
=
T\omega\phi
=
T'\phi
\]

第一矩可以对齐。但实际代码使用：

\[
T'=\max(V,\omega T)
\]

原因之一是保证 \(T'\geq V\)，避免工作模型要求的 \(\phi=V/T'\) 超过 1。

当 \(\max\) 取到 \(\omega T\) 时，\(\phi\) 的最大似然位置仍大致对应：

\[
\frac{V}{T'}
=
\frac{V}{\omega T}
\]

但组合数项、方差结构和完整 likelihood 已经发生变化。因此，\(T'\) 是 effective depth 的近似，不是把原始 Binomial 分布严格地代数变换成另一个 Binomial 分布。

---

## 5. Supervariant：把 cluster 压缩成一个节点

### 5.1 为什么要做转换

聚类后，如果一个 cluster 内有很多 mutation，直接把每个 mutation 都带入树搜索会增加节点数量，也会重复表达相似的频率证据。

Pairtree 将每个 mutation 的观测近似转换到共同的：

\[
\omega^*=0.5
\]

这样每个 cluster 最终可以由一个 supervariant 表示。

### 5.2 转换公式

对 mutation \(j\) 和 sample \(s\)，代码使用：

\[
N^*_{js}=2N_{js}\omega_{js}
\]

\[
V^*_{js}=\min(V_{js},N^*_{js})
\]

\[
\omega^*_{js}=0.5
\]

然后在 cluster 内按 sample 汇总：

\[
N^*_{cs}=\sum_{j\in c}N^*_{js},
\qquad
V^*_{cs}=\sum_{j\in c}V^*_{js}
\]

代码最后还会对需要的 pseudo-read counts 做整数化处理。

### 5.3 核心约束：保持期望 variant reads

在不考虑上限截断时：

\[
E[V^*_{js}]
=
N^*_{js}\omega^*_{js}\phi_{cs}
\]

代入 \(N^*_{js}=2N_{js}\omega_{js}\) 和 \(\omega^*=0.5\)：

\[
E[V^*_{js}]
=
(2N_{js}\omega_{js})(0.5)\phi_{cs}
=
N_{js}\omega_{js}\phi_{cs}
=
E[V_{js}]
\]

所以核心是保持**期望 variant reads**，不是保持 VAF。VAF 是无量纲比例，而 \(N\omega\phi\) 才是期望 variant-read 数。

### 5.4 这不是完整 likelihood 的严格等价

这个转换主要保持一阶矩，并把不同 \(\omega\) 的观测放到一个共同的 pseudo-observation 空间。它不保证：

- 原始 Binomial likelihood 与转换后 likelihood 完全相同
- 方差结构完全相同
- pseudo-read count 一定对应真实的物理 reads

min 截断和整数化还会进一步引入近似。它的实际目标是保留主要 read-count 证据，同时让后续 pairwise relation 和树搜索可以统一使用 \(\omega^*=0.5\)。
min 截断和整数化还会进一步引入近似。它的实际目标是保留主要 read-count 证据，同时让后续 pairwise relation 和树搜索可以统一使用 \(\omega^*=0.5\)。

---

## 6. Pairs Tensor：从 pairwise evidence 到关系后验

### 6.1 三种关系

假设聚类后有 \(K\) 个 supervariant。对于任意一对 \(A,B\)，在无限位点假设下考虑：

- \(A\to B\)：A 是 B 的祖先
- \(B\to A\)：B 是 A 的祖先
- \(A\parallel B\)：A、B 位于不同分支

Pairtree 源码层面还保留 garbage 和 cocluster 状态，但在已经完成 cluster、且对两个不同 supervariant 构造主 Pairs Tensor 时，这两个状态被设为不可用；因此有效关系是三种。[^3]

### 6.2 给定频率时的 read likelihood

对于 sample \(s\)，两个 supervariant 的数据为：

\[
D_{As}=(V^*_{As},N^*_{As},0.5),
\qquad
D_{Bs}=(V^*_{Bs},N^*_{Bs},0.5)
\]

给定 \(\phi_{As},\phi_{Bs}\)：

\[
L_s(\phi_A,\phi_B)
=
\operatorname{Binomial}
(V^*_A;N^*_A,0.5\phi_A)
\cdot
\operatorname{Binomial}
(V^*_B;N^*_B,0.5\phi_B)
\]

注意：Pairs Tensor 的关系 posterior 直接依赖这些 read likelihood；它不是只对一个预先计算好的 \(\hat{\phi}\) 点估计做硬比较。

### 6.3 三种关系对应的频率区域

祖先关系会对 \((\phi_A,\phi_B)\) 施加约束：

\[
\mathcal R_{A\to B}
=
\{(\phi_A,\phi_B):0\leq\phi_B\leq\phi_A\leq1\}
\]

\[
\mathcal R_{B\to A}
=
\{(\phi_A,\phi_B):0\leq\phi_A\leq\phi_B\leq1\}
\]

\[
\mathcal R_{\parallel}
=
\{(\phi_A,\phi_B):\phi_A\geq0,\phi_B\geq0,\phi_A+\phi_B\leq1\}
\]

直观上：

- A 是 B 的祖先时，携带 B 的细胞也携带 A，因此 \(\phi_A\geq\phi_B\)
- B 是 A 的祖先时，反之
- 分叉时，两种互斥后代不能在同一细胞中同时出现，因此 \(\phi_A+\phi_B\leq1\)

这些是**可行域约束**，不是说把观测到的 \(\hat{\phi}\) 直接判成满足或不满足。Pairtree 在可行域内积分，保留 read-count uncertainty。

### 6.4 关系证据

对于关系 \(r\)，单个 sample 的证据为：

\[
E_{r,s}
=
\iint_{\mathcal R_r}
L_s(\phi_A,\phi_B)
p(\phi_A,\phi_B\mid r)
\,d\phi_A\,d\phi_B
\]

多个 sample 的证据在 log 空间相加：

\[
E_r=\prod_sE_{r,s},
\qquad
\log E_r=\sum_s\log E_{r,s}
\]

因此，同一关系需要同时解释所有 sample，而不是只在某一个 sample 上成立。

### 6.5 两层先验

第一层是关系先验。主 Pairs Tensor 中：

\[
P(A\to B)
=
P(B\to A)
=
P(A\parallel B)
=\frac13
\]

第二层是给定关系后的频率先验。Pairtree 在对应三角形区域内使用均匀密度。三个区域面积都为 \(1/2\)，因此连续二维密度为：

\[
p(\phi_A,\phi_B\mid r)=2,
\qquad
(\phi_A,\phi_B)\in\mathcal R_r
\]

关系后验为：

\[
P(r\mid D_A,D_B)
=
\frac{P(r)E_r}{\sum_{r'}P(r')E_{r'}}
\]

均匀关系先验 \(1/3\) 会在归一化时抵消，但关系条件下的频率区域和区域内先验仍然参与 evidence。

### 6.6 Pairs Tensor 的含义

对所有 \(1\leq A<B\leq K\) 计算后：

\[
\operatorname{Tensor}[A,B,:]
=
\left[
P(A\to B\mid D),
P(B\to A\mid D),
P(A\parallel B\mid D)
\right]
\]

因此，Pairs Tensor 的元素是**关系的边际后验概率**，不是原始 read likelihood，也不是最终 clone tree 的 posterior。

它可以作为局部关系的概率化摘要：

~~~mermaid
flowchart TD
    accTitle: Pairwise Relation Posterior
    accDescr: The diagram shows how two supervariants are evaluated under three frequency-constrained relation regions and converted into posterior probabilities.

    pair_data[两个 supervariants 的 read data] --> pair_likelihood[给定 φA、φB 计算 Binomial likelihood]
    pair_likelihood --> relation_regions[三个关系的合法频率区域]
    relation_regions --> region_evidence[对每个区域积分]
    region_evidence --> combine_samples[跨 samples 合并 evidence]
    combine_samples --> relation_posterior[加关系先验并归一化]
    relation_posterior --> tensor_entry[Pairs Tensor 的一个 entry]
~~~

---

## 7. TreeMCMC：从局部关系搜索整体树

### 7.1 树中的 \(\eta\) 和 \(\phi\)

TreeMCMC 搜索的是 clone tree 的结构以及各 clone 的 population frequency。

令 \(\eta_{ks}\) 表示 sample \(s\) 中 clone \(k\) 本身的细胞频率。对于树上的一个 mutation cluster/supervariant \(c\)，其 tree-constrained subclonal frequency 是该节点及所有后代节点频率之和：

\[
\phi_{cs}
=
\sum_{k\in\operatorname{subtree}(c)}
\eta_{ks}
\]

写成矩阵形式：

\[
\boldsymbol{\phi}_s=Z_T\boldsymbol{\eta}_s
\]

其中 \(Z_T\) 由当前树结构决定。

因此，树搜索不是给每个 \(\phi_{cs}\) 独立赋值；树结构会把不同 supervariant 的频率绑定在同一个 \(\boldsymbol{\eta}_s\) 上，并自动施加父子和分支约束。

### 7.2 初始化和 proposal

Pairtree 首先加入一个代表全部细胞的空 root，然后构造初始树。之后每个 MCMC step 大致包括：

1. 根据当前树和 Pairs Tensor 选择一个待移动的节点
2. 选择新的父节点或目标位置
3. 将该节点及其子树重新接入树中
4. 检查新树是否保持合法的树结构

Pairs Tensor 会提高与当前局部关系 posterior 更一致的位置被提出的概率，但它不直接决定最终接受结果。

### 7.3 在新树上拟合频率

对于每个候选树，需要找到满足：

\[
\boldsymbol{\phi}_s=Z_T\boldsymbol{\eta}_s
\]

的 \(\boldsymbol{\eta}_s\) 和 \(\boldsymbol{\phi}_s\)。

Pairtree 提供两类思路：

- **projection**：先使用 data-implied frequency 作为近似目标，再将其投影到当前树允许的频率空间；速度快，但不是原始 Binomial likelihood 的精确最优解
- **rprop**：直接在 \(\eta\) 参数化下优化原始 read-count likelihood；更接近精确的 tree-constrained maximum likelihood，但速度较慢

这里的 data-implied frequency 可以写成近似形式：

\[
\hat{\phi}_{cs}^{\mathrm{data}}
\approx
\frac{V^*_{cs}}{0.5N^*_{cs}}
\]

但正式树评分使用的是拟合后的 tree-constrained \(\phi\)，而不是简单地把每个 supervariant 的 \(\hat{\phi}\) 独立拿来比较。

### 7.4 候选树的 read likelihood

对当前树和拟合后的 \(\phi\)，supervariant 的数据 likelihood 为：

\[
\ell(T,\eta)
=
\sum_{c,s}
\log
\operatorname{Binomial}
\left(
V^*_{cs};
N^*_{cs},
0.5\phi_{cs}
\right)
\]

这一步才是在评价“整棵树及其频率配置能否解释所有 read counts”。

### 7.5 Metropolis-Hastings 接受或拒绝

如果当前树为 \(T_{\mathrm{old}}\)，候选树为 \(T_{\mathrm{new}}\)，proposal 分布分别为 \(q(T_{\mathrm{new}}\mid T_{\mathrm{old}})\) 和 \(q(T_{\mathrm{old}}\mid T_{\mathrm{new}})\)，则 log acceptance ratio 为：

\[
\log r
=
\left[
\ell(T_{\mathrm{new}})
-\ell(T_{\mathrm{old}})
\right]
+
\left[
\log q(T_{\mathrm{old}}\mid T_{\mathrm{new}})
-\log q(T_{\mathrm{new}}\mid T_{\mathrm{old}})
\right]
\]

然后按照 Metropolis-Hastings 规则接受或拒绝：

\[
\text{接受概率}
=
\min(1,\exp(\log r))
\]

因此完整的决策链是：

~~~mermaid
flowchart TD
    accTitle: Tree MCMC Proposal
    accDescr: The diagram shows how Pairtree proposes a tree move using pairwise relation preferences, fits tree-constrained frequencies, scores the candidate tree, and accepts or rejects it.

    current_tree[当前 tree] --> choose_move[选择待移动节点和目标位置]
    choose_move --> propose_tree[提出 candidate tree]
    propose_tree --> fit_frequencies[拟合 tree-constrained φ/η]
    fit_frequencies --> score_tree[计算 read likelihood 和 proposal ratio]
    score_tree --> accept_move{接受 candidate tree？}
    accept_move -->|是| new_state[更新当前 tree]
    accept_move -->|否| keep_state[保留当前 tree]
    new_state --> next_step[进入下一步 MCMC]
    keep_state --> next_step
~~~

### 7.6 后验样本和共识表示

MCMC 运行多条 chain，并进行 burn-in、thinning 等处理，得到一组候选树样本。相同树结构的重复样本可以合并，用其出现次数和 likelihood 估计树的相对后验权重。

最终输出通常包括：

- 候选 tree structures
- 每棵树的 sample count
- tree-constrained \(\phi\) 或 \(\eta\)
- tree likelihood
- tree posterior probability

如果多棵树都具有较高后验，Pairtree 可以进一步用边的边际 posterior 构造 consensus graph。这个 consensus graph 是关系层面的摘要，不一定等于某一棵 posterior 最高的完整树。

### 7.7 Pairs Tensor 到底扮演什么角色

可以把两者的关系写成：

\[
\text{Pairs Tensor}
\longrightarrow
\text{proposal/search guidance}
\]

而不是：

\[
\text{最终树分数}
=
\text{read likelihood}
+
\text{Pairs Tensor 中所有关系概率的简单求和}
\]

最终树的接受或拒绝，仍然由 tree-constrained read likelihood 和 proposal ratio 决定。Pairs Tensor 的价值主要在于把巨大的树空间引导到更有希望的区域，并帮助 MCMC 更快发现与观测关系一致的候选树。
最终树的接受或拒绝，仍然由 tree-constrained read likelihood 和 proposal ratio 决定。Pairs Tensor 的价值主要在于把巨大的树空间引导到更有希望的区域，并帮助 MCMC 更快发现与观测关系一致的候选树。

---

## 8. 评测与边界

### 8.1 模拟数据评测了什么

论文在 576 组模拟数据上比较 Pairtree 与其他 clone-tree reconstruction 方法。[^1] 模拟数据改变了：

- subclone 数量：3、10、30、100
- cancer sample 数量：1 到 100
- read depth
- mutation 数量

主要指标包括：

- **success rate**：在规定时间内成功输出至少一棵树且没有崩溃
- **VAF reconstruction loss**：方法得到的 tree-constrained frequency 对 VAF read data 的拟合损失
- **relationship reconstruction error**：两两祖先关系与 truth 的差异
- **tree error**：与真实树结构的差异

这里要注意，VAF reconstruction loss 衡量的是“能否解释观测数据”，并不自动等价于“恢复了真实生物学历史”。

### 8.2 模拟结果的主要结论

论文报告的主要趋势是：

- Pairtree 在 576 组模拟数据中都能产生结果
- 在不超过约 30 个 subclone 的问题上，Pairtree 的 VAF 拟合和关系重建表现较强
- subclone 数量增加到 100 后，VAF loss 和 relationship error 都明显升高
- 更多互补 sample 通常能提供更多频率约束，帮助区分祖先关系
- 在大树场景下，Pairs Tensor 单独作为 pairwise relation 方法有时仍然有用，即使完整树搜索已经变得困难

这说明 Pairtree 的优势不是“任何规模都能精确恢复完整树”，而是把较大的问题拆成了更容易处理的 pairwise evidence，再用这些 evidence 引导全局搜索。

### 8.3 真实 B-ALL 数据

论文还在 14 个 B-progenitor acute lymphoblastic leukemia 病例上评测 Pairtree。这些病例最多包含 90 个 sample 和 26 个 subclone。Pairtree 得到的 clone tree 在 12/14 个病例中，VAF 拟合效果达到或超过专家构建的 baseline。[^1]

这个结果需要谨慎理解：

- 专家树是一个重要的人工 baseline，但不等于独立观测到的真实进化树
- “VAF 拟合更好”不等于每一个父子关系都被生物学真值验证
- 结果仍然建立在输入的 purity/CNA/LOH 和 \(\omega\) 校正质量之上

### 8.4 ISA violation 检测

Pairtree 还评估了对以下情况的识别能力：

- technical noise
- homoplasy
- back mutation
- miscalled CNA

它的策略主要是识别会破坏无限位点假设的可疑 mutation，并将其标记为 garbage 或排除，而不是完整地联合建模 recurrent mutation、mutation loss、CNA 和 LOH 的所有演化过程。

所以“Pairtree 能检测 ISA violation”应理解为：

> 它能发现一部分与当前树模型不相容的输入，而不是已经解决了复杂突变回溯和拷贝数演化。

### 8.5 计算规模和实际使用边界

Pairtree 的运行时间和内存需求会随着 subclone 数量超线性增加。相关 protocol 建议在实际使用中不要轻易超过约 30 个 subclone；100-subclone 场景可以作为压力测试，但重建准确率和计算成本都会变差。[^2]

因此，如果一个三代数据项目能够解析出很多 mutation 或 haplotype block，不应直接把所有节点一次性送入 Pairtree。更实际的策略是：

- 先做高可信度 mutation/haplotype 聚类
- 先排除 copy-number 和 mapping 明显不可靠的区域
- 分层或分区构造关系 evidence
- 对最终树保留多个候选解，而不是只报告一棵看似确定的树

### 8.6 这些评测没有回答什么

论文评测主要回答：

\[
\text{给定输入 read counts 和 }\omega
\quad\Longrightarrow\quad
\text{Pairtree 能否恢复关系和树}
\]

它没有充分回答：

- \(\omega\) 被错误估计时，完整后验会如何变化
- purity、CNA、LOH 和 mutant multiplicity 的不确定性如何传播
- 长 reads 的 mapping、phasing、allele dropout 和 chimeric molecule 如何影响关系
- 一个 read-level mutation pair 是否真的来自同一个细胞谱系

这正是三代数据方法需要额外补上的部分。

---

## 9. 对三代数据亚克隆重建的启发

### 9.1 可以直接借鉴的不是 VAF 公式，而是推断架构

Pairtree 最值得迁移的结构是：

\[
\text{观测数据}
\longrightarrow
\text{pairwise relation posterior}
\longrightarrow
\text{全局 tree posterior}
\]

其中“关系先于结构、概率先于硬标签”非常适合三代数据：

- 一个 mutation pair 的证据可能很强，也可能模糊
- 某个 pair 的局部最高概率关系可能和其他 pair 冲突
- 最终仍然需要全局树约束来消解冲突

### 9.2 三代数据应替换的 observation layer

在长-read 场景下，关系证据可以同时包含：

- 单个位点的 alt/reference read counts
- 两个或多个 mutation 在同一 molecule 上的共现
- mutation 与 germline SNP 的 phase
- mutation 与 CN/SV breakpoint 的 linkage
- molecule-level mapping quality、fragment length 和 strand 信息

可以把 Pairtree 的二维积分推广成：

\[
P(r\mid D)
\propto
P(r)
\int
P(D_{\mathrm{count}},D_{\mathrm{phase}}
\mid
\phi_A,\phi_B,\omega,r)
p(\phi_A,\phi_B,\omega\mid r)
\,d\phi_A\,d\phi_B\,d\omega
\]

这里的关键变化是：

- 不再只使用 \(D_{\mathrm{count}}\)
- 将 \(\omega\) 从固定输入变成可以带不确定性的 nuisance variable
- 将长 reads 的共现模式作为直接关系 evidence，而不是先压缩成单个 VAF

### 9.3 三代数据中的关系状态可能不止三种

Pairtree 的三种关系建立在较强的 ISA 和无混合假设上。三代数据还可能遇到：

- 两个 mutation 在同一 molecule 上，但 molecule 不代表完整细胞
- 两个位点之间距离太远，无法被同一 read 覆盖
- phase 缺失或局部重组导致关系未知
- mapping 或 chimera 产生假共现
- 一个 mutation 被 CNA/SV 改变了可观测性

因此更稳妥的 relation state 可能包括：

- ancestor
- descendant
- different branches
- direct molecule co-occurrence but lineage unresolved
- unknown / insufficient span
- technical conflict

其中“同一 molecule 共现”不能无条件等同于“同一 clone 共现”。它仍然需要结合覆盖范围、测序误差、分子独立性和细胞混合模型。

### 9.4 是否还需要 supervariant

长 reads 可能减少对 VAF clustering 的依赖，因为多个 mutation 的 read-level phase 本身就能提供局部组合信息。但 supervariant 的思想仍有价值：

- 将多个高度一致、证据冗余的 mutation/haplotype block 合并
- 降低全局树搜索的节点数量
- 将局部不确定性先在 block 内汇总

区别在于，三代数据中的 cluster 不一定只依据跨样本 \(\phi\) 相似性，也可以依据：

- 同一 molecule 的稳定共现
- 相同 haplotype background
- 相同 CN/SV context
- 多样本中一致的出现/消失模式

### 9.5 一个可迁移的最小版本

如果先做一个不太激进的三代数据版本，可以保留 Pairtree 的树搜索框架，只替换前面的 evidence：

~~~text
long-read molecule observations
→ mutation/haplotype pair evidence
→ relation posterior tensor
→ initial tree
→ TreeMCMC proposal
→ tree-constrained frequency fitting
→ joint count + phase likelihood
→ candidate clone trees and posterior
~~~

这样做的好处是可以把创新集中在 observation model 和 pairwise evidence，而不是同时重写整个树搜索器。

---

## 10. 最后压缩成几句话

1. \(\phi\) 是样本细胞层面的 mutation 携带率，不是 VAF，也不是 mutant copy fraction。
2. \(\eta\) 是 clone 本身的细胞频率；\(\phi\) 通常是某个 clone 及其后代频率之和。
3. \(\omega\) 是关键的 copy-number correction，Pairtree 把它作为外部输入，因此真实数据中的 \(\omega\) 不确定性没有被完整联合建模。
4. linfreq 通过共享 \(\phi_{cs}\) 和边际似然聚类 mutation；它不直接使用一个固定的单 mutation \(\hat{\phi}\) 向量。
5. supervariant 转换的核心是近似保持期望 variant reads，而不是严格保持完整 Binomial likelihood。
6. Pairs Tensor 的元素是 pairwise relation posterior，主要用于指导 TreeMCMC proposal，不是最终树的简单加分项。
7. 最终 clone tree 仍然要在全局树约束下重新拟合 \(\phi/\eta\)，并用 read likelihood 进行接受或拒绝。
8. 对三代数据而言，最值得迁移的是“pairwise probabilistic evidence \(\rightarrow\) globally consistent tree posterior”这一架构；VAF/\(\omega\) 的具体 observation model 需要用长-read phase 和 molecule-level evidence 重新设计。

---

[^1]: Morris, J. A. et al. “Reconstructing Complex Cancer Evolutionary Histories from Multiple Bulk DNA Samples Using Pairtree.” *Blood Cancer Discovery*, 2022. https://pmc.ncbi.nlm.nih.gov/articles/PMC9780082/

[^2]: Morris, J. A. et al. “Reconstructing cancer phylogenies using Pairtree, a clone tree reconstruction algorithm.” *STAR Protocols*, 2023. https://pmc.ncbi.nlm.nih.gov/articles/PMC9494285/

[^3]: Morris Lab. “Pairtree source code.” GitHub. https://github.com/morrislab/pairtree
