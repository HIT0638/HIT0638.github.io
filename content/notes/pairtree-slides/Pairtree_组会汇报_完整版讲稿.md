# Pairtree 组会汇报完整版讲稿

> 对应页面：pairtree-slides/slide-01.html 至 slide-19.html  
> 完整版预计时长：约 40–45 分钟，不含讨论与问答。  
> 正文是可直接讲的口语稿；“转场”用于自然进入下一页；标为“时间不足可跳过”的段落删去后，可压缩到约 30 分钟；“备用回答”只在被追问时展开。  
> 主论文：Wintersinger JA et al. *Reconstructing Complex Cancer Evolutionary Histories from Multiple Bulk DNA Samples Using Pairtree*. *Blood Cancer Discovery*. 2022;3(3):208–219. DOI: 10.1158/2643-3230.BCD-21-0092.

## 先统一三个口径

- \(\phi\)：样本细胞层面携带某个 mutation 的比例；不是 VAF，也不是某个 clone 自身的频率。
- \(\eta\)：某个 clone 自身的细胞频率；树结构决定 \(\phi\) 是哪些 \(\eta\) 的和。
- \(\omega\)：把细胞携带率映射为期望 VAF 的位点校正项。Pairtree 把它作为外部输入，不在算法内部联合估计。

---

## 第 1 页｜Pairtree：从突变关系到亚克隆树

**预计时间：1.2 分钟**

### 讲稿

大家好，今天汇报的是 Pairtree。这篇论文关心的核心问题是：我们只有 bulk 测序得到的混合突变信号时，怎样恢复肿瘤内部的亚克隆结构和演化树。

我觉得它对我们最有启发的地方，不只是给出了一个 clone-tree reconstruction 工具，而是它把一个很难直接求解的全局树问题，拆成了“局部突变关系证据”和“全局树搜索”两个层次。

标题里的“突变关系”指的是：两个 mutation 到底是祖先—后代关系，还是处在不同分支。Pairtree 先把这种局部关系做成可计算的证据，再利用它去引导全局树的搜索，而不是只根据每个 mutation 单独的频率直接画树。

右侧只是一个示意图：实线是树结构，虚线表示不同 mutation 之间可被推断的 pairwise relation。

大家看图时可以从右下角的局部关系开始：单独看任意一对 mutation，我们只是在问谁先谁后、或者是否分支；把很多这样的局部证据放在一起，才形成上方那棵全局一致的树。整篇论文的技术路线，其实都围绕这个“由局部到整体”的转换展开。

> 【时间不足可跳过】这也是我选择汇报这篇工作的原因。对三代数据而言，我们未必会照搬它的 read-count 模型，但“先估计 mutation pair 的关系，再恢复全局 clone structure”非常接近我们能够从长分子共现信息中获得的优势。

### 转场

下一页先说明，为什么只看 bulk 的频率模式，通常不足以唯一确定一棵亚克隆树。

### 备用回答

如果有人问这篇文章和“直接用 VAF 聚类再连树”的区别，可以先回答：Pairtree 也使用 reads 和频率，但它把两两关系的概率显式计算出来，并用 MCMC 在全局一致性约束下搜索树。

---

## 第 2 页｜研究背景与问题

**预计时间：2.5 分钟**

### 讲稿

bulk 样本里混合了正常细胞和多个亚克隆。测序以后，我们观察到的是 mutation 的 variant reads、total reads，以及由它们形成的 VAF，而不是单个细胞的基因型。

图左侧是细胞混合；中间是若干 mutation 的 bulk 频率模式；右侧表示同一组或相近的 bulk 频率，可能同时兼容线性演化和分支演化两种树结构。

直觉上，如果 a、b、c 的频率有高低关系，我们可能倾向于把它们连成一条链。但这并不能唯一证明 b 是 c 的祖先；它也可能是两个不同分支在某个样本中恰好呈现出相近的频率模式。

因此真正缺的不是“再拟合一个频率”，而是 mutation 之间的关系信息：谁的携带细胞集合包含谁，谁和谁互斥地位于不同分支。

这里可以把每个 mutation 想象成一个细胞集合。如果 B 是 A 的后代事件，那么“携带 B 的细胞集合”应当包含在“携带 A 的细胞集合”之内；如果 A 和 B 位于不同分支，那么两个集合通常应当互斥。bulk 测序看不到这些集合本身，只能看到它们在不同样本中的投影，也就是频率。因此树重建本质上是从多个有噪声的集合大小，反推集合之间的包含或分离关系。

多区域、多时间点或复发前后的多个样本之所以有帮助，是因为同一批 mutation 在不同混合比例下被重复观察。某两个 mutation 在一个样本里频率接近，可能无法区分；如果在多个样本里始终保持稳定的高低关系，祖先—后代的证据才会加强。反过来，如果它们在不同样本中此消彼长，分支关系会更合理。

> 【时间不足可跳过】但“多样本”并不自动消除不可辨识性。如果两个 clone 在所有样本中恰好以固定比例共同变化，或者 copy-number 校正本身有误，数据仍然可能支持多棵树。后面 Pairtree 输出后验树样本，而不是宣称唯一真树，也与此有关。

### 转场

Pairtree 的策略就是不直接硬解这棵树，而是把问题分层，先提取局部关系证据，再搜索全局树。

### 备用回答

这里的图是概念图，不是在说任意两棵树都会产生完全相同的 VAF。它想表达的是：频率数据本身常常存在不可辨识性，尤其在样本数有限、copy number 复杂或亚克隆较多时。

---

## 第 3 页｜Pairtree 的核心贡献

**预计时间：1.8 分钟**

### 讲稿

Pairtree 的整体贡献可以压缩成三个模块。

第一步是 linfreq。它从 mutation-level 的 reads 出发，把跨样本 prevalence 模式相近的 mutation 聚成 cluster。这里的重点是：这些 mutation 被假设共享相近的潜在携带率模式，而不是说它们已经被证明属于同一个最终 clone。

第二步是 supervariant。每个 cluster 被压缩为后续分析的一个单位，从而降低 pairwise 比较和树搜索的规模。

第三步是 Pairs Tensor 加 TreeMCMC。Pairs Tensor 给出任意两个 supervariant 的局部关系后验；TreeMCMC 再利用这些关系倾向提出候选树，并根据全局模型评价候选树。

右上角这一点要特别记住：\(\omega\) 依赖 purity、CNA、LOH 和 mutation multiplicity 等信息，但这些不是 Pairtree 在内部估出来的，而是外部输入。

从计算角度看，这三个模块分别在解决三个不同层次的规模问题。linfreq 减少 mutation 数量；supervariant 把 cluster 转成统一的统计对象；Pairs Tensor 则预先整理 pairwise relation，使 MCMC 不必在巨大的树空间里完全盲目游走。

所以它并不是一个单一公式，而是一套推断架构。理解它时最好始终问三个问题：当前处理的数据单位是 mutation、cluster 还是 tree？当前概率描述的是 read、pairwise relation 还是整棵树？当前步骤是在压缩信息、提出候选，还是评价候选？后面我也会沿着这三个问题讲。

