# A Structure Self-Aware Model for Discourse Parsing on Multi-Party Dialogues

论文地址：https://www.aminer.cn/pub/60da8fc20abde95dc965f7f0/a-structure-self-aware-model-for-discourse-parsing-on-multi-party-dialogues

## 0. Summary
This paper introduces a "Structure Self-Aware Model for Discourse Parsing on Multi-Party Dialogues." The feature of this model is its edge-centric approach (in this task, an edge refers to an EDU pair). It updates the information of the EDU pair layer by layer, which avoids error propagation caused by using historical prediction information during the training process. Additionally, the model uses structural distillation to enhance its expressive power, achieving better performance. This is the first paper to use Graph Neural Networks (GNN) in the discourse parsing task, making it worth referencing.
## 1. Research Objective
The research objective of this paper is to address the issue of error propagation found in previous work and to find an edge-centric GNN approach to improve the performance of discourse parsing tasks.
## 2. Method
Model overview:
![](https://pic.imgdb.cn/item/653250c7c458853aefab33e8.png)
From the picture, we can see that the entire model can be divided into 3 parts:
### 2.1 Hierarchical GRU
The paper first employs a hierarchical GRU consisting of two bidirectional GRUs.
The first bidirectional GRU takes each EDU, denoted as $x_i$, as its input and generated a local EDU representation $h_i$. 
The second bidirectional GRU operates on the sequence $h^l_0,h^l_1,\dots,h^l_n$  to derive global, context-aware EDU representations for the dialogue, represented as $H^g = [h^g_0,h^g_1,\dots,h^g_n]$.
### 2.2 SSA-GNN
In the SSA-GNN stage, the primary features consist of  the node representation $u_i$ and the representation of each EDU pair $(x_i, x_j)$, denoted as $r_{ij}$.
The principal objective of the SSA-GNN is to learn the implicit structural information within the input dialogue. Furthermore, the SSA-GNN is an edge-centric GNN.
Let's first take a look at the update equation for this part:
the node representation:
![](https://pic.imgdb.cn/item/65325100c458853aefabfcfc.png)
The paper perform **Structure-Aware($r_{ij}$) Scaled Dot-Product Attention ($\alpha_{ij}$)operation** to update the node hidden states. 
The paper directly use $H^g$ as the initial node representation $u^{(0)}$.
Meanwhile, the paper adopt a **GRU-style gating mechanism** to update the edge representation $r^{(t)}_{ij}$:
![](https://pic.imgdb.cn/item/6532511fc458853aefac6639.png)
The paper form the initial vector representations $r^{(0)}_{ij}$ by concatenating three learnable embeddings:
+ $s_{ij}$: indicating whether $x_i$ and $x_j$ are from the same speaker.
+ $t_{ij}$: meaning whether $x_i$ and $x_j$ are continuous utterances of the same speaker.
+ $d_{ij}$: denoting the relative distance between $x_i$ and $x_j$.
It's worth noting that the edge-centri characteristics of the SSA-GNN model proposed in the paper are reflected in the fact that all relevant information in the data ultimately gets aggregated into $r_{ij}$. Furthermore, in subsequent steps like link prediction and relation classification are made based on the edge representation.
### 2.3 Link Prediction & Relation Classification
During T times of the updating process in SSA-GNN, the top-layer hidden state will be used for conversational discourse parsing.
For each EDU $x_j$ precedes $x_i$ in the dialogue, the paper adopts $\widehat{R_{i,j}}=[r^{(T)}_{ij};r^{T}_{ji}]$. This concatenated vector of $r^{T}_{ij}$ and $r^{T}_{ji}$ is the used to conduct link prediction and relation classification.

### 2.4 Loss Function
The desigh of the loss function in this paper is also worth noting.
Given the traing data $D$, the training objective is designed like this:
!()[https://pic.imgdb.cn/item/6532516dc458853aefad6dda.png]
#### 2.4.1 Discourse Parsing Loss $L_{ce}$
the $L_{ce}$ is the standard loss term of conversational discourse parsing based on cross entropy, which meant to gurantee the acurracy of link prediction and relation classification.
![](https://pic.imgdb.cn/item/6532516dc458853aefad6e35.png)
#### 2.4.2 Relation Recognition Loss $L_{cls}$ 
The $L_{cls}$ is designed to make the edge hidden states of every layer can effectively capture all discourse relations. In short, the aim is to enhance the information-gathering capability of each layer in the model:
![](https://pic.imgdb.cn/item/6532516dc458853aefad6e80.png)
where $T$ is the layer number of SSA-GNN.
**Why did the author set up such a loss function?** Because the standard loss function $L_{ce}$ needs to be propagated to the last layer before any backpropagation occurs to update the parameters, which may result in weaker "supervision" for the earlier layers. In contrast, this function directly participates in the supervision of each layer, thereby optimizing the parameter updates for each layer more effectively.
#### 2.4.3 Structure Distillation Loss $L_{skd}$
Method:
Utilize a structure-aware **teacher model** to enhance the training effectiveness of the student model(our model).

Features:
1. The teacher model takes the entire dialogue and all "gold standard" relations, except for the one being predicted, as additional inputs.
2. **Why use a Teacher Model?**：The standard loss function $L_{ce}$ may weaken the "supervision" of the earlier layers during backpropagation to update parameters. Using a teacher model allows for more direct involvement in the supervision of each layer.
![](https://pic.imgdb.cn/item/6532516dc458853aefad6ef9.png)
## 4. Evaluation
### 4.1 Baselines
+ **DeepSequential**
+ **DeepSequential(NS)** that does not use any features from already predicted discourse structures
+ **DeepSequential(Share)**
+ **HGRU**
Results:
![](https://pic.imgdb.cn/item/6532516cc458853aefad6d77.png)
### 4.2 Abation Study
+ **HGRU+SSA(FixEdgeRep)**
+ **HGRU+SSA(NodeRep)**
+ **HGRU+SSA(ShareEdgeRep)**
+ **HGRU+SSA+$L_*$**
+ **HGRU+SSA(Teacher)**

![](https://pic.imgdb.cn/item/653251bdc458853aefae7cec.png)

## 5. Notes
+ The edge-centric SSA-GNN used in this paper has been enlightening for me, as it takes a unique approach—using edge representation for link prediction and relation classification. In previous research, the focus has often been node-centric, relying on information between nodes for processing. Perhaps there are even more hidden advantages to this edge-based approach? It's something worth exploring.

+ Traditional node-centric methods only perform backpropagation after the final layer, which weakens the supervision of prior information and also leads to layer-by-layer error propagation. The method in this paper avoids this situation by utilizing a loss function and an edge-centric mechanism.

> [!note]+ Teacher Model
> The Teacher model is a pre-trained, high-performing model that serves to guide or "teach" another (usually simpler) model, known as the "student model." Through a process called knowledge distillation, the teacher model can transfer information to the student model. Compared to the student model, the teacher model often has access to more data or has a more complex structure. By leveraging the knowledge distillation from the teacher model, the student model can achieve sufficient performance while being more lightweight.

> [!note]+ **Ablation Study**
> Ablation experiments involve removing certain parts of a model or altering specific settings one by one to observe how these changes impact the model's performance. The purpose is to better understand which components or settings are crucial for the model's effectiveness.


