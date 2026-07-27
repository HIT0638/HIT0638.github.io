---
title: 公式渲染测试
date: 2026-07-27
summary: 用一组常见公式检查文章页的数学排版。
draft: false
---

这是一篇用于验收公式渲染的测试文章。下面同时测试行内公式和独立公式。

## 行内公式

爱因斯坦的质能关系可以写成 $E = mc^2$。行内公式应该和这句话自然地排在同一行。

## 分式、根号与指数

$$
f(x) = \frac{1}{\sqrt{2\pi\sigma^2}}
\exp\left(-\frac{(x-\mu)^2}{2\sigma^2}\right)
$$

## 积分与求和

$$
\int_0^1 x^2\,dx = \frac{1}{3}
$$

$$
\sum_{i=1}^{n} i = \frac{n(n+1)}{2}
$$

## 矩阵

$$
A =
\begin{bmatrix}
1 & 2 \\
3 & 4
\end{bmatrix}
$$

## 多行推导

$$
\begin{aligned}
f(x) &= (x+1)^2 \\
     &= x^2 + 2x + 1
\end{aligned}
$$

## 分段函数与条件

$$
|x| =
\begin{cases}
x, & x \ge 0, \\
-x, & x < 0.
\end{cases}
$$

## 概率与优化符号

$$
P(A \mid B) = \frac{P(B \mid A)P(A)}{P(B)},
\qquad
\theta^\ast = \operatorname*{arg\,min}_{\theta} \mathcal{L}(\theta)
$$