> 【时间不足可跳过】另外，作者之所以需要这样的分层，与它试图处理的规模有关。节点数增加时，可能的树数量增长得极快；如果直接穷举全局树，即使每棵树的 likelihood 很容易算，也很快无法承受。因此局部证据既是生物学信息，也是计算上的搜索启发式。

### 转场

下面这页把数据对象如何从 reads 一步步变成树的后验样本，完整走一遍。

---

## 第 4 页｜Pairtree 总体流程

**预计时间：1.8 分钟**

### 讲稿

这页把算法按数据流来读。

输入是每个 mutation、每个 sample 的 variant reads \(V\)、total reads \(T\)，以及外部提供的 \(\omega\)。

linfreq 的输出是 cluster partition，也就是 mutation 的分组。之后，supervariant 将每个 cluster 压缩为一个分析单位。

Pairs Tensor 接着对每一对 supervariants 计算三种关系的后验概率。注意，它输出的是 relation posterior，不是一条已经确定的边。

最后，TreeMCMC 在全局树空间里提出和评价候选树，输出的不是唯一一棵“真树”，而是后验 tree samples，以及可选的 consensus tree。

所以我们可以把整个方法分成三层：前面是观测层和数据压缩，中间是局部 pairwise relation，最后才是全局 tree inference。

这页建议按箭头从左到右看，同时注意每一步丢掉了什么、保留了什么。原始输入保留 mutation-level read counts；聚类以后，单个 mutation 的身份被收进 cluster；supervariant 又把 cluster 转换为统一的 pseudo-read representation；Pairs Tensor 进一步把一对节点的数据压缩成三个关系概率；最后 MCMC 才把所有节点同时放入树约束里。

这意味着 Pairtree 并不是从 Pairs Tensor 直接“拼树”。tensor 是中间缓存的局部摘要，而候选树仍然要回到 read likelihood 上接受整体评价。这个区别在第 13 到 15 页会再强调，因为它决定了我们怎样理解 Pairtree 的统计目标。

> 【时间不足可跳过】如果用条件概率写得更准确，Pairtree 更接近在推断 \(p(\text{tree},\phi\mid V,T,\omega)\)。\(\omega\) 位于条件栏里，而不是作为一个随机变量与树一起被推断。这一点会影响后面所有“不确定性”的解释。

### 转场

但是这条数据流的根基是观测模型。首先要说清：VAF 为什么不能直接等同于 mutation 的细胞携带率。

---

## 第 5 页｜观测模型

**预计时间：2.5 分钟**

### 讲稿

Pairtree 使用的基本观测模型可以写成：\(V_{js}\sim\operatorname{Binomial}(T_{js},\omega_{js}\phi_{js})\)。

其中，\(\phi\) 是样本里携带这个 mutation 的细胞比例；\(\omega\) 则负责把这个细胞层面的比例映射到 reads 层面的有效 variant probability。

所以直接观察到的 VAF，也就是 \(V/T\)，近似对应的是 \(\omega\phi\)，而不是 \(\phi\) 本身。这是本页最重要的一句话：VAF 不等于 \(\phi\)。

从图上往下看，先是细胞中有多少比例携带 mutation；乘上 copy-number related 的校正项 \(\omega\) 后，得到一条 read 是 variant 的概率；最后再经过 Binomial 采样，才得到观测到的 \(V\) 和 \(T\)。

Binomial 这一层只是在描述 read sampling noise。真实数据里 purity、copy number、LOH 和 mutation multiplicity 的不确定性，并没有因此消失，而是被压缩进了 \(\omega\)。

逐项解释这个式子。下标 \(j\) 表示 mutation，\(s\) 表示 sample；\(T_{js}\) 是这个位点的总覆盖，\(V_{js}\) 是其中的 variant reads。Binomial 的成功概率不是单纯的 \(\phi_{js}\)，而是 \(\omega_{js}\phi_{js}\)。因此同一个 mutation 即使在 100% 的细胞中存在，只要拷贝数背景不同，期望 VAF 也可能远低于 50%。

反过来，我们也不能简单用 \(V/(0.5T)\) 得到携带率。这个换算只在非常理想的二倍体、杂合、无正常污染且 mutation multiplicity 为 1 的情况下才成立。真实样本里，只要 purity、总拷贝数或者突变所在拷贝数改变，映射系数就会改变。

还要区分期望值与一次观测。即使 \(\omega\phi\) 完全正确，有限覆盖下实际的 \(V/T\) 仍会随机波动；覆盖越低，这种 sampling uncertainty 越大。所以模型不是先把 VAF 当作准确数值再建树，而是保留 \(V\) 和 \(T\)，用 read-count likelihood 表达不同深度下证据强弱的差别。

> 【时间不足可跳过】这里使用 Binomial 是一个基础观测模型。现实中测序偏倚、mapping bias、过度离散等因素可能让 variance 大于 Binomial 预期。Pairtree 的关键贡献不在于发明更复杂的 read error model，而在于后续关系与树的推断框架；因此我们迁移到三代数据时，最先需要替换的恰恰可能是这一层。

### 转场

接下来就用一个很小的 copy-number 例子说明：\(\omega\) 为什么必要，以及它为什么是 Pairtree 的现实瓶颈。

---

## 第 6 页｜\(\omega\) 的来源与局限

**预计时间：3.0 分钟**

### 讲稿

这里给一个简化例子。样本里一半是正常细胞，copy number 为 2，没有 mutation；另一半是肿瘤细胞，copy number 为 3，mutation 位于其中 1 条拷贝。

这个位点在整个样本中的平均总 allele 数是 \(0.5\times2+0.5\times3=2.5\)。突变 allele 的总体贡献是 \(0.5\times1=0.5\)，所以最终期望 VAF 是 \(0.5/2.5=0.2\)。

但是这里的 \(0.2\) 是最终 VAF，不是公式 \(E[\mathrm{VAF}]=\omega\phi\) 中的 \(\omega\)。因为 mutation 只存在于一半细胞中，\(\phi=0.5\)；携带 mutation 的细胞平均有 1 个 mutant copy，所以 \(Q=1\)，总体平均 copy number \(W=2.5\)。因此 \(\omega=Q/W=1/2.5=0.4\)，最后才是 \(0.4\times0.5=0.2\)。

这也回答了一个常见疑问：不携带 mutation 的细胞和携带 mutation 的细胞，在这个位点的 copy number 完全可以不同。它们的差异会进入总体的 \(W\)，从而影响 \(\omega\)。

因此 Pairtree 的主要推断实际上是“在给定 \(\omega\) 的条件下”进行。它不联合估计 purity、CNA、LOH 和 mutant multiplicity 的不确定性。这不是一个无关紧要的预处理细节，而是一条会传递到 clustering、pairwise relation 和最终树的依赖链。

这里要特别留意幻灯片示意可能带来的混淆：如果图中把 \(0.5/2.5=0.2\) 标成 \(\omega\)，它实际上把 mutation-bearing population 的 0.5 也吸收进了分子。严格对应 \(V\sim\mathrm{Binomial}(T,\omega\phi)\) 时，\(\phi\) 与 \(\omega\) 不能重复计算这部分比例。最稳妥的定义是：\(\phi\) 表示携带 mutation 的细胞比例；\(Q\) 是这些携带者中平均 mutant-copy 数；\(W\) 是整个样本的平均总 copy number；\(\omega=Q/W\)。

