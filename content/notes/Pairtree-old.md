# Pairtree 亚克隆重建：论文

## 🧭 方法部分

### 输入数据

首先是工具需要的输入数据包括每个变异的：
- alt reads
- total reads
- var_read_prob，\(\omega\)

\(\omega\) 这个值稍微麻烦一点。它的含义是把细胞比例转换成 VAF 的位点校正因子，即“单位细胞频率对应多少 VAF”。和 VAF 的区别在于，VAF 是用 reads 直接观测到的频率值。

对于变异 \(j\)，在样本 \(s\) 中，其 \(\omega_{js}\) 计算方式是：

\[
\omega_{js}=\frac{Q_{js}}{W_{js}}
\]

其中，\(Q_{js}\) 指的是 mutant multiplicity，也就是该位点变异 allele 拷贝数；\(W_{js}\) 指的是该位点平均总拷贝数。这些数虽然很关键，但是 Pairtree 并不计算，而是直接接收 \(\omega\)。

\(\omega\) 的计算需要 CNA、purity、LOH、allele-specific CN 等信息。

### Data-implied subclone frequency

然后对每个变异计算 Pairtree 定义的 data-implied subclone frequency，我理解的其实就是类似 CCF，即包含该变异的细胞占比。

对每个变异 \(j\)，在样本 \(s\) 中，计算：

\[
\phi_{js}\approx \frac{\mathrm{VAF}_{js}}{\omega_{js}}
\]

并结合所有样本得到该变异的 \(\phi_j\) 向量：

\[
\boldsymbol{\phi}_j=
[\phi_{j1},\phi_{j2},\ldots,\phi_{jS}]
\]

对于公式 \(\phi_{js}\approx \mathrm{VAF}_{js}/\omega_{js}\)。

VAF 的期望：

\[
E[\mathrm{VAF}]
=\frac{\phi Q}{\phi C_m+(1-\phi)C_n}
=\frac{\phi Q}{W}
=\phi\omega
\]

因此：

\[
\mathrm{VAF}\approx\phi\omega
\]

在这里文章假设得到的 \(\omega\) 是准确的，并且明确提到复杂 CNA 的变异会难以计算出准确的 \(\omega\)，建议删除这些变异。

### \(\omega\) 与 \(\phi\) 的耦合

注：真实

\[
E[\mathrm{VAF}]
=\frac{\sum_k p_{ik}m_k}{\sum_k p_{ik}C_k}
\]

所以没有办法精确计算，同时 \(\omega\) 和 \(\phi\) 是耦合的。

想精确知道 \(\omega\) 要这些信息：

- mutation 出现在哪些 clone
- mutant multiplicity
- 各 clone 的 copy-number state
- 各 clone 的比例
- CNA 在 mutation 之前还是之后

但这些又恰恰是亚克隆重建想要推断的东西，矛盾，存在循环依赖：

~~~text
要估 φ
→ 需要 ω

要准确估 ω
→ 需要 clone composition 和演化关系

要知道 clone composition
→ 又需要 φ
~~~

### 三代数据可能提供的帮助

三代数据提供：

- SNV 与附近 germline SNP 的 phasing
- SNV 与局部 CN/SV breakpoint 的 read-level linkage
- allele-specific copy number
- 复杂结构变异
- mutant allele 是否位于扩增 haplotype 上

对 \(Q\) 和 \(\omega\) 的估计有帮助，因为能够通过 somatic 分型等方式限制变异的 multiplicity。但仍然无法知道变异来自哪一个完整 clone，以及这个 clone 在样本中占多少。

注意：Pairtree 的模拟数据中能够看到并且使用真实的 \(\omega\)，但真实数据不行。如果它要做更加真实和全面的 benchmark，应该考虑：

~~~text
Oracle ω：
直接使用 truth ω

Estimated ω：
用模拟出的 bulk CN / purity 估计 ω

Perturbed ω：
主动给 ω 加误差

Misspecified ω：
假设所有 mutation multiplicity=1
~~~

---

## 🧩 Mutation clustering：linfreq

言归正传，对 mutation 进行聚类的时候，不会用到变异的 \(\phi\)。

过程是这样的：

首先 cluster \(c\) 中有一群 mutation，那么假设所有的 mutation 共享一个 \(\phi\)，也就是共享一个 clone frequency。那么在样本 \(s\) 中就是 \(\phi_{cs}\)。

