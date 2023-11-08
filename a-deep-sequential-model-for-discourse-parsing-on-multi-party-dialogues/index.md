# A Deep Sequential Model for Discourse Parsing on Multi-Party Dialogues


论文地址：[A Deep Sequential Model for Discourse Parsing on Multi-Party Dialogues](https://arxiv.org/abs/1812.00176)

## 0. Summary
This paper introduces a deep sequential model to address some limitations of existing methods in discourse parsing for multi-party dialogues. These limitations arise from the pipeline framework commonly employed in previous studies. On one hand, the pipeline framework lacks global information, affecting the probability estimation for each dependency relation between two EDUs. On the other hand, separating the steps of dependency prediction and dialogue structure construction inhibits information sharing between them, leading to suboptimal model performance. To mitigate these issues, the deep sequential model employs GRUs to obtain both local and global representations of EDUs. Coupled with the Speaker Highlighting Mechanism, this model achieves state-of-the-art performance in link prediction and relation classification compared to prior work.
## 1. Research Objective
This paper introduces a deep sequential model to address certain limitations of existing methods in discourse parsing for multi-party dialogues. This model focuses on the global information of EDUs and highlights the speaker for each utterance.
## 2. Backgroud and Problems
Background: In Natural Language Processing (NLP), discourse parsing is a crucial task. It helps in understanding the dependencies and structures within multi-party dialogues. These dependencies and structures aid various NLP tasks such as machine translation, question-answering systems, and so on.

Problems:
1. How to accurately parse dependencies and structures in multi-party dialogues?
2. How to utilize both local information (current dialogue units) and global information (the overall dialogue structure) for prediction?
3. How to improve the performance of dependency parsing in multi-party dialogues?
## 3. Method
### 3.1 Overview
Model overview:
![](https://pic.imgdb.cn/item/652d01dbc458853aef6c4a71.png)

1）The model computes the non-structure representations of EDUs using hierarchical Gated Recurrent Unit(GRU) encoders.

2）Next, the model makes a sequential scan of the EDUs and do the following steps：

2.1）Link prediction：The model computes a score between the current EDU $u_i$ and each linking candidate $u_j$ (j < i) using an MLP.
These scores are the converted into probabilitis distributed over the previous EDUs using softmax. The EDU with the highest probability is selected as the linked EDU.

2.2）Relation classification：After identifying the link for current EDU $u_i$, 
the model performs relation classification to predict the relation type between $p_i$(the parents of $u_i$) and $u_i$ using a relation classifier.
Similar to link predition, both non-sturcture and structured representations are used.

2.3）Structured representation encoding：After determining the link of current EDU $u_i$ between $u_j$ and the relation type of the link,  the relation embedding $r_{ji}$, the non-structure representation of $u_i$, and the strtuctured representation of $p_i = u_j$ are fed into the encoder to derive the strcture representation of $u_i$.
### 3.2 Details
#### 3.2.1 Local representations and non-structured global representations
The first step involves the local representations and non-structure global representations.
In the case of local representations, the paper employs a bidirectional GRU encoder to process the word sequence, ultimately yielding the local representation $u_i$, denoted as $h_i$.
In the case of non-structure global representations, a GRU is applied to the local representations of the EDUs $h_0,h_1,...,h_n$, and the resulting hidden states serve as the non-structure global representations of the EDUs, denoted as $g^{NS}_0,g^{NS}_1,\dots,g^{NS}_n$.
#### 3.2.2 Structured global representation
There are two key points to note:
1. The derivation of the Structured Global Representation (SGR) for an EDU is carried out by a structure encoder along the development path of the predicted dependency tree for that EDU, for example, $u_0​→u_1​→u_2​→u_4​$. The encoder operates along this path, and the final hidden layer for $u_4$​ is considered its structured representation.
2. In this paper, the authors introduce a mechanism called the Speaker Highlighting Mechanism (SHM) to optimize the generation of SR. This mechanism is similar to the attention mechanism but simpler. The idea behind this mechanism is to enhance the influence of a particular speaker on the current utterance by highlighting a previous utterance along the dependency tree's generative path. This is akin to allocating more attention in the attention mechanism, thereby optimizing the model's predictions."

the function of structured representation as follows:
![](https://pic.imgdb.cn/item/652d01e6c458853aef6c657d.png)
$g^S_{0,a}$ is set to zero vector since the dummy root contains no real infomation.

> The paper places the steps for obtaining SGR (Structured Global Representation) before those for Link Prediction and Relation Classification. This is done to introduce the concept of SHM (Speaker Highlighting Mechanism). However, upon examining the formulas, it becomes evident that the acquisition of SGR requires information about the current EDU's related relations. Therefore, in actual implementation, Link Prediction and Relation Classification precede the calculation of Structured Representation. Although the processing of links and relations requires structural information obtained from SHM, this information pertains to previous nodes, not the current node's Structured Representation. The SGR for the root node is set as a zero vector, thus ensuring that the computational dependencies among various variables are satisfied
### 3.2.3 Link prediction and Relation Classification
By integrating previous useful information, the authors obtain a new input vector that serves as the input for both the link predictor and the relation classifier.
![](https://pic.imgdb.cn/item/652d02b4c458853aef6e2d5a.png)
Taking $H_{i,<i}(H_{i,<i}=H_{i,0},\dots,H_{i,i-1})$ as input, the link predictor estimates the probability thar each $u_j(j<i)$ is the parent of $u_i$ on the dependency tree. The relation classifier the predicts the relation type between $u_j$ and $u_i$, if $u_j$ is the predicted parent of $u_i$.

The processes of link prediction and relation classification are quite similar. Both involve a single hidden layer followed by a softmax operation, with the outcome having the highest probability being selected as the result. For detailed formulas pertaining to these processes, please refer to the paper.

## Notes
What I gained from this paper is the exposure to a potential neural network architecture for the task of multi-party dialogue parsing. Additionally, the similarities between the SHM (Speaker Highlighting Mechanism) and the Attention mechanism in Transformers have deepened my understanding of the steps involved in neural network-based task processing.

