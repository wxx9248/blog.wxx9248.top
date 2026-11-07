---
title: 浅谈浮点数标准：IEEE 754
date: 2021-07-16
tags: [浮点数, IEEE 754]
---

## 0x00 前言

大一的时候在数字系统（Digital Systems）这门课学了有符号整数、无符号整数和浮点数在计算机内部的表示。其中浮点数的表示方法稍微复杂一点，一般遵循IEEE 754标准的定义。我们在C/C++、Java、C#、Python等语言中使用的浮点数就是这样。

IEEE 754主要定义了5个方面的标准：

1. [算术格式](#算术格式)：一系列二进制和十进制浮点数的标准，包括正/负0、非规格化数、无穷、非数（NaN）等；
1. [编码格式](#编码格式)：对浮点数的高效编码、存储和传输；
1. [舍入规则](#舍入规则)：浮点数在计算和转换时的舍入问题；
1. [算符](#算符)：算术运算符以及一些其他的算符（例如：三角函数等）；
1. [异常处理](#异常处理)：出现异常（例如：被0除、溢出等）时的处理方法；

我们将在下面一一讨论。

## 0x01 朝花夕拾

### 科学计数法

所有的实数都可以表示成为如下形式：

$$
f = \text{mantissa} \times \text{base} ^ \text{exponent}
$$

其中，各个记号的含义是：

| 记号              | 含义                                                   |
| ----------------- | ------------------------------------------------------ |
| $\text{mantissa}$ | 尾数，$\|\text{mantissa}\| < \text{base}$              |
| $\text{base}$     | 基数，为正整数，就是计数系统的基数（二进制、十进制等） |
| $\text{exponent}$ | 指数，为整数                                           |

### 二进制实数转十进制

设有一实数$f$，其整数部分有$n$位，小数部分有$m$位，那么：

$$
f = \sum_{i = -m} ^ {n - 1}f_{2_i} 2 ^ i
$$

其中，$f_{2_i}$表示$f$在二进制表示下的第$i$分位（即第$i$位的权重）。

栗子：

$$
(10.1101)_2 = 1 \times 2 ^ {-4} + 0 \times 2 ^ {-3} + 1 \times 2 ^ {-2} + 1 \times 2 ^ {-1} + 0 \times 2 ^ 0 + 1 \times 2 ^ {1} = 2.8125
$$

### 十进制实数转二进制

- 整数部分：除二取余，逆序排列
- 小数部分：乘二取整，正序排列

栗子：将$12.125$表示为二进制：

整数部分：

$$
\begin{aligned}
12 &= 2 \times 6 + \textbf{0} \\
6 &= 2 \times 3 + \textbf{0} \\
3 &= 2 \times 1 + \textbf{1} \\
1 &= 2 \times 0 + \textbf{1} \\
\end{aligned}
$$

则$12 = (1100)_2$。

小数部分：

$$
\begin{aligned}
0.125 \times 2 &= \textbf{0}.25 \\
0.25 \times 2 &= \textbf{0}.5 \\
0.5 \times 2 &= \textbf{1}.0
\end{aligned}
$$

则$0.125 = (0.001)_2$。

合并

$$
12.125 = (1100.001)_2
$$

## 0x02 标准介绍

### 算术格式

在IEEE 754标准中，一个浮点数可以被以下的参数描述：

- 基数$b$，$b = 2$或$b = 10$，即使用二进制或十进制表示一个浮点数；
- 精度$p$；
- 指数范围$[e_{\text{min}}, e_{\text{max}}]$，在标准中$e_{\text{min}} = 1 - e_{\text{max}}$；

浮点数包含：

- [普通浮点数](#普通浮点数)，包括±0；
- 两种无穷大：正和负；
- 两种非数（NaN）：静默NaN（Quiet NaN, qNaN）和信号NaN（Signaling NaN, sNaN）；
  - qNaN不会引发任何响应；
  - sNaN一般会在浮点处理器（FPU）中引发异常。浮点异常在*nix系统中的典型表现为对进程发出`SIGFPE`信号。

#### 普通浮点数

注意：此节开始，我们仅讨论**二进制**浮点数的表示。十进制浮点数因为不适用于计算机内部表示，在此不予讨论。

为了方便表示在计算机里，IEEE对科学计数法进行了修改，一个浮点数可以表示为如下形式[^1]：

$$
f = (-1) ^ {\text{sign}} \times (1 + \text{fraction}) \times 2 ^ {\text{exponent} - \text{bias}}
$$

各个记号的含义是：

| 记号                            | 含义                                                                            |
| ------------------------------- | ------------------------------------------------------------------------------- |
| $\text{sign}$                   | 符号位，为$0$或者$1$                                                            |
| $\text{fraction}$               | 分数值，为二进制小数中小数点后面的部分                                          |
| $\text{exponent}$               | **有**偏移指数（Biased Exponent），又称阶码，为正整数，是存储浮点数时使用的指数 |
| $\text{bias}$                   | 指数偏移，与浮点数的精度有关                                                    |
| $\text{exponent} - \text{bias}$ | 称为无偏移指数，是实际计算中使用的指数                                          |

同时，有以下规定：

设精度为$p$，将浮点数写成$(-1) ^ {\text{sign}} \times c \times 2 ^ q$的形式，其中$c$是一个$p$位的二进制整数，$q$是指数的值，则$q + p - 1 \in [e_{\text{min}}, e_{\text{max}}]$，即$q \in [e_{\text{min}} + 1 - p, e_{\text{max}} + 1 - p]$。

[^1]: 在实际编码时，$\text{fraction}$前面的数（即整数部分）的值可以为1（[规格化浮点数](#规格化浮点数)），也可以为0（[非规格化浮点数](#非规格化浮点数)）。

### 编码格式

#### 基本内存布局

一个浮点数在内存中有三个域（field），分别为：

1. 符号位（$\text{sign}$）
1. 阶码（$\text{exponent}$）
1. 分数值（$\text{fraction}$）

图示如下：\
![图源：Charles Esson, Wikipedia, https://commons.wikimedia.org/w/index.php?curid=3356830](/assets/ieee-754/General_floating_point_frac.svg)

各个记号的含义是：

| 记号 | 含义         |
| ---- | ------------ |
| $f$  | 分数值域长度 |
| $e$  | 阶码域长度   |

> 注：在二进制浮点数下，$e_{\text{max}} = 2 ^ {e - 1} - 1$。

#### 规格化浮点数

规格化（Normalized）浮点数需要满足下列条件：

- 浮点数使用科学计数法表示时，整数部分必须为$(1)_2$；
- 阶码需要在$(0, 2 ^ e - 1)$区间内，即无偏移指数在$(-2 ^ {e - 1} + 1, 2 ^ {e - 1})$区间内。

规格化后的分数值称为有效数字（significand）。规格化浮点数的指数偏移值为$\text{bias} = 2 ^ {e - 1} - 1$。规格化浮点数在用科学计数法表示时，尾数在$[1, 2)$的区间内。

例如，我们想要规格化$(1101.01)_2$：

1. 先将整数部分变成1，按科学计数法写为$(1.10101)_2 \times 2 ^ 3$

   多提一嘴，$(1.10101)_2$就是科学计数法的尾数（$\text{mantissa}$），不要和IEEE 754中的分数位（$\text{fraction}$）搞混。

1. 取得分数值$\text{fraction} = (10101)_2$；
1. 取得无偏移指数为$\text{exponent} - \text{bias} = 3 = (11)_2$，计算阶码得$\text{exponent} = (11)_2 + 2 ^ {e - 1} - 1$，$e$值待定。

#### 非规格化浮点数

非规格化浮点数有以下特征：

- 阶码$\text{exponent} = 0$
- 分数值$\text{fraction} \neq 0$

一般当一个浮点数非常接近0时（阶码部分达到0），才使用非规格化浮点数来表示。

非规格化浮点数在用科学计数法表示时，尾数在$(0, 1)$的区间内。推论：所有的非规格化浮点数的绝对值都小于所有规格化浮点数的绝对值。

非规格化浮点数的指数偏移值为$\text{bias} = 2 ^ {e - 1} - 2$，比规格化浮点数的偏移值小1。

#### 特殊值

| 条件                                                              | 说明                                                           |
| ----------------------------------------------------------------- | -------------------------------------------------------------- |
| $\text{exponent} = \text{fraction} = 0$                           | 此浮点数为0，符号由$\text{sign}$确定                           |
| $\text{exponent} = 2 ^ e - 1 \text{ and } \text{fraction} = 0$    | 此浮点数为无穷大（$\infty$），符号由$\text{sign}$确定          |
| $\text{exponent} = 2 ^ e - 1 \text{ and } \text{fraction} \neq 0$ | 此浮点数表示NaN；$\text{fraction}$的最高位为1是qNaN，为0是sNaN |

#### 可交换格式

| 名称        | 常见名称     | 有效长度 | 阶码域长度 | $e_{\text{min}}$ | $e_{\text{max}}$ |
| ----------- | ------------ | -------- | ---------- | ---------------- | ---------------- |
| `binary16`  | 半精度浮点数 | 11       | 5          | -14              | 15               |
| `binary32`  | 单精度浮点数 | 24       | 8          | -126             | 127              |
| `binary64`  | 双精度浮点数 | 53       | 11         | -1022            | 1023             |
| `binary128` | 四精度浮点数 | 113      | 15         | -16382           | 16383            |
| `binary256` | 八精度浮点数 | 237      | 19         | -262142          | 262143           |

注：有效长度 = 隐含的整数位（1位）+ 分数值域长度。

##### 单精度浮点数（32位）

从最高位到最低位的布局为：

- 符号位：1 bit
- 有偏移指数：8 bits
- 分数值：23 bits

图示如下：
<div style="width: 100%; overflow-x: auto;">
    <table style="white-space: nowrap;">
        <thead>
            <tr>
                <td style="text-align: center;">Layout</td>
                <td style="text-align: center;">Sign</td>
                <td colspan="8" style="text-align: center;">Biased Exponent</td>
                <td colspan="23" style="text-align: center;">Fraction</td>
            </tr>
        </thead>
        <tbody>
            <tr>
                <td style="text-align: center;">n-th Bit</td>
                <td style="text-align: center;">31</td>
                <td style="text-align: center;">30</td>
                <td style="text-align: center;">29</td>
                <td style="text-align: center;">28</td>
                <td style="text-align: center;">27</td>
                <td style="text-align: center;">26</td>
                <td style="text-align: center;">25</td>
                <td style="text-align: center;">24</td>
                <td style="text-align: center;">23</td>
                <td style="text-align: center;">22</td>
                <td style="text-align: center;">21</td>
                <td style="text-align: center;">20</td>
                <td style="text-align: center;">19</td>
                <td style="text-align: center;">18</td>
                <td style="text-align: center;">17</td>
                <td style="text-align: center;">16</td>
                <td style="text-align: center;">15</td>
                <td style="text-align: center;">14</td>
                <td style="text-align: center;">13</td>
                <td style="text-align: center;">12</td>
                <td style="text-align: center;">11</td>
                <td style="text-align: center;">10</td>
                <td style="text-align: center;">9</td>
                <td style="text-align: center;">8</td>
                <td style="text-align: center;">7</td>
                <td style="text-align: center;">6</td>
                <td style="text-align: center;">5</td>
                <td style="text-align: center;">4</td>
                <td style="text-align: center;">3</td>
                <td style="text-align: center;">2</td>
                <td style="text-align: center;">1</td>
                <td style="text-align: center;">0</td>
            </tr>
        </tbody>
    </table>
</div>

##### 双精度浮点数（64位）

从最高位到最低位的布局为：

- 符号位：1 bit
- 指数：11 bits
- 分数值：52 bits

图示如下：
<div style="width: 100%; overflow-x: auto;">
    <table style="white-space: nowrap;">
        <thead>
            <tr>
                <td style="text-align: center;">Layout</td>
                <td style="text-align: center;">Sign</td>
                <td colspan="11" style="text-align: center;">Biased Exponent</td>
                <td colspan="52" style="text-align: center;">Fraction</td>
            </tr>
        </thead>
        <tbody>
            <tr>
                <td style="text-align: center;">n-th Bit</td>
                <td style="text-align: center;">63</td>
                <td style="text-align: center;">62</td>
                <td style="text-align: center;">61</td>
                <td style="text-align: center;">60</td>
                <td style="text-align: center;">59</td>
                <td style="text-align: center;">58</td>
                <td style="text-align: center;">57</td>
                <td style="text-align: center;">56</td>
                <td style="text-align: center;">55</td>
                <td style="text-align: center;">54</td>
                <td style="text-align: center;">53</td>
                <td style="text-align: center;">52</td>
                <td style="text-align: center;">51</td>
                <td style="text-align: center;">50</td>
                <td style="text-align: center;">49</td>
                <td style="text-align: center;">48</td>
                <td style="text-align: center;">47</td>
                <td style="text-align: center;">46</td>
                <td style="text-align: center;">45</td>
                <td style="text-align: center;">44</td>
                <td style="text-align: center;">43</td>
                <td style="text-align: center;">42</td>
                <td style="text-align: center;">41</td>
                <td style="text-align: center;">40</td>
                <td style="text-align: center;">39</td>
                <td style="text-align: center;">38</td>
                <td style="text-align: center;">37</td>
                <td style="text-align: center;">36</td>
                <td style="text-align: center;">35</td>
                <td style="text-align: center;">34</td>
                <td style="text-align: center;">33</td>
                <td style="text-align: center;">32</td>
                <td style="text-align: center;">31</td>
                <td style="text-align: center;">30</td>
                <td style="text-align: center;">29</td>
                <td style="text-align: center;">28</td>
                <td style="text-align: center;">27</td>
                <td style="text-align: center;">26</td>
                <td style="text-align: center;">25</td>
                <td style="text-align: center;">24</td>
                <td style="text-align: center;">23</td>
                <td style="text-align: center;">22</td>
                <td style="text-align: center;">21</td>
                <td style="text-align: center;">20</td>
                <td style="text-align: center;">19</td>
                <td style="text-align: center;">18</td>
                <td style="text-align: center;">17</td>
                <td style="text-align: center;">16</td>
                <td style="text-align: center;">15</td>
                <td style="text-align: center;">14</td>
                <td style="text-align: center;">13</td>
                <td style="text-align: center;">12</td>
                <td style="text-align: center;">11</td>
                <td style="text-align: center;">10</td>
                <td style="text-align: center;">9</td>
                <td style="text-align: center;">8</td>
                <td style="text-align: center;">7</td>
                <td style="text-align: center;">6</td>
                <td style="text-align: center;">5</td>
                <td style="text-align: center;">4</td>
                <td style="text-align: center;">3</td>
                <td style="text-align: center;">2</td>
                <td style="text-align: center;">1</td>
                <td style="text-align: center;">0</td>
            </tr>
        </tbody>
    </table>
</div>

### 舍入规则

IEEE 754定义了5种舍入规则，前两种为就近舍入，其他三种称为方向舍入。

#### 就近舍入

- 偶数优先就近舍入（Ties to Even）：舍入到最近的一个数，但当存在距离原数距离相等的两个数时，取其中的偶数（二进制中以0结尾的）。默认采用此方法进行舍入；
- 远离0就近舍入（Ties Away from Zero）：舍入到最近的一个数，但当存在距离原数距离相等的两个数时，如果原数为正，则舍入到比原数大的那一个数；如果原数为负，则舍入到比原数小的那个数。

#### 方向舍入

- 向0舍入（Round toward $0$）：又称截断（truncate）；
- 向正无穷舍入（Round toward $+\infty$）：又称向上舍入（ceiling）；
- 向负无穷舍入（Round toward $-\infty$）：又称向下舍入（floor）。

### 算符

IEEE 754规定了一些浮点数可以进行的运算：

1. 算术运算（四则、平方根、乘积累加、幂、取余、三角函数等）；
   - 规定$\sqrt{-0.0} = -0.0$
   - 规定余数$\text{remainder}(x, y) = x - (\text{round}(x / y) \cdot y)$
1. 转换操作（各个浮点格式之间的转换、浮点数转换到字符串、字符串转换到浮点数等）；
1. 符号操作（绝对值、取负等）；
   - $\text{copysign}(x, y)$返回$y$的符号和$x$的非符号部分的结合，对NaN有效
   - $-x$将$x$的符号反转。当$x$是$\plusmn 0$或NaN时，含义不同于$0 - x$
1. 比较和排序；
   - 规定$+0.0 = -0.0$、$-\text{inf} = -\text{inf}$、$\text{inf} = \text{inf}$、NaN和任何数（包括NaN）的比较，除了`!=`为真以外都为假。所以检测NaN可以使用`x != x`来判断，也可以用`isnan(x)`判断；`isunordered(x, y)`检测`x`与`y`是否无法比较（例如其中有一个是NaN）
   - -inf < 负的规格化浮点数 < 负的非规格化浮点数 < 0.0 < 正的非规格化浮点数 < 正的规格化浮点数 < inf
   - $x <> y \equiv x < y \text{ or } x > y$，注意与$x \neq y$的区分
1. 分类和检测；
   - `class(x)`返回`x`的类别：sNaN、qNaN、inf、0.0，规格化或非规格化，符号等
   - `isfinite(x)`判断`x`是否有限
1. 其他操作；

### 异常处理

IEEE 754定义了5种必须处理的异常：

1. 无效操作：未定义的数学运算（例如对负数开平方），默认返回qNaN。
1. 被0除：默认返回`inf`，符号由被除数和除数的符号共同决定（例如$1 / -0.0 = -\infty$）。
1. 上溢出：结果浮点数绝对值太大，指数无法保存（超过$e_{\text{max}}$）。默认返回`inf`，符号由原浮点数的符号决定。
1. 下溢出：结果浮点数绝对值太小，指数无法保存（低于$e_{\text{min}}$）。默认返回非规格化表示，或者过于小则返回0。
1. 精度丢失：结果浮点数有效数字太长，无法按原精度表示结果。默认返回舍入后结果。

## 0x03 实操练习

注意：

- 我使用x86架构的机器，amd64扩展，所以以下部分讨论的字节序均为**小端序**。
- 我使用的C编译器为：`gcc version 10.2.0 (Rev10, Built by MSYS2 project)`，`float`类型长32位，`double`类型长64位。

我使用以下的测试程序进行实验：

```c title="IEEE754.c"
#include <stdio.h>
#include <inttypes.h>
#include <errno.h>
#include <math.h>

#define ENABLE_VALUE_INPUT

typedef union
{
    float value;
    uint8_t byte[sizeof (float)];
} FloatUnion;

typedef union
{
    double value;
    uint8_t byte[sizeof (double)];
} DoubleUnion;

int main(void)
{
    FloatUnion fu;
    DoubleUnion du;

#ifndef ENABLE_VALUE_INPUT
    fu.byte[3] = 0x00;
    fu.byte[2] = 0x00;
    fu.byte[1] = 0x00;
    fu.byte[0] = 0x00;

    du.byte[7] = 0x00;
    du.byte[6] = 0x00;
    du.byte[5] = 0x00;
    du.byte[4] = 0x00;
    du.byte[3] = 0x00;
    du.byte[2] = 0x00;
    du.byte[1] = 0x00;
    du.byte[0] = 0x00;
#endif
#ifdef ENABLE_VALUE_INPUT
    fu.value = 0.0f;
    du.value = 0.0;
#endif

    printf("Float raw: %x\n", *((uint32_t *) fu.byte));
    printf("Float: %g\n", fu.value);
    printf("Double raw: %llx\n", *((uint64_t *) du.byte));
    printf("Double: %.15g\n", du.value);

    return 0;
}
```

### 实验：规格化浮点数

我们就用以前的栗子来做实验吧：

| 项目                                         | 已知数据      | 预期结果       |
| -------------------------------------------- | ------------- | -------------- |
| 按IEEE 754构造单精度浮点数并验证             | $(10.1101)_2$ | $2.8125$       |
| 将IEEE 754单精度浮点数表示为二进制结果并验证 | $12.125$      | $(1100.001)_2$ |

#### 实验一

已知：二进制浮点数$(10.1101)_2$

1. 转为科学计数法：$(10.1101)_2 = (1.01101)_2 \times 2 ^ 1$
1. 得到分数值部分为$(01101)_2$，无偏移指数为$1$
1. 计算阶码为$1 + 127 = 128 = (10000000)_2$
1. 所以我们构造的浮点数为：$(0\ 10000000\ 01101000000000000000000)_2$
1. 将构造的浮点数转换为16进制，结果为$(01000000\ 00110100\ 00000000\ 00000000)_2 = (\text{40\ 34\ 00\ 00})_{16}$
1. 按小端序填入上述程序：
   ```c
       fu.byte[3] = 0x40;
       fu.byte[2] = 0x34;
       fu.byte[1] = 0x00;
       fu.byte[0] = 0x00;
   ```
1. 注释`#define ENABLE_VALUE_INPUT`
1. 编译运行，观察输出：
   ```plain
   Float raw: 40340000
   Float: 2.8125
   Double raw: 0
   Double: 0
   ```
1. 验证成功

#### 实验二

已知：十进制浮点数$12.125$

1. 将浮点数填入上述程序：
   ```c
       fu.value = 12.125f;
   ```
1. 确保`#define ENABLE_VALUE_INPUT`未注释
1. 编译运行，得到输出：
   ```plain
   Float raw: 41420000
   Float: 12.125
   Double raw: 0
   Double: 0
   ```
1. 得到IEEE 754表示为$(41\ 42\ 00\ 00)_{16}$
1. 转换为二进制，得到$(0 10000010 10000100000000000000000)_2$
1. 我们得到阶码为$(10000010)_2 = 130$，分数值为$(100001)_2$
1. 计算得指数为$130 - 127 = 3$
1. 则使用科学计数法表示的二进制浮点数为$(1.100001)_2 \times 2 ^ 3 = (1100.001)_2$
1. 验证成功

### 实验：非规格化浮点数

| 项目                                         | 已知数据                  | 预期结果 |
| -------------------------------------------- | ------------------------- | -------- |
| 将IEEE 754单精度浮点数表示为二进制结果并验证 | $1.425 \times 10 ^ {-39}$ | 待计算   |

#### 预备实验

因为$1.425$转成二进制小数会循环，再加上$\log_{2}{10}$是无理数，我们只能先算出$1.425 \times 10 ^ {-39}$的理论估计值，再与实际的二进制结果比较。

1. 首先将$10 ^ {-39}$转换成以2为底数的幂：

   $$
   10 ^ {-39} = 2 ^ x
   $$

   可得：

   $$
   x = \log_2{10 ^ {-39}} = -39 \log_2{10}
   $$

1. 再将$1.425$转换为以2为底数的幂：

   $$
   1.425 = 2 ^ {\log_2{1.425}}
   $$

1. 则我们可以将原幂表示为：

   $$
   2 ^ {\log_2{1.425}} \times 2 ^ {-39 \log_2{10}} = 2 ^ {\log_2{1.425} - 39 \log_2{10}}
   $$

1. 计算上面的指数，得：

   $$
   2 ^ {\log_2{1.425} - 39 \log_2{10}} \approx 2 ^ {-129.04423378132975}
   $$

1. 对幂进行拆分，得：

   $$
   2 ^ {-0.04423378132975} \times 2 ^ {-129}
   $$

1. 计算幂的前半部分，得：

   $$
   2 ^ {-0.04423378132975} \approx 0.9698047457246761
   $$

1. 所以估计的理论值为：

   $$
   0.9698047457246761 \times 2 ^ {-129}
   $$

#### 实验

已知：十进制浮点数$1.425 \times 10 ^ {-39}$

1. 将浮点数填入上述程序：
   ```c
       fu.value = 1.425e-39f;
   ```
1. 确保`#define ENABLE_VALUE_INPUT`未注释
1. 编译运行，得到输出：
   ```plain
   Float raw: f8452
   Float: 1.425e-39
   Double raw: 0
   Double: 0
   ```
1. 得到IEEE 754表示为$(00\ \text{0F}\ 84\ 52)_{16}$
1. 转换为二进制，得到$(0 00000000 00011111000010001010010)_2$
1. 我们得到阶码为0，分数值为$(0001111100001000101001)_2$
1. 计算得到指数为$0 - 126 = -126$
1. 则使用科学计数法表示的二进制浮点数为$(0.0001111100001000101001)_2 \times 2 ^ {-126} = (0.1111100001000101001)_2 \times 2 ^ {-129}$
1. 将$(0.1111100001000101001)_2$转换为十进制，为$0.9698047637939453$
1. 由于我们使用的是单精度浮点数，只能保证6至7位有效数字，我们只看前7位，均为$0.9698047$，即验证成功。

### 实验：特殊值

| 项目                     | 已知数据 | 预期结果             |
| ------------------------ | -------- | -------------------- |
| 验证单精度NaN的表示      | 待计算   | 显示正或负的NaN      |
| 验证单精度$\infty$的表示 | 待计算   | 显示正或负的$\infty$ |

#### 预实验

计算NaN的表示：根据定义，NaN的阶码每一位均为1，且分数值不为0，我们构造单精度NaN：

| 项目    | 二进制表示                                 | 十六进制表示                |
| ------- | ------------------------------------------ | --------------------------- |
| `+sNaN` | $(0\ 11111111\ 00000000000000000000001)_2$ | $\text{(7F 80 00 01)}_{16}$ |
| `-sNaN` | $(1\ 11111111\ 00000000000000000000001)_2$ | $\text{(FF 80 00 01)}_{16}$ |
| `+qNaN` | $(0\ 11111111\ 10000000000000000000000)_2$ | $\text{(7F C0 00 00)}_{16}$ |
| `-qNaN` | $(1\ 11111111\ 10000000000000000000000)_2$ | $\text{(FF C0 00 00)}_{16}$ |

计算$\infty$的表示：根据定义，$\infty$的阶码每一位均为1，且分数值为0，我们构造单精度$\infty$：

| 项目   | 二进制表示                                 | 十六进制表示                |
| ------ | ------------------------------------------ | --------------------------- |
| `+inf` | $(0\ 11111111\ 00000000000000000000000)_2$ | $\text{(7F 80 00 00)}_{16}$ |
| `-inf` | $(1\ 11111111\ 00000000000000000000000)_2$ | $\text{(FF 80 00 00)}_{16}$ |

#### 实验一：验证NaN的表示

分别将+sNaN、-sNaN、+qNaN和-qNaN的十六进制表示按上面的方法填入程序，注释`#define ENABLE_VALUE_INPUT`，编译运行并观察输出：

```plain
Float raw: 7f800001
Float: nan
////////
Float raw: ff800001
Float: nan
////////
Float raw: 7fc00000
Float: nan
////////
Float raw: ffc00000
Float: nan
```

NaN在输出时不显示类型和符号。

#### 实验二：验证∞的表示

分别将`+inf`和`-inf`的十六进制表示按上面的方法填入程序，注释`#define ENABLE_VALUE_INPUT`，编译运行并观察输出：

```plain
Float raw: 7f800000
Float: inf
////////
Float raw: ff800000
Float: -inf
```

`inf`在输出时会显示其符号。