更一般地，如果携带 mutation 的细胞里平均有 \(m\) 个 mutant copies，而整个样本该位点的平均总拷贝数为 \(C\)，常见的直觉写法是 \(E[\mathrm{VAF}]\approx \phi m/C\)，于是 \(\omega\approx m/C\)。但当 CNA 状态与 mutation-bearing population 不完全重合时，\(m\)、\(C\) 和 \(\phi\) 的拆分并不天然可识别，需要外部 purity、allele-specific CNA、LOH 和 mutation timing 假设共同确定。

这就是我们之前讨论到的循环依赖：reads 最直接约束的是乘积 \(\omega\phi\)。如果 \(\omega\) 偏小，模型会倾向于用更大的 \(\phi\) 解释相同 VAF；如果 \(\omega\) 偏大，推断出的 \(\phi\) 会偏小。这种偏差随后可能改变两个节点能否满足祖先或分支约束。

> 【时间不足可跳过】因此，对模拟数据，作者可以使用生成数据时已知的 CNA、purity 或真值校正，问题比较干净；但对真实数据，Pairtree 的树后验严格来说是“条件于一套选定的 \(\omega\)”的后验。它没有自动把多套可能的 copy-number explanation 边缘化掉。这不是说方法没有价值，而是我们不能把结果中的确定性扩大解释。

### 转场

有了 \(\omega\) 和 \(\phi\) 的区分后，还需要进一步分清：mutation 的携带率和 clone 自身的频率并不是同一个量。

### 备用回答

如果被问到“\(\omega\) 能不能精确估准”，回答是：真实 bulk 数据里通常不能。Pairtree 假设它已经由外部流程给出；模拟数据可以把它设为真值，但真实数据中的不确定性没有被完整传播进后验。

---

## 第 7 页｜\(\phi\)、\(\eta\) 与亚克隆频率

**预计时间：2.4 分钟**

### 讲稿

这页用一条三节点的线性树区分 \(\phi\) 和 \(\eta\)。

\(\eta\) 是某个 clone 自身的频率。图中 C1、C2、C3 的 \(\eta\) 分别是 0.5、0.3、0.2，它们相加为 1。

\(\phi\) 则是 mutation 的携带率。若 mutation 出现在 C1，那么 C1、C2、C3 及其后代都继承这条 mutation，因此 \(\phi_1=1.0\)。如果 mutation 出现在 C2，那么携带者是 C2 和 C3，所以 \(\phi_2=\eta_2+\eta_3=0.5\)。如果 mutation 出现在 C3，则 \(\phi_3=\eta_3=0.2\)。

所以，\(\eta\) 是节点自己的 population frequency；\(\phi\) 往往是该节点及其后代的频率之和。树结构正是把两者联系起来的矩阵关系，后面会写成 \(\boldsymbol{\phi}=Z\boldsymbol{\eta}\)。

请注意，\(\phi\) 也仍然不是 VAF。VAF 需要经过 \(\omega\) 的映射，才变成 \(\omega\phi\)。

这页可以再用“集合”理解。C1 上出现的 mutation 被所有后代继承，因此它的 carrier set 是 C1、C2、C3 三群细胞的并集；C2 mutation 的 carrier set 只包括 C2 和 C3；C3 mutation 只包括 C3。所以沿树从根向叶走，\(\phi\) 通常不增加，这就是祖先频率必须不小于后代频率的来源。

矩阵 \(Z\) 的每一项表示“某个 clone 是否携带某个祖先节点的 mutation”。给定 topology 后，\(Z\) 就确定了；\(\eta\) 是每个 clone 的非负混合比例；两者相乘得到各 mutation cluster 的累积 prevalence \(\phi\)。因此从 \(\phi\) 反推出 \(\eta\) 是否非负，也是判断一棵树是否与数据兼容的重要部分。

还要提醒一个术语问题。有些文献把 \(\phi\) 直接称为 cancer cell fraction，但那通常以肿瘤细胞为分母；我们这里为了与观测模型保持一致，把它讲成样本全部细胞中的 mutation-bearing fraction。若要转换成 tumor-only CCF，需要再考虑 purity。汇报时最好明确分母，不要只说“突变比例”。

> 【时间不足可跳过】在分支树里，关系更直观：父节点的 \(\phi\) 等于自身 \(\eta\) 加上所有后代分支的 \(\eta\)。两个兄弟节点各自的 \(\phi\) 可以相加，但不能超过共同祖先可分配给它们的细胞比例。后面 Pairs Tensor 中的 branching constraint，本质上就是这种非负 clone-frequency 条件在两个节点上的投影。

### 转场

接下来 Pairtree 先不搜索树，而是把具有相似 \(\phi\) 模式的 mutation 聚起来。

---

## 第 8 页｜linfreq：先把突变聚成 cluster

**预计时间：2.0 分钟**

### 讲稿

左边是 mutation 乘 sample 的示意矩阵。每一行是一个 mutation，每一列是一个 sample，点的大小代表 prevalence 的高低。

linfreq 的目标是：如果多个 mutation 在不同 sample 中呈现出相近的 prevalence pattern，就把它们分到同一个 cluster。右侧显示的是 cluster-level profile，也就是 cluster 内 mutation 共享的潜在 \(\phi\) 向量。

这样做有两个作用。第一，它把很多 mutation 压缩成较少的 cluster，降低后面的组合复杂度。第二，它把可能共同出现、共同演化的 mutation 组织成一个更稳定的分析单位。

但这一步的输出只是 mutation partition，也就是分组。它不是完整 clone tree，也不是已经确认的 parent-child relation。

看图时可以先沿着一行横向看：同一个 mutation 在不同 sample 中形成一个 prevalence vector。聚类比较的是整条向量，而不是某一个 sample 里的 VAF 是否接近。因为两个 mutation 可能在样本 1 中恰好相同，但在样本 2、3 中明显分开；多样本 profile 能提供更强的判别信息。

再纵向看，同一 cluster 里的许多 mutation 被解释为来自同一个 clone-defining event group，因此共享一个 cluster-level \(\phi_{cs}\)。每个 mutation 仍然有自己的覆盖深度、variant reads 和 \(\omega\)，只是它们共同约束同一个潜在 prevalence。高覆盖、校正更可靠的 mutation 会提供更尖锐的证据；低覆盖 mutation 的不确定性更大。

这里“共享 \(\phi\)”是统计假设，不是从单细胞或 phasing 数据直接验证的事实。如果两个不同 clone 在所有样本中频率高度同步，它们可能被聚到一起；如果同一 clone 内 mutation 因 CNA、测序偏倚或 \(\omega\) 错误表现不一致，也可能被拆开。因此 cluster quality 决定了后面 tree node 的基本分辨率。