对每个 cluster，有一个最大似然来评估该 cluster 的置信度（cluster 的联合 likelihood 是所有 mutation likelihood 的乘积），使用的概率模型和先验如下：

- \(\phi_{js}=\phi_{cs}\sim\operatorname{Beta}(1,1)\)，服从 0 到 1 的均匀先验，无偏
- \(V_{js}\sim\operatorname{Binomial}(T_{js},\omega_{js}\phi_{js})\)，但是在工作模型中，为了计算方便，做了一个数学处理，令

  \[
  T'_{js}=\max(V_{js},\omega_{js}T_{js})
  \]

  得到：

  \[
  V_{js}\sim\operatorname{Binomial}(T'_{js},\phi_{js})
  \]

  （因为 \(E[V]=T\omega\phi=(T\omega)\phi=T'\phi\)。）

于是工作模型为：

\[
V_{js}\mid\phi_{cs}
\sim\operatorname{Binomial}(T'_{js},\phi_{cs})
\]

给定某个候选的 \(\phi_{cs}\)，cluster 的联合 likelihood：

\[
L_{cs}(\phi_{cs})
=\prod_{j\in c}P(V_{js}\mid T'_{js},\phi_{cs})
\]

即：

\[
L_{cs}(\phi_{cs})
=\prod_{j\in c}
\binom{T'_{js}}{V_{js}}
\phi_{cs}^{V_{js}}
(1-\phi_{cs})^{T'_{js}-V_{js}}
\]

### Cluster 的边际似然

最终打分：

\[
P(D_{cs})
=\int_0^1 L_{cs}(\phi_{cs})P(\phi_{cs})\,d\phi_{cs}
\]

对于多样本的情况，每个样本单独计算 \(P(D_{cs})\)，然后：

\[
P(D_c)=\prod_sP(D_{cs})
\]

对数空间就是：

\[
\log P(D_c)=\sum_s\log P(D_{cs})
\]

> 一个 cluster 在给定共享 \(\phi_{cs}\) 时，其 likelihood 是成员 mutation likelihood 的乘积；Pairtree 不分别最大化每个 mutation，而是对共同的 \(\phi_{cs}\) 积分，得到 cluster 的 marginal likelihood。

贝叶斯模型中，把未知潜变量 marginalize 掉的标准公式：

\[
P(D)=\int P(D,\phi)\,d\phi
\]

而：

\[
P(D,\phi)=P(D\mid\phi)P(\phi)
\]

因此：

\[
P(D)=\int P(D\mid\phi)P(\phi)\,d\phi
\]

### Cluster likelihood 的计算流程

~~~mermaid
flowchart TD
    accTitle: Cluster Marginal Likelihood
    accDescr: The diagram shows how shared cluster frequency, mutation likelihoods, and a beta prior are combined into a cluster marginal likelihood.

    same_cluster[假设 A、B 属于同一 cluster] --> shared_phi[它们在 sample s 共享 φ_cs]
    shared_phi --> conditional_independence[给定 φ_cs 后，各 mutation read counts 条件独立]
    conditional_independence --> joint_likelihood[联合 likelihood：L_cs(φ)=乘积 P(V_js | T'_js, φ_cs)]
    joint_likelihood --> unknown_phi[真实 φ_cs 未知]
    unknown_phi --> beta_prior[给 φ_cs 一个 Beta(1,1) 先验]
    beta_prior --> integrate_phi[对所有可能 φ_cs 加权求和]
    integrate_phi --> marginal_likelihood[P(D_cs)=积分 L_cs(φ_cs)P(φ_cs)dφ_cs]
~~~

### linfreq 的聚类过程

~~~mermaid
flowchart TD
    accTitle: linfreq Clustering
    accDescr: The diagram shows one Gibbs update in linfreq, where a mutation is tested against existing clusters and a new-cluster option before sampling an assignment.

    select_mutation[选择 mutation j] --> remove_mutation[从原 cluster 删除 j]
    remove_mutation --> baseline_partition[得到共同基线 Z_-j]
    baseline_partition --> existing_cluster_1[假设 j 加入 cluster 1]
    baseline_partition --> existing_cluster_2[假设 j 加入 cluster 2]
    baseline_partition --> other_cluster[假设 j 加入其他 cluster]
    baseline_partition --> new_cluster[假设 j 创建新 cluster]
    existing_cluster_1 --> assignment_score[计算每种方案的边际似然增量]
    existing_cluster_2 --> assignment_score
    other_cluster --> assignment_score
    new_cluster --> assignment_score
    assignment_score --> prior_weight[已有 cluster 乘 n_c；新 cluster 乘 alpha]
    prior_weight --> conditional_posterior[归一化成条件后验概率]
    conditional_posterior --> sample_assignment[按该概率采样一次]
    sample_assignment --> update_assignment[更新 j 的 cluster assignment]
~~~

聚类后输出：

- xxx

---

## 📦 Supervariant

然后下一步，就是重建 clone tree。首先把 cluster 压缩成 supervariant。

\(\omega\) 的含义是“单位（mutation-bearing）细胞比例贡献的 VAF 频率”，mutation-carrying cell fraction（即 \(\phi\)）转换成期望 VAF 的系数。

即：

\[
E[\mathrm{VAF}]=\omega\phi
\]

Pairtree 首先把所有 mutation 都换算到同一个标准 \(\omega^*=0.5\)。

并且要求，**换算前后的 variants reads 的期望不变**（这是重点吗）。

变化前的 variants reads 数：

\[
E[\mathrm{VAF}]=N\omega\phi
\]

\(N\) 是 total reads 数量。

变化后：

\[
E[\mathrm{VAF}]=N^*\omega^*\phi
\]

因为想要 \(\omega^*=0.5\)，所以令新的 total reads 为：

\[
N^*=2N\omega
\]

因此，该 cluster 中所有的 mutation \(j\)，现在都有：

- \(N^*_{js}=2N_{js}\omega_{js}\)
- \(\omega^*_{js}=0.5\)

且，从假设知道，所有的 mutation 共享一个 \(\phi\)。

然后对于每个 cluster \(c\)，按照 sample 汇总得到：

- \(V^*_{cs}=\sum_jV^*_{js}\)
- \(N^*_{cs}=\sum_jN^*_{js}\)

然后把一个 cluster 压缩成一个变异，即看做一个 supervariant，并且具有：

\[
V^*_{cs}\sim\operatorname{Binomial}(N^*_{cs},0.5\phi_{cs})
\]

因此，整个流程的结果就是一个包含很多变异的 cluster，最终变成一个具有性质 \((V^*_{cs},N^*_{cs},0.5)\) 的 supervariant。

对每个 cluster 都作此处理，并准备后续的 pair tensor 计算。

---

## 🔗 Pairs Tensor

假设聚类后有 \(K\) 个 supervariants。

对于任意一对 \(A,B\)，Pairtree 计算三种关系的后验概率：

\[
P(A\to B\mid D),\qquad
P(B\to A\mid D),\qquad
P(A\parallel B\mid D)
\]

其中：

- \(A\to B\)：A 是 B 的祖先
- \(B\to A\)：B 是 A 的祖先
- \(A\parallel B\)：二者处于不同分支

论文把这些 pairwise 后验概率组成 Pairs Tensor。

Pairs Tensor 是一个 \(K\times K\times3\) 的矩阵，其中每一个元素都代表一种（具有方向的）关系的 read likelihood。

### 两个 supervariant 的 read likelihood

这种似然的计算，我们从一个简单的例子看起。先只看一个 sample。

对于 sample \(s\)，我们有：

\[
D_{As}=(V^*_{As},N^*_{As},0.5)
\]

\[
D_{Bs}=(V^*_{Bs},N^*_{Bs},0.5)
\]

假设它们真实的 subclonal frequencies 分别是：

\[
\phi_{As},\qquad \phi_{Bs}
\]

给定这两个频率时，read likelihood 是：

\[
L_s(\phi_A,\phi_B)
=P(V^*_A\mid N^*_A,0.5\phi_A)
P(V^*_B\mid N^*_B,0.5\phi_B)
\]

展开就是：

\[
L_s(\phi_A,\phi_B)
=\operatorname{Binomial}(V^*_A;N^*_A,0.5\phi_A)
\cdot
\operatorname{Binomial}(V^*_B;N^*_B,0.5\phi_B)
\]

现在问题变成：

> 哪一种关系允许的 \((\phi_A,\phi_B)\) 区域，能够覆盖更多高 likelihood 的位置？

这是因为，不同的关系（祖先后代/分支）会决定两个 \(\phi\) 之间不同的比较关系。

### 三种关系对应的频率约束区域

#### 1. A 是 B 的祖先

携带 B 的细胞也必然携带 A，所以：

\[
\phi_A\geq\phi_B
\]

允许区域是：

\[
\mathcal R_{A\to B}
=\{(\phi_A,\phi_B):0\leq\phi_B\leq\phi_A\leq1\}
\]

图形上是单位正方形的一半。

#### 2. B 是 A 的祖先

反过来：

\[
\phi_B\geq\phi_A
\]

允许区域是：

\[
\mathcal R_{B\to A}
=\{(\phi_A,\phi_B):0\leq\phi_A\leq\phi_B\leq1\}
\]

#### 3. A、B 分叉

二者处于不同分支。一颗细胞不能同时属于这两个互斥分支，所以：

\[
\phi_A+\phi_B\leq1
\]

允许区域是：

\[
\mathcal R_{\mathrm{branch}}
=\{(\phi_A,\phi_B):\phi_A\geq0,\phi_B\geq0,\phi_A+\phi_B\leq1\}
\]

Pairtree 对每种关系，就是把 likelihood 在对应的约束区域内积分。源码明确为三种关系设置了这些频率边界。

### 关系证据与后验概率

那么每种关系的证据怎么计算？以 \(A\to B\) 为例：

\[
E_{A\to B,s}
=\iint_{\phi_A\geq\phi_B}
L_s(\phi_A,\phi_B)
p(\phi_A,\phi_B\mid A\to B)
\,d\phi_A\,d\phi_B
\]

另外两种关系同理：

\[
E_{B\to A,s}
=\iint_{\phi_B\geq\phi_A}
L_s(\phi_A,\phi_B)
p(\phi_A,\phi_B\mid B\to A)
\,d\phi_A\,d\phi_B
\]

\[
E_{\mathrm{branch},s}
=\iint_{\phi_A+\phi_B\leq1}
L_s(\phi_A,\phi_B)
p(\phi_A,\phi_B\mid\mathrm{branch})
\,d\phi_A\,d\phi_B
\]

这里的 \(E\) 是：

> 这种关系下，这个 sample 的 read 数据有多大概率出现。

也就是该关系的**边际似然/模型证据**。

以上是单个 sample 的情况。对于多 sample：

对每个 sample 都单独计算关系证据。假设有 \(S\) 个 samples：

\[
E_r=\prod_{s=1}^{S}E_{r,s}
\]

在 log 空间：

\[
\log E_r=\sum_{s=1}^{S}\log E_{r,s}
\]

所以一种关系必须能够同时解释多个 samples。

例如：

\[
\boldsymbol{\phi}_A=[0.8,0.7,0.6],
\qquad
\boldsymbol{\phi}_B=[0.4,0.2,0.3]
\]

所有 sample 都支持：

\[
\phi_A\geq\phi_B
\]

所以 \(A\to B\) 会很强。

但如果：

\[
\boldsymbol{\phi}_A=[0.8,0.2],
\qquad
\boldsymbol{\phi}_B=[0.3,0.7]
\]

那么：

- sample 1 支持 A 祖先 B
- sample 2 支持 B 祖先 A

两个线性关系都会产生冲突。若每个 sample 又满足：

\[
\phi_A+\phi_B\leq1
\]

branching 就更可能。

代码对每个 sample 计算 evidence，然后在 log 空间求和。

得到三种关系的证据后，再乘关系先验：

\[
P(r\mid D_A,D_B)\propto P(r)E_r
\]

归一化：

\[
P(r\mid D_A,D_B)
=\frac{P(r)E_r}{\sum_{r'}P(r')E_{r'}}
\]

源码就是把每种关系的 log evidence 加上 log prior，然后 softmax 得到 posterior。

对所有 \(1\leq A<B\leq K\) 重复计算，得到：

\[
\operatorname{Tensor}[A,B,:]
=
[P(A\to B),P(B\to A),P(A\parallel B)]
\]

这就是 Pairs Tensor。

~~~mermaid
flowchart TD
    accTitle: Pairs Tensor Calculation
    accDescr: The diagram shows how clustered mutations become supervariants, how pairwise frequency constraints define three relation regions, and how their evidences become tensor entries.

    cluster_mutations[cluster mutations] --> build_supervariant[构造 supervariant：V*、N*、ω*=0.5]
    build_supervariant --> select_pair[选取一对 supervariants A、B]
    select_pair --> read_likelihood[给定 φA、φB，计算两条 Binomial likelihood]
    read_likelihood --> ancestor_a[区域 1：φA ≥ φB；A ancestor B]
    read_likelihood --> ancestor_b[区域 2：φB ≥ φA；B ancestor A]
    read_likelihood --> branching[区域 3：φA + φB ≤ 1；branching]
    ancestor_a --> integrate_regions[分别对允许区域积分]
    ancestor_b --> integrate_regions
    branching --> integrate_regions
    integrate_regions --> combine_samples[跨 samples 相乘；log evidence 求和]
    combine_samples --> normalize_relations[加 relation prior 并归一化]
    normalize_relations --> tensor_entry[Tensor[A,B,:]]
~~~

### 关系先验

这里其实有两种先验。对于不同的 supervariant \(A,B\)，Pairtree 原始代码定义了五种可能模型：

\[
\{\mathrm{garbage},\mathrm{cocluster},A\to B,B\to A,\mathrm{branching}\}
\]

但现在 \(A,B\) 已经是两个不同的 cluster：

- 不允许它们 cocluster
- 不考虑 garbage

所以 Pairtree 在构建 Pairs Tensor 时直接设置：

\[
P(\mathrm{garbage})=0,\qquad
P(\mathrm{cocluster})=0
\]

剩下的概率质量，被平均分给三个未指定的关系：

\[
P(A\to B)=P(B\to A)=P(A\parallel B)=\frac13
\]

因此，关系上是均匀先验。

### 还有一层 \(\phi\) 的先验

假设关系已经指定为：

\[
r=A\to B
\]

那么还要问：

> 在所有满足 \(A\to B\) 的 \((\phi_A,\phi_B)\) 中，哪些频率组合更有先验优势？

Pairtree 的处理是：

> 在该关系允许的区域中，使用均匀先验。

#### A 是 B 的祖先

允许区域：

\[
\mathcal R_{A\to B}
=\{(\phi_A,\phi_B):0\leq\phi_B\leq\phi_A\leq1\}
\]

即单位正方形下半个三角形。

在这个三角形内部均匀：

\[
p(\phi_A,\phi_B\mid A\to B)=2
\]

为什么密度是 2？

因为三角形面积是：

\[
\frac12
\]

概率总和必须为 1：

\[
2\times\frac12=1
\]

#### B 是 A 的祖先

允许区域：

\[
\mathcal R_{B\to A}
=\{(\phi_A,\phi_B):0\leq\phi_A\leq\phi_B\leq1\}
\]

也是面积 \(1/2\) 的三角形，内部均匀。

#### 两者分叉

允许区域：

\[
\mathcal R_{\parallel}
=\{(\phi_A,\phi_B):\phi_A+\phi_B\leq1\}
\]

同样是面积 \(1/2\) 的三角形，也在区域内部均匀。

代码的离散网格实现对每个合法网格点赋相同概率，并分别将三个区域归一化到 1。

蒙特卡洛实现也明确在三个三角形区域内进行均匀采样。

所以两层先验是：

\[
P(r)=\frac13
\]

以及：

\[
p(\phi_A,\phi_B\mid r)
=\text{在关系 }r\text{ 的合法区域内均匀}
\]

以 \(A\to B\) 为例：

\[
P(D_A,D_B\mid A\to B)
\]

等于：

\[
\iint_{\phi_A\geq\phi_B}
P(D_A\mid\phi_A)
P(D_B\mid\phi_B)
p(\phi_A,\phi_B\mid A\to B)
\,d\phi_A\,d\phi_B
\]

最后再乘关系先验：

\[
P(A\to B\mid D)
\propto
P(A\to B)P(D\mid A\to B)
\]

因为三个关系的先验都是 \(1/3\)，它们相同时会在归一化中抵消。

因此默认情况下，tensor 中三种关系概率的差别，主要来自 read data 的证据，而不是关系先验。

---

## 🌳 TreeMCMC

最后就进入了 TreeMCMC。