> 【时间不足可跳过】从这个角度说，linfreq 同时做了 denoising 和 resolution reduction：它用多个 mutation 的证据稳定一个节点，但也放弃了在 cluster 内继续区分更细谱系的可能。后续 TreeMCMC 不会重新把一个错误合并的 cluster 拆开，所以聚类误差具有下游不可逆性。

### 转场

那么 linfreq 如何决定一个 mutation 加入哪个 cluster？关键不是固定一个 \(\phi\) 再做最近邻，而是比较不同 assignment 的边际证据。

---

## 第 9 页｜linfreq：用边际似然评价聚类

**预计时间：3.0 分钟**

### 讲稿

linfreq 的工作假设是：同一个 cluster 内的 mutation 共享潜在的 \(\phi_{cs}\)。这里的 \(\phi\) 不会先被一次性最大似然估成一个固定数字，而是给它一个 Beta 先验，论文实现里使用的是 Beta(1,1)。

然后，对每个候选 cluster，模型把这个潜在的 \(\phi\) 积分掉，得到 cluster 的边际证据。图中积分的意思是：不问“某个固定频率最像多少”，而是问“如果这些 mutation 共享同一个潜在频率，它们的 read data 总体上有多合理”。

实现时还用了 \(T'=\max(V,\omega T)\) 这样的有效深度近似，并用 Gibbs/DPMM 风格更新 mutation assignment。这里不展开推导，只要抓住一点：这是一个为聚类服务的计算近似，不应被误解成把原始 Binomial 生物学模型严格等价地替换掉了。

这页可以分成“cluster 内 likelihood”和“cluster assignment”两层理解。先固定某个 cluster：其中所有 mutation 在 sample \(s\) 共享 \(\phi_{cs}\)，但是每个 mutation 的 \(V_{js}\)、\(T_{js}\)、\(\omega_{js}\) 不同。把这些 mutation 的 likelihood 相乘，就得到这个 cluster 在给定 \(\phi_{cs}\) 时对数据的解释能力。

然后给 \(\phi_{cs}\) 一个 Beta 先验，并对 \(\phi_{cs}\) 从 0 到 1 积分。积分后的数值是边际似然：它已经综合考虑“这个 cluster 可以取哪些频率”以及“在这些频率下 reads 有多合理”。因此聚类比较时不必把 \(\phi\) 固定在某个点估计，也不会把一个不稳定的最大似然值直接当作真值向后传。

在 assignment 更新时，对一个 mutation 逐个考察：把它放进已有 cluster，边际证据增加多少；让它新开一个 cluster，又有多合理。DPMM 提供了 cluster 数量可变的机制，Gibbs update 则反复更新各 mutation 的归属，最终形成 posterior-supported partition。

为什么要引入 \(T'\)？原始成功概率是 \(\omega\phi\)，不同 mutation 的 \(\omega\) 不同，不方便直接得到统一、共轭的 Beta-Binomial 形式。把有效 trial 数近似改为 \(\omega T\)，同时把成功概率写成 \(\phi\)，可以保留最大似然位置的大致关系：\(V/T'\approx V/(\omega T)\approx\phi\)。使用 \(\max(V,\omega T)\) 是为了避免有效 trial 数小于已经观察到的 successes。

> 【时间不足可跳过】因此 \(T'\) 不是新的测序深度，也不是把 \(\omega\) 从算法里取消了；恰恰相反，它是把 \(\omega\) 吸收到 effective depth 中。它主要在 linfreq 的聚类似然中发挥作用。后面 supervariant 和 tree likelihood 仍有各自的数据转换与评价方式，不能把所有阶段混成同一个 Beta-Binomial。

> 【时间不足可跳过】这也回答我们之前的疑问：聚类不是先为每个 mutation 求一个确定的 \(\phi\) 向量，再用欧氏距离聚类。mutation-level read data 是直接进入 cluster marginal likelihood 的；\(\phi_{cs}\) 在这个过程中作为潜变量被积分掉。聚类完成后，它的主要产物是 partition，而不是一张必须传给后续步骤的固定 \(\hat\phi\) 表。

### 转场

得到 mutation clusters 后，Pairtree 还要做一次工程上的压缩，把每个 cluster 转成一个 supervariant。

### 备用回答

如果有人问“后续是不是完全不再使用 mutation-level data”，更准确的说法是：cluster 成为后续树搜索的基本单位，但它的证据来自先前对 mutation reads 的汇总和转换；它不是凭空得到的一个无数据节点。

---

## 第 10 页｜Supervariant：压缩 cluster

**预计时间：2.2 分钟**

### 讲稿

现在把一个 cluster 内的多个 mutation 压缩成一个 supervariant。这样做的目的很直接：后面的两两比较和树搜索是组合爆炸的，必须减少节点数。

图左边是同一 cluster 中的多个 mutation，它们各自有 \(V\)、\(T\) 和 \(\omega\)。经过转换后，右边变成一个统一的 supervariant，其 \(\omega^*\) 被设为 0.5。

这里最关键的约束是，在不触发 cap 的情况下，转换保持期望 variant reads：\(E[V^*]=N^*\omega^*\phi=N\omega\phi=E[V]\)。

所以这个转换是为了在统一形式下保留最重要的 read expectation，便于后续 pairwise calculation。

但不要把它说成完整 likelihood 的严格等价变换。它保证的是期望 reads；方差、误差结构和完整 likelihood 并不严格相同。

为什么要统一成 \(\omega^*=0.5\)？因为 cluster 内 mutation 可能处在不同 copy-number state，原来的 \(\omega_j\) 不同。如果直接把 variant reads 和 total reads简单相加，它们并不代表同一种“每单位 \(\phi\) 产生 variant read”的机制。先把每个 mutation 换算到一个标准化的二倍体杂合尺度，才可以把多个 mutation 汇总成一个 pseudo-variant。

具体看公式，\(N^*=2N\omega\)，再令 \(\omega^*=0.5\)。两者相乘以后，\(N^*\omega^*=N\omega\)，所以对于相同的 \(\phi\)，期望 variant-read count 不变。\(V^*=\min(V,N^*)\) 则保证 successes 不超过 pseudo-total count；实现中还需要处理整数化。

cluster 中各 mutation 的转换结果随后可以汇总，形成 supervariant 的 pseudo variant reads 与 pseudo total reads。后续算法看到的是一个节点级观测对象，节点数从 mutation 数降到 cluster 数，pairwise 计算从 mutation 数量的平方降到 cluster 数量的平方。

> 【时间不足可跳过】这里保留期望值是核心约束，但不是唯一可能的压缩方案。若原 mutation 的深度、误差率和 \(\omega\) 差异很大，压缩后的一阶矩相同并不意味着 posterior width 相同。因此 supervariant 是面向可计算性的近似摘要；它的好坏也取决于 cluster 内 mutation 是否真的共享 prevalence。

### 转场

有了 supervariant 以后，Pairtree 就可以对任意一对节点问一个更具体的问题：它们在树上可能是什么关系？

---

## 第 11 页｜Pairs Tensor：三种两两关系

**预计时间：2.8 分钟**

### 讲稿

对于两个 distinct supervariants，Pairtree 主要考虑三种关系。

第一种是 \(A\rightarrow B\)：A 是 B 的祖先。因为所有携带 B 的细胞也必须携带 A，所以 \(\phi_A\ge\phi_B\)。

第二种是 \(B\rightarrow A\)，不等式反过来。

第三种是 branching：A 和 B 位于不同分支。若两者的 mutation-bearing cell populations 不重叠，则有 \(\phi_A+\phi_B\le1\)。

右侧把这三种关系画成 \((\phi_A,\phi_B)\) 平面中的可行区域。这里要注意，这些不是从数据直接读出来的标签，而是不同树关系施加的频率约束。

它们依赖无限位点假设，也就是通常不考虑同一 mutation 的反复发生或回突变。如果这些假设被强烈破坏，三种关系就可能不够用。

看右侧频率平面时，横轴和纵轴分别是两个节点的 \(\phi\)。如果 A 是祖先，允许区域位于 \(\phi_A\ge\phi_B\) 的半平面；如果 B 是祖先，则是另一半。数据的 likelihood 如果主要集中在某一侧，对应祖先方向就更有支持。

branching 的约束为什么是两者之和不超过 1？在最简单的无限位点模型中，不同分支的 mutation-bearing cells 不重叠，因此 A 集合和 B 集合的大小之和不能超过全部细胞。当然，在一棵更大树里，它们可能共享一个更早的祖先 mutation，但 A 与 B 这两个特异 mutation 的 carrier populations 仍是分开的。

这三种关系是 exhaustively defined 的局部状态，但它们不是三种直接可观测的 read pattern。比如观察到 \(\phi_A>\phi_B\) 只排斥了部分 B→A 区域，却不能单独区分 A→B 和 branching；如果 \(\phi_A+\phi_B\le1\)，A→B 在频率上也可能仍然可行。真正的 posterior 要比较每个约束区域里总体有多少 likelihood mass。

> 【时间不足可跳过】当存在 mutation loss、parallel evolution、recurrent mutation 或复杂 CNA 时，carrier set 的“包含或互斥”关系可能被破坏。例如祖先 mutation 因缺失而在某个后代中消失，单纯的 \(\phi_A\ge\phi_B\) 就未必可靠。Pairtree 可以把部分冲突 mutation 标记为异常，但三状态关系空间本身仍建立在 ISA-like 假设上。

### 转场

下一页说明，Pairtree 怎样把 reads 转化为这三种关系各自的后验概率。

---

## 第 12 页｜Pairs Tensor：从 reads 到关系后验

**预计时间：3.0 分钟**

### 讲稿

对某一对 supervariants，Pairtree 不会只比较两个点估计的 \(\phi\)。它会在每种关系允许的频率区域 \(\Omega_r\) 内，对 read likelihood 做积分。

换句话说，它会分别计算：如果 A 是 B 的祖先、如果 B 是 A 的祖先、或者如果二者 branching，当前的 read data 在各自允许区域内有多合理。

再结合关系先验，得到 \(P(r\mid D_{AB})\)。右边的 0.62、0.23、0.15 只是示意值；它们表示 tensor 的一个元素是三种关系的概率分布，而不是“这条边已经确定为 A 到 B”。

这里也能回答一个细节问题：mutation reads 确实直接进入 relation evidence 的 likelihood；但 Pairs Tensor 最后保存的是经过积分和归一化之后的关系后验。

可以把这个过程想成三个“受限模型”的竞争。三者使用相同的 supervariant read data，也使用相同的观测模型；区别只在于对 \((\phi_A,\phi_B)\) 允许取值的区域不同。对每个模型，都把区域内所有可能的频率组合积分起来，得到 relation-specific evidence。

积分而不是只比较最佳点，有两个好处。第一，它保留 read depth 带来的不确定性：低覆盖时 likelihood 比较宽，多个关系区域都可能分到概率；第二，它会考虑一个关系有多少可行参数空间，而不是只看某个角落能不能勉强拟合数据。

然后用 Bayes 公式，把 relation prior 与三个 evidence 结合并归一化，得到一个三维概率向量。对所有节点对重复这个过程，就形成一个 tensor：前两个维度索引节点 A、B，第三个维度索引三种 relation。

跨多个 sample 时，同一对节点在每个 sample 都贡献 likelihood。一个样本可能无法区分两个关系，但不同样本中的频率变化会共同收缩允许区域，这正是 multi-sample 设计能够增强 pairwise inference 的原因。

> 【时间不足可跳过】Pairs Tensor 中保存的是局部边缘后验，并不保证不同 pair 之间彼此联合一致。例如 A→B、B→C 各自概率很高，但 A 与 C 的局部结果可能因为噪声偏向另一状态。全局树步骤的必要性就在这里：它要在所有相互冲突的局部倾向之间寻找一棵整体可行的解释。

### 转场

这就引出一个很容易误解的点：有了 Pairs Tensor，是否已经有了最终的树？答案是否定的。

---

## 第 13 页｜Pairs Tensor 在算法中的位置

**预计时间：2.0 分钟**

### 讲稿

Pairs Tensor 的角色是指导，不是决定。

它为每一对 supervariants 提供局部关系倾向，因此 TreeMCMC 在提出新的 parent 或新的节点位置时，会更倾向于与这些关系证据一致的 proposal。

但是得到 candidate tree 之后，模型还要在这棵候选树的全局结构约束下重新拟合 \(\eta\) 和 \(\phi\)，并重新计算整棵树的 read likelihood。

因此这页底下这句话非常重要：pairwise posterior 不等于 final tree posterior。

最终树不是把所有 pairwise score 简单相加得到的。局部证据通过 proposal 影响搜索效率，而全局模型负责判断候选树能否同时解释全部数据。

这页最适合用“地图”和“裁判”作区分。Pairs Tensor 像地图，告诉 MCMC 哪些方向看起来更有希望，减少大量明显不合理的随机移动；global likelihood 才是裁判，决定一棵完整候选树得到多高的后验支持。

为什么不能直接对每一对选择概率最大的关系再拼起来？因为 pairwise MAP relations 可能互相矛盾，也可能不对应任何合法树。树有传递性：如果 A 是 B 的祖先、B 是 C 的祖先，那么 A 必须也是 C 的祖先；每个节点还只能有一个 parent。局部独立选择不会自动满足这些条件。

另一方面，如果 tensor 只用于 proposal，那么它影响的是搜索效率而不是目标 posterior 本身。只要 proposal probability 被正确放进 MH ratio，偏向高概率关系可以让链更快到达好区域，但不能凭空把一个低全局 likelihood 的树变成高 posterior 树。

> 【时间不足可跳过】实际使用时仍要关心 mixing：如果 proposal 过度集中、树空间存在相隔很远的多个 mode，有限长度的链可能没有充分探索。输出 posterior samples 并不自动保证它们已代表完整 posterior，需要多链、收敛或稳定性检查来支撑。

### 转场

下面两页分别看 TreeMCMC 如何提出一棵新树，以及如何决定接受还是拒绝它。

---

## 第 14 页｜TreeMCMC：提出新的树结构

**预计时间：2.2 分钟**

### 讲稿

左边是当前树。一次 MCMC proposal 可以移动一个节点，例如把 C4 从 C2 的下面移动到 C3 的下面，或者更一般地改变局部 parent-child 关系。

中间橙色的虚线表示：Pairs Tensor 认为 C4 与 C3 的关系更符合已有的 pairwise evidence，因此这个位置值得优先尝试。

但“tensor 倾向”不等于“必然移动”。候选位置仍然必须满足树的可行性，例如不能形成环，也要符合频率和祖先关系的基本约束。

右边才是提出后的 candidate tree。此时我们只改变了 topology，下一步还必须重新拟合节点的频率。

一步 proposal 可以理解为先选“要移动谁”，再选“移到哪里”。Pairs Tensor 可以利用 C4 与其他节点的祖先、后代或分支概率，为这两个选择分配更合理的权重。例如，如果 C4 与 C3 的 branching 概率很高，把它放成 C3 的后代就不一定合理；如果 C3→C4 的概率高，把 C3 作为候选 parent 会更自然。

但是一棵树中的关系不只由直接 parent 决定。把 C4 挂到 C3 下方，会同时改变 C4 与 C3 的关系、与 C3 所有祖先的关系，也可能改变与其他分支节点的关系。因此即使 proposal 由某一个局部 tensor entry 触发，产生的仍是一次全局关系变化。

候选树还需要通过拓扑约束检查：不能把节点挂到自己的后代形成 cycle；必须保持 rooted tree；如果有固定的 clonal root 或已知约束，也要保留。通过这些检查，只说明它是一棵合法 topology，还没有说明频率上可行。

> 【时间不足可跳过】MCMC 通常还需要不止一种 move，才能在树空间中保持可达性。这里用单节点 reattach 只是最容易解释的示意。真正重要的是 proposal distribution 可以利用 tensor，却仍要保留从当前状态到其他合法状态的搜索能力。

### 转场

所以 MCMC 的一轮并不是“移动一下就结束”，而是还要在新树上重新解频率并做全局评分。

---

## 第 15 页｜TreeMCMC：拟合频率并接受或拒绝

**预计时间：3.2 分钟**

### 讲稿

给定一棵候选树以后，第一步是在这棵树的约束下拟合 clone frequency，也就是 \(\eta\)。

树结构决定 mutation prevalence 如何由 clone frequency 组成，可以写成 \(\boldsymbol{\phi}=Z\boldsymbol{\eta}\)。这里的 \(Z\) 可以理解为祖先—后代关系矩阵：某个 mutation 的 \(\phi\) 是该节点及其所有后代 clone 的 \(\eta\) 之和。

得到 \(\eta\) 和 \(\phi\) 后，模型用整棵树的 read likelihood 评价候选树。最后再通过 Metropolis-Hastings 的接受率，决定保留这棵新树，还是回到当前树。

这个过程重复很多轮，得到的不是单一优化解，而是一组 tree posterior samples。最终可以从中选一个 consensus tree 进行展示。

所以再总结一次：tensor 负责让搜索更聪明；真正决定候选树去留的是树结构约束下的频率拟合和全局 likelihood。

把一轮完整过程拆开看。第一，proposal 得到新的 topology，也就得到新的祖先矩阵 \(Z\)。第二，在每个 sample 中寻找非负的 \(\eta_s\)，使 \(Z\eta_s\) 产生的 \(\phi_s\) 尽量解释 supervariant reads。第三，把所有节点、所有样本的 read likelihood 合起来，得到这棵树在数据下的评分。

为什么 topology 变了必须重算频率？因为同一组 \(\phi\) 在不同树上对应的 \(\eta\) 不同，甚至可能出现负的 clone frequency。举例来说，如果某个父节点的 prevalence 小于它两个子分支 prevalence 之和，那么父节点剩给自身的 \(\eta\) 会变成负数，这棵树在该 sample 中就不可行，或者只能通过投影把观测频率调整到最近的可行区域。

所谓投影后的 \(\phi/\eta\)，可以理解为：在保留树约束与 \(\eta\ge0\) 的前提下，寻找最能解释 noisy read data 的频率组合。它不是把前面某个 mutation-level \(\hat\phi\) 原封不动塞入树，而是在 candidate topology 下重新优化或积分相关频率参数。

MH 接受率比较新旧状态的目标概率，同时校正 proposal 的正反向概率。新树即使分数稍低，也可能以一定概率被接受，这使链能够越过局部最优；分数明显更高的树通常更容易被接受。重复足够多次并丢弃 burn-in 后，树出现的频率才被用来近似 posterior。

最终展示 consensus tree 时，也不能忘记 posterior 里可能存在多种 topology。共识边代表在样本中出现频率较高的关系；低支持边应被当作不确定性，而不是为了画出一棵整齐的树就强行解释。

> 【时间不足可跳过】这里也说明 TreeMCMC 的评分不是“把 Pairs Tensor 中对应关系的概率全部乘起来”。如果那样做，会重复把局部摘要当作独立证据，并忽略共享频率参数带来的相关性。Pairtree 用 tensor 提 proposal，再用原始或压缩后的 read likelihood 在全局约束下评分，统计角色是分开的。

### 转场

方法部分到这里结束。接下来看看它在模拟和真实数据上到底做到了什么，以及没有做到什么。

---

## 第 16 页｜模拟数据评测

**预计时间：2.5 分钟**

### 讲稿

模拟评测覆盖了 576 组数据，变化了 sample 数量、read depth、mutation 数量和 subclone 数量。论文用的 subclone 规模包括 3、10、30 和 100。

这里评测的不是一个单一指标，而包括能否成功输出树、VAF reconstruction loss、pairwise relationship error 和 tree error 等。

左边的曲线是根据论文结论画出的趋势示意，不应该把它读成精确数值图。它想强调的是：在大约 30 个 subclones 以内，Pairtree 的 VAF 拟合和关系恢复相对较强；当规模增大到 100 个 subclones 时，VAF loss 和 relationship error 都明显变差。

更多互补 sample 通常能提供更多频率约束，因此有助于区分祖先关系。但这并不意味着只要样本多，任意复杂的树都能被稳定恢复。

一个有意思的边界是：当完整 tree search 变难时，Pairs Tensor 的局部 pairwise relation 有时仍有价值。这再次说明，局部关系推断和全局树恢复是两个难度不同的问题。

看这页时要把四类指标分开。success rate 首先反映算法能否在给定规模和资源下完成；VAF loss 反映重建频率能否解释 reads；relationship error 更接近局部祖先、后代、分支判断是否正确；tree error 才评价整个 topology 与真树的差距。一个方法完全可能 VAF 拟合很好，但树关系仍有错误，因为多棵树能够产生相近的频率模式。

subclone 数从 3、10 增加到 30、100 时，困难不只是多了几个节点。pair 数按平方增长，而合法树数量增长得更快；同时每个 clone 分到的 mutation 和频率差异可能更少，局部关系也更难区分。因此 100-clone 条件下性能下降，是统计可辨识性与计算搜索共同造成的。

多样本的价值则取决于“互补性”。如果新增样本只是原来混合比例的重复，它主要增加深度与稳定性；如果亚克隆比例在新样本中发生不同变化，它才真正切开原先重叠的频率模式。所以设计采样时，空间区域、治疗前后和复发时间点可能比简单重复更有信息量。

> 【时间不足可跳过】模拟评测还应追问输入条件是否理想，尤其 \(\omega\) 是否接近 truth、mutation assignment 是否准确。如果只在 oracle correction 下评测，主要证明的是“给定正确观测层时，树推断模块能否工作”；它不能替代端到端评估。对我们的长读长方法，将来最好分别设置 oracle、estimated、perturbed 和 misspecified observation parameters。

### 转场

模拟里 \(\omega\) 等输入可以比较理想。真实数据更重要的问题是：方法表现应当怎样被谨慎解释。

---

## 第 17 页｜真实数据与方法边界

**预计时间：2.5 分钟**

### 讲稿

论文在 14 个 B-progenitor acute lymphoblastic leukemia，也就是 B-ALL 病例上评测 Pairtree。单个病例最多有约 90 个 sample、约 26 个 subclones。

论文报告，在 12 个病例中，Pairtree 的 VAF 拟合达到或超过专家构建的 baseline；幻灯片上用“多数案例”来概括这个结果。

这个结果能说明：在给定 read counts、\(\omega\) 和模型假设的前提下，Pairtree 在真实数据中具有实用性。

但它不能说明真实的 clone tree 已被唯一识别。专家基于 VAF 的树是重要 baseline，却不是独立观测到的生物学真值；更好的 VAF 拟合也不等于每条父子边都被完全验证。

右侧列出了主要边界：\(\omega\) 的外部估计、无限位点假设的违背、混合比例不确定性，以及 CNA/LOH 调用错误，都会改变输入解释，从而影响树。

Pairtree 可以标记一部分与当前树模型不相容的 mutation，例如归为 garbage；但这不等于它已经联合建模了 recurrent mutation、mutation loss 和复杂 copy-number evolution。

这组 B-ALL 数据对 Pairtree 是一个相对有利、但也很有挑战性的场景。有些病例拥有大量 longitudinal samples，同一个患者的亚克隆组成在治疗和复发过程中发生变化，为关系推断提供了互补信息；另一方面，最多约 26 个 subclones 已经进入模拟中较复杂但仍可处理的范围。

“12/14 拟合不差于专家树”首先是一个 posterior predictive 或 reconstruction 层面的结果：自动方法找到的树能够产生与观测 VAF 相容的频率。它证明 Pairtree 不是只在模拟数据中成立，也说明局部引导的 MCMC 能探索到有竞争力的结构。

但生物学验证需要其他证据。例如特定 driver 的时间顺序、单细胞基因型、克隆特异的结构变异、跨时间点的治疗选择轨迹，都可以对边方向提供外部验证。如果缺少这些，VAF fit 更好只能作为模型内支持，不能把某条边称为已被直接证实。

> 【时间不足可跳过】还要留意 model misspecification 的表现：当某些 mutation 无法被任何合法树解释时，把它们放入 garbage 能提高主体树的拟合稳定性，但也可能把真正的复杂生物学事件当作噪声排除。因此 garbage proportion 和被排除 mutation 的功能、CNA 背景，本身也应作为结果检查的一部分。

### 转场

这正好把问题带回我们自己的方向：如果换成三代数据，哪些部分能继承，哪些部分必须重做？

---

## 第 18 页｜对三代数据亚克隆重建的启发

**预计时间：3.0 分钟**

### 讲稿

我认为 Pairtree 对三代数据最值得迁移的，不是原始的 VAF observation model，而是中间这条架构：pairwise evidence 到 relation posterior，再到 global tree search。

在 short-read bulk 的 Pairtree 中，局部关系证据主要来自跨样本的 \(V/T\) 和 \(\omega\) 校正后的频率模式。

而三代数据可能提供更直接的局部证据：同一条 molecule 上是否同时观察到多个 somatic mutation、它们是否处于同一 haplotype，或者是否在不同样本中共同出现。

这有可能增强 pairwise relation 的证据，但不意味着把长 reads 直接塞进 Pairtree 就可以。我们首先需要重建 observation layer，包括长读长错误模型、覆盖度差异、mapping/chimera、allele-specific copy number，以及 \(\omega\) 的不确定性。

另外，长 read 的“同一 molecule 共现”也不应无条件等同于“同一 clone 的谱系关系”。一条 molecule 的跨度、phase 是否完整、是否存在 chimeric read，都需要被模型化。

因此更合理的说法是架构迁移，而不是直接套用。未来的 relation state 也许不止 ancestor、descendant、branching 三种，还可能需要加入同一 molecule、未知跨度或技术冲突等状态。

具体说，长 read 给出的不是一个直接的 clone label，而是一组 molecule-level observations。对一对 mutation，我们可能观察到：同一分子同时携带两者、只携带 A、只携带 B、两者都不携带，或者因为跨度不足根本无法共同判断。把这些计数与测序错误、allelic phase 和覆盖模型结合，才能形成 relation likelihood。

如果大量可靠分子携带 B 时也总携带 A，而存在只携带 A 的分子，就会支持 A 在 B 之前出现；如果分别观察到 A-only 与 B-only haplotypes，并且排除了 phasing 与 copy-number 解释，则会支持 branching。但这里还要区分“两个 mutation 在同一 DNA molecule 上”与“两个 mutation 位于同一个细胞”：前者要求物理距离在 read span 内，后者还可能涉及两条 homologous chromosomes。

这意味着我们可以把 Pairtree 的 Pairs Tensor 概念扩展为多来源 relation tensor：一部分证据来自跨样本 bulk frequency，一部分来自 molecule co-occurrence，一部分来自 haplotype 和 allele-specific CNA。它们在 relation 层汇合，再进入同一个 globally consistent tree search。

三代数据也可能帮助拆解 \(\omega\)：长 reads 对 allele-specific CN、LOH、mutation multiplicity 和 mutation-CNA phasing 提供更多信息。但“提供更多约束”不等于“变成准确真值”。覆盖不均、平台错误、肿瘤纯度和 subclonal CNA 仍然存在，因此更理想的做法是给 \(\omega\) 或其组成部分一个 posterior，再把不确定性传播到关系和树。

> 【时间不足可跳过】在方法设计上，我会优先做两个层次的 baseline。第一层只把 molecule evidence 加到 pairwise relation 上，保持 Pairtree 式 global search；第二层再尝试联合 frequency、copy number 与 tree。这样可以先验证长 read 是否真的提高局部关系识别，再判断复杂的联合模型是否带来额外收益，避免一开始就把所有不确定性揉进一个难以诊断的大模型。

### 转场

最后用三句话回收这篇论文，也把讨论留在我们真正关心的问题上。

---

## 第 19 页｜总结与讨论

**预计时间：1.8 分钟**

### 讲稿

我用三句话总结 Pairtree。

第一，linfreq 把 mutation-level signal 组织成共享 \(\phi\) 模式的 clusters，解决的是从 mutation 到可处理节点的问题。

第二，Pairs Tensor 把局部 read evidence 变成两两关系后验，解决的是“两个节点可能是什么关系”的问题。

第三，TreeMCMC 在全局树约束下搜索和评价候选结构，解决的是“这些局部关系怎样组成同一棵树”的问题。

同时，这篇论文最重要的现实限制也很清楚：bulk 混合下 \(\omega\) 与 \(\phi\) 的不确定性，以及 ISA 等树模型假设，都会限制我们对最终树的确定性解释。

所以对三代数据而言，我倾向于保留 Pairtree 的关系后验和全局树搜索思想，但优先替换 observation layer，直接利用 molecule-level mutation relations。

我想留两个讨论问题。第一，长 reads 的直接共现信息能否替代，或至少补充 VAF-based tensor？第二，能不能把 \(\omega\) 的不确定性真正纳入联合推断，而不是作为一个固定输入？

如果把整篇论文压缩成一条数据链，就是：reads 在给定 \(\omega\) 下约束 \(\phi\)，相似的跨样本 \(\phi\) 模式形成 cluster，cluster 被压成 supervariant，成对 supervariant 产生 relation posterior，最后由全局树约束筛选彼此一致的关系组合。

我认为它最值得借鉴的思想，是明确区分“局部证据”和“全局结构”：局部关系可以不确定，也可以互相冲突；树搜索的任务不是假装这些关系已经确定，而是在保留不确定性的前提下寻找整体解释。

而它留给我们的核心挑战是 observation layer。只要 mutation-bearing cell fraction、copy-number state 与 molecule evidence 之间的映射没有建好，再先进的 tree search 也只能非常精确地拟合一套可能有偏的输入。

> 【时间不足可跳过】因此后续如果我们真做三代亚克隆重建，我会把评测拆成三问：局部 mutation pair relation 是否更准；全局 tree 是否更准；提升究竟来自长分子直接关系，还是来自更好的 CNA/phase/\(\omega\) 估计。这样才能知道 Pairtree 架构中究竟是哪一层被三代数据改善了。

---

## 问答备用稿

### 问题 1｜\(\phi\) 到底是“样本细胞比例”还是“肿瘤内 CCF”？

本报告的记号中，\(\phi\) 指样本全部细胞中携带该 mutation 的比例。肿瘤内 CCF 的分母是全部肿瘤细胞，两者不能不加说明地混用。在简单条件下，如果 purity 为 \(\pi\)，正常细胞不带 mutation，则样本层 \(\phi\) 约等于 \(\pi\) 乘以肿瘤内 CCF。

### 问题 2｜为什么 \(\omega\) 和 \(\phi\) 有循环依赖或不可辨识性？

从 reads 直接观察到的是近似的 \(\omega\phi\)。如果只看 VAF，通常很难区分“较高的携带率配较低的校正项”和“较低的携带率配较高的校正项”。Pairtree 的做法是条件于外部 \(\omega\)，因此真实数据中这部分不确定性并未完全解决。

### 问题 3｜linfreq 是否先算出每个 mutation 的固定 \(\phi\)，再聚类？

不是这个主逻辑。它假设 cluster 内 mutation 共享潜在 \(\phi\)，通过 Beta 先验并积分掉 \(\phi\)，比较不同 assignment 的边际证据。输出主要是 partition，而不是一组已经最终确定的 mutation-level \(\hat{\phi}\)。

### 问题 4｜supervariant 转换是否保持了原始观测模型？

严格来说没有。它在不触发 cap 时保持期望 variant reads，但不严格保持方差、完整 Binomial likelihood 和误差结构。它是为了压缩计算规模的近似，而不是无损统计变换。

### 问题 5｜Pairs Tensor 是否直接决定最终的 tree score？

不是。tensor 的元素是 pairwise relation posterior，主要用于引导 TreeMCMC proposal。候选树仍要在全局树约束下重新拟合 \(\eta/\phi\)，并用全局 read likelihood 加上 MH 接受规则来决定是否保留。

### 问题 6｜三代数据中“同一 molecule 有两个 mutation”是否足以证明它们属于同一 clone？

不足以无条件证明。它是非常有价值的局部证据，但仍受 read span、phase、chimera、mapping 错误和 allele-specific copy number 的影响。更稳妥的做法是把它作为 relation likelihood 的一部分，而不是直接当作确定的谱系边。

### 问题 7｜为什么 VAF 拟合很好，树仍可能是错的？

因为从 topology 和 clone frequency 到 VAF 的映射不是一一对应。不同树可以通过不同的 \(\eta\) 组合产生非常相近的 \(\phi\)，再经过 \(\omega\) 映射得到相近 VAF。VAF loss 主要评价模型能否重现观测，不足以单独证明祖先方向和分支关系正确，因此还需要 relationship error、tree error 或外部生物学证据。

### 问题 8｜Pairs Tensor 已经计算了 pairwise likelihood，TreeMCMC 再算 read likelihood是否重复使用数据？

只要 tensor 仅用于构造并校正 proposal，就不是把同一证据在目标 posterior 中重复乘两次。它利用数据选择更有希望的移动方向，而 MH 接受步骤仍以全局目标分布评分，并包含 proposal probability 的校正。若直接把 tensor score 又乘进目标 likelihood，才会产生需要警惕的重复计数问题。

### 问题 9｜Pairtree 输出 consensus tree，是否意味着后验只有一棵树？

不是。MCMC 的自然输出是一组 posterior tree samples。consensus tree 是为了展示而做的摘要，可能隐藏多个 topology mode，也可能包含边际支持度不同的边。严谨报告时应同时给出关键边支持度、替代树或 pairwise uncertainty，而不只展示一棵整齐的共识树。

### 问题 10｜长读长是否能彻底解决 bulk mixture？

不能。长 reads 增加的是单分子跨度与 phasing 信息，但 bulk 中仍混合多个细胞、多个 homolog 和可能的 subclonal CNA；低覆盖也限制了稀有 clone。它更可能显著增强部分局部关系，而不是自动给每条 read 或每个 mutation一个完整 clone label。

---

## 汇报时的最后检查

- 第 5–7 页连续出现 \(\omega\)、\(\phi\)、\(\eta\)，放慢语速，避免一次讲完所有符号。
- 第 9、10、12、15 页有公式；只解释公式的角色，不逐项推导。
- 第 16 页的曲线是趋势示意，不报图上不存在的精确数值。
- 第 17 页可报告 12/14，但要立即补上“VAF 拟合不等于真实树真值”。
- 第 18、19 页要明确区分“可迁移架构”和“尚未解决的三代 observation model”。
- 若需压缩到 30 分钟，优先删除所有“时间不足可跳过”段落；不要跳过第 5–7 页的符号定义或第 13–15 页的“tensor 只引导、全局 likelihood 评分”。
- 第 6 页当前视觉示意把最终 VAF 0.2 与 \(\omega\) 混在了一起。若保留 \(E[\mathrm{VAF}]=\omega\phi\) 且 \(\phi=0.5\)，应将 \(\omega\) 改为 0.4，并写成 \(0.4\times0.5=0.2\)。
