---
title: 浮動小数点数の規格：IEEE 754について
date: 2021-07-16
tags: [浮動小数点数, IEEE 754]
---

## 0x00 はじめに

大学一年のとき、デジタルシステム（Digital Systems）の授業で、符号付き整数、符号なし整数、浮動小数点数がコンピュータの内部でどう表現されるかを学びました。そのうち浮動小数点数の表現は少し複雑で、一般にIEEE 754規格の定義に従います。C/C++、Java、C#、Pythonなどの言語で使っている浮動小数点数もそうです。

IEEE 754は主に5つの面について規格を定めています：

1. [算術形式](#算術形式)：二進と十進の浮動小数点数の一連の形式。正/負のゼロ、非正規化数、無限大、非数（NaN）などを含む
1. [符号化形式](#符号化形式)：浮動小数点数の効率的な符号化、格納、伝送
1. [丸め規則](#丸め規則)：浮動小数点数の計算や変換における丸め
1. [演算](#演算)：算術演算子とそのほかの演算（たとえば三角関数など）
1. [例外処理](#例外処理)：例外（たとえばゼロ除算、オーバーフローなど）が起きたときの処理方法

以下で一つずつ見ていきます。

## 0x01 おさらい

### 科学的記数法

すべての実数は次の形で表せます：

$$
f = \text{mantissa} \times \text{base} ^ \text{exponent}
$$

それぞれの記号の意味は次のとおりです：

| 記号              | 意味                                                 |
| ----------------- | ---------------------------------------------------- |
| $\text{mantissa}$ | 仮数。$\lvert\text{mantissa}\rvert < \text{base}$    |
| $\text{base}$     | 基数。正の整数で、記数法の基数（二進法、十進法など） |
| $\text{exponent}$ | 指数。整数                                           |

### 二進数の実数を十進数に変換する

実数$f$の整数部が$n$桁、小数部が$m$桁だとすると：

$$
f = \sum_{i = -m} ^ {n - 1}f_{2_i} 2 ^ i
$$

ここで、$f_{2_i}$は二進表記での$f$の第$i$桁の数字（0または1）を表し、その桁の重みは$2 ^ i$です。

例：

$$
(10.1101)_2 = 1 \times 2 ^ {-4} + 0 \times 2 ^ {-3} + 1 \times 2 ^ {-2} + 1 \times 2 ^ {-1} + 0 \times 2 ^ 0 + 1 \times 2 ^ {1} = 2.8125
$$

### 十進数の実数を二進数に変換する

- 整数部：2で割って余りを取り、逆順に並べる
- 小数部：2を掛けて整数部分を取り、順に並べる

例：$12.125$を二進数で表す：

整数部：

$$
\begin{aligned}
12 &= 2 \times 6 + \textbf{0} \\
6 &= 2 \times 3 + \textbf{0} \\
3 &= 2 \times 1 + \textbf{1} \\
1 &= 2 \times 0 + \textbf{1} \\
\end{aligned}
$$

よって$12 = (1100)_2$です。

小数部：

$$
\begin{aligned}
0.125 \times 2 &= \textbf{0}.25 \\
0.25 \times 2 &= \textbf{0}.5 \\
0.5 \times 2 &= \textbf{1}.0
\end{aligned}
$$

よって$0.125 = (0.001)_2$です。

合わせると

$$
12.125 = (1100.001)_2
$$

## 0x02 規格の紹介

### 算術形式

IEEE 754規格では、浮動小数点数は次のパラメータで記述できます：

- 基数$b$。$b = 2$または$b = 10$で、浮動小数点数を二進または十進で表すことを意味します。
- 精度$p$
- 指数の範囲$[e_{\text{min}}, e_{\text{max}}]$。規格では$e_{\text{min}} = 1 - e_{\text{max}}$です。

浮動小数点数には次のものがあります：

- [通常の浮動小数点数](#通常の浮動小数点数)。±0を含む
- 二つの無限大：正と負
- 二種類の非数（NaN）：クワイエットNaN（Quiet NaN, qNaN）とシグナリングNaN（Signaling NaN, sNaN）
  - qNaNは何も引き起こしません。
  - sNaNは通常、浮動小数点演算装置（FPU）で例外を発生させます。*nixシステムでは、浮動小数点例外は典型的にはプロセスへの`SIGFPE`シグナルとして現れます。

#### 通常の浮動小数点数

注意：この節からは、**二進**浮動小数点数の表現だけを扱います。十進浮動小数点数はコンピュータ内部での表現に向かないので、ここでは扱いません。

コンピュータで表しやすくするために、IEEEは科学的記数法に手を加え、浮動小数点数を次の形で表せるようにしました[^1]：

$$
f = (-1) ^ {\text{sign}} \times (1 + \text{fraction}) \times 2 ^ {\text{exponent} - \text{bias}}
$$

それぞれの記号の意味は次のとおりです：

| 記号                            | 意味                                                                                                          |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| $\text{sign}$                   | 符号ビット。$0$または$1$                                                                                      |
| $\text{fraction}$               | 小数部。二進小数の小数点より後ろの部分                                                                        |
| $\text{exponent}$               | バイアス**付き**指数（Biased Exponent）。指数部とも呼ばれる非負の整数で、浮動小数点数を格納するときに使う指数 |
| $\text{bias}$                   | 指数のバイアス。浮動小数点数の精度によって決まる                                                              |
| $\text{exponent} - \text{bias}$ | バイアスなし指数と呼ばれ、実際の計算で使う指数                                                                |

また、次のように定められています：

精度を$p$とし、浮動小数点数を$(-1) ^ {\text{sign}} \times c \times 2 ^ q$の形に書きます。ここで$c$は$p$桁の二進整数、$q$は指数の値です。このとき$q + p - 1 \in [e_{\text{min}}, e_{\text{max}}]$、つまり$q \in [e_{\text{min}} + 1 - p, e_{\text{max}} + 1 - p]$です。

[^1]: 実際の符号化では、$\text{fraction}$の前の数（つまり整数部）の値は1のこともあれば（[正規化数](#正規化数)）、0のこともあります（[非正規化数](#非正規化数)）。

### 符号化形式

#### 基本的なメモリ配置

浮動小数点数はメモリ上で三つのフィールドを持ちます：

1. 符号ビット（$\text{sign}$）
1. 指数部（$\text{exponent}$）
1. 小数部（$\text{fraction}$）

図は次のとおりです：\
![出典：Charles Esson, Wikipedia, https://commons.wikimedia.org/w/index.php?curid=3356830](/assets/ieee-754/General_floating_point_frac.svg)

それぞれの記号の意味は次のとおりです：

| 記号 | 意味                     |
| ---- | ------------------------ |
| $f$  | 小数部のフィールドの長さ |
| $e$  | 指数部のフィールドの長さ |

> 注：二進浮動小数点数では、$e_{\text{max}} = 2 ^ {e - 1} - 1$です。

#### 正規化数

正規化（Normalized）浮動小数点数は、次の条件を満たす必要があります：

- 浮動小数点数を科学的記数法で表したとき、整数部は$(1)_2$でなければなりません。
- 指数部は$(0, 2 ^ e - 1)$の範囲、つまりバイアスなし指数は$(-2 ^ {e - 1} + 1, 2 ^ {e - 1})$の範囲になければなりません。

暗黙の整数ビット$(1)_2$と正規化した小数部を合わせたもの、つまり$(1.\text{fraction})_2$を有効数字（significand）と呼びます。正規化数の指数のバイアスは$\text{bias} = 2 ^ {e - 1} - 1$です。正規化数を科学的記数法で表したとき、仮数は$[1, 2)$の範囲にあります。

たとえば、$(1101.01)_2$を正規化したいとします：

1. まず整数部を1にして、科学的記数法で$(1.10101)_2 \times 2 ^ 3$と書きます

   ついでに言うと、$(1.10101)_2$は科学的記数法の仮数（$\text{mantissa}$）です。IEEE 754の小数部（$\text{fraction}$）と混同しないでください。

1. 小数部$\text{fraction} = (10101)_2$を得ます。
1. バイアスなし指数$\text{exponent} - \text{bias} = 3 = (11)_2$を得て、指数部を計算すると$\text{exponent} = (11)_2 + 2 ^ {e - 1} - 1$です。$e$の値はまだ決まっていません。

#### 非正規化数

非正規化浮動小数点数には次の特徴があります：

- 指数部$\text{exponent} = 0$
- 小数部$\text{fraction} \neq 0$

一般に、浮動小数点数が0に非常に近いとき（指数部が0に達したとき）にだけ、非正規化数で表します。

非正規化数を科学的記数法で表したとき、仮数は$(0, 1)$の範囲にあります。系：すべての非正規化数の絶対値は、すべての正規化数の絶対値より小さくなります。

非正規化数の指数のバイアスは$\text{bias} = 2 ^ {e - 1} - 2$で、正規化数のバイアスより1小さくなります。

#### 特殊な値

| 条件                                                              | 説明                                                                               |
| ----------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| $\text{exponent} = \text{fraction} = 0$                           | この浮動小数点数は0で、符号は$\text{sign}$で決まる                                 |
| $\text{exponent} = 2 ^ e - 1 \text{ and } \text{fraction} = 0$    | この浮動小数点数は無限大（$\infty$）で、符号は$\text{sign}$で決まる                |
| $\text{exponent} = 2 ^ e - 1 \text{ and } \text{fraction} \neq 0$ | この浮動小数点数はNaNを表す。$\text{fraction}$の最上位ビットが1ならqNaN、0ならsNaN |

#### 交換形式

| 名前        | 一般的な名前 | 有効桁数 | 指数部の長さ | $e_{\text{min}}$ | $e_{\text{max}}$ |
| ----------- | ------------ | -------- | ------------ | ---------------- | ---------------- |
| `binary16`  | 半精度       | 11       | 5            | -14              | 15               |
| `binary32`  | 単精度       | 24       | 8            | -126             | 127              |
| `binary64`  | 倍精度       | 53       | 11           | -1022            | 1023             |
| `binary128` | 四倍精度     | 113      | 15           | -16382           | 16383            |
| `binary256` | 八倍精度     | 237      | 19           | -262142          | 262143           |

注：有効桁数 = 暗黙の整数ビット（1ビット）+ 小数部のフィールドの長さ。

##### 単精度（32ビット）

最上位ビットから最下位ビットまでの配置は次のとおりです：

- 符号ビット：1 bit
- バイアス付き指数：8 bits
- 小数部：23 bits

図は次のとおりです：
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

##### 倍精度（64ビット）

最上位ビットから最下位ビットまでの配置は次のとおりです：

- 符号ビット：1 bit
- バイアス付き指数：11 bits
- 小数部：52 bits

図は次のとおりです：
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

### 丸め規則

IEEE 754は5つの丸め規則を定めています。最初の二つは最近接丸めで、残りの三つは方向付き丸めと呼ばれます。

#### 最近接丸め

- 最近接偶数への丸め（Ties to Even）：最も近い数に丸めますが、元の数からの距離が等しい数が二つあるときは、そのうちの偶数（二進で0で終わるもの）を取ります。デフォルトではこの方法で丸めます。
- 0から遠いほうへの最近接丸め（Ties Away from Zero）：最も近い数に丸めますが、元の数からの距離が等しい数が二つあるときは、元の数が正なら大きいほうに、負なら小さいほうに丸めます。

#### 方向付き丸め

- 0方向への丸め（Round toward $0$）：切り捨て（truncate）とも呼ばれます。
- 正の無限大方向への丸め（Round toward $+\infty$）：切り上げ（ceiling）とも呼ばれます。
- 負の無限大方向への丸め（Round toward $-\infty$）：切り下げ（floor）とも呼ばれます。

### 演算

IEEE 754は、浮動小数点数に対して行えるいくつかの演算を定めています：

1. 算術演算（四則演算、平方根、積和演算、累乗、剰余、三角関数など）
   - $\sqrt{-0.0} = -0.0$と定めています
   - 剰余を$\text{remainder}(x, y) = x - (\text{round}(x / y) \cdot y)$と定めています
1. 変換演算（浮動小数点形式どうしの変換、浮動小数点数から文字列への変換、文字列から浮動小数点数への変換など）
1. 符号の演算（絶対値、符号反転など）
   - $\text{copysign}(x, y)$は$y$の符号と$x$の符号以外の部分を組み合わせたものを返し、NaNにも使えます
   - $-x$は$x$の符号を反転します。$x$が$\plusmn 0$やNaNのときは、$0 - x$とは意味が異なります
1. 比較と順序付け
   - $+0.0 = -0.0$、$-\text{inf} = -\text{inf}$、$\text{inf} = \text{inf}$と定め、NaNと任意の数（NaNを含む）との比較は、`!=`が真になる以外はすべて偽になります。そのため、NaNの検出には`x != x`も`isnan(x)`も使えます。`isunordered(x, y)`は`x`と`y`が比較できない（たとえばどちらかがNaN）かどうかを調べます
   - -inf < 負の正規化数 < 負の非正規化数 < 0.0 < 正の非正規化数 < 正の正規化数 < inf
   - $x <> y \equiv x < y \text{ or } x > y$。$x \neq y$との違いに注意してください
1. 分類と判定
   - `class(x)`は`x`の分類を返します：sNaN、qNaN、inf、0.0、正規化か非正規化か、符号など
   - `isfinite(x)`は`x`が有限かどうかを判定します
1. そのほかの演算

### 例外処理

IEEE 754は、処理しなければならない5つの例外を定めています：

1. 無効演算：数学的に定義されない演算（たとえば負の数の平方根）。デフォルトではqNaNを返します。
1. ゼロ除算：デフォルトでは`inf`を返し、符号は被除数と除数の符号の組み合わせで決まります（たとえば$1 / -0.0 = -\infty$）。
1. オーバーフロー：結果の絶対値が大きすぎて、指数に収まりません（$e_{\text{max}}$を超える）。デフォルトでは`inf`を返し、符号は元の数の符号で決まります。
1. アンダーフロー：結果の絶対値が小さすぎて、指数に収まりません（$e_{\text{min}}$を下回る）。デフォルトでは非正規化表現を返し、小さすぎる場合は0を返します。
1. 不正確：結果の有効数字が長すぎて、元の精度では表せません。デフォルトでは丸めた結果を返します。

## 0x03 実践

注意：

- 自分はx86アーキテクチャ、amd64拡張のマシンを使っているので、以下で扱うバイト順はすべて**リトルエンディアン**です。
- 使ったCコンパイラは`gcc version 10.2.0 (Rev10, Built by MSYS2 project)`で、`float`型は32ビット、`double`型は64ビットです。

次のテストプログラムで実験しました：

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

### 実験：正規化数

前に出した例で実験してみましょう：

| 項目                                                 | 既知のデータ  | 期待する結果   |
| ---------------------------------------------------- | ------------- | -------------- |
| IEEE 754に従って単精度浮動小数点数を作り、検証する   | $(10.1101)_2$ | $2.8125$       |
| IEEE 754の単精度浮動小数点数を二進数で表し、検証する | $12.125$      | $(1100.001)_2$ |

#### 実験1

既知：二進浮動小数点数$(10.1101)_2$

1. 科学的記数法に直す：$(10.1101)_2 = (1.01101)_2 \times 2 ^ 1$
1. 小数部は$(01101)_2$、バイアスなし指数は$1$
1. 指数部を計算すると$1 + 127 = 128 = (10000000)_2$
1. よって作る浮動小数点数は：$(0\ 10000000\ 01101000000000000000000)_2$
1. 作った浮動小数点数を16進数に変換すると、$(01000000\ 00110100\ 00000000\ 00000000)_2 = (\text{40\ 34\ 00\ 00})_{16}$
1. リトルエンディアンで上のプログラムに入れる：
   ```c
       fu.byte[3] = 0x40;
       fu.byte[2] = 0x34;
       fu.byte[1] = 0x00;
       fu.byte[0] = 0x00;
   ```
1. `#define ENABLE_VALUE_INPUT`をコメントアウトする
1. コンパイルして実行し、出力を見る：
   ```plain
   Float raw: 40340000
   Float: 2.8125
   Double raw: 0
   Double: 0
   ```
1. 検証成功

#### 実験2

既知：十進浮動小数点数$12.125$

1. 浮動小数点数を上のプログラムに入れる：
   ```c
       fu.value = 12.125f;
   ```
1. `#define ENABLE_VALUE_INPUT`がコメントアウトされていないことを確認する
1. コンパイルして実行し、出力を得る：
   ```plain
   Float raw: 41420000
   Float: 12.125
   Double raw: 0
   Double: 0
   ```
1. IEEE 754での表現は$(41\ 42\ 00\ 00)_{16}$
1. 二進数に変換すると、$(0 10000010 10000100000000000000000)_2$
1. 指数部は$(10000010)_2 = 130$、小数部は$(100001)_2$
1. 指数を計算すると$130 - 127 = 3$
1. よって科学的記数法で表した二進浮動小数点数は$(1.100001)_2 \times 2 ^ 3 = (1100.001)_2$
1. 検証成功

### 実験：非正規化数

| 項目                                                 | 既知のデータ              | 期待する結果 |
| ---------------------------------------------------- | ------------------------- | ------------ |
| IEEE 754の単精度浮動小数点数を二進数で表し、検証する | $1.425 \times 10 ^ {-39}$ | 要計算       |

#### 予備実験

$1.425$は二進小数に直すと循環し、さらに$\log_{2}{10}$は無理数なので、まず$1.425 \times 10 ^ {-39}$の理論上の推定値を計算してから、実際の二進の結果と比べるしかありません。

1. まず$10 ^ {-39}$を2を底とする累乗に直します：

   $$
   10 ^ {-39} = 2 ^ x
   $$

   よって：

   $$
   x = \log_2{10 ^ {-39}} = -39 \log_2{10}
   $$

1. 次に$1.425$を2を底とする累乗に直します：

   $$
   1.425 = 2 ^ {\log_2{1.425}}
   $$

1. すると元の値は次のように表せます：

   $$
   2 ^ {\log_2{1.425}} \times 2 ^ {-39 \log_2{10}} = 2 ^ {\log_2{1.425} - 39 \log_2{10}}
   $$

1. 上の指数を計算すると：

   $$
   2 ^ {\log_2{1.425} - 39 \log_2{10}} \approx 2 ^ {-129.04423378132975}
   $$

1. 累乗を分けると：

   $$
   2 ^ {-0.04423378132975} \times 2 ^ {-129}
   $$

1. 累乗の前半を計算すると：

   $$
   2 ^ {-0.04423378132975} \approx 0.9698047457246761
   $$

1. よって推定した理論値は：

   $$
   0.9698047457246761 \times 2 ^ {-129}
   $$

#### 実験

既知：十進浮動小数点数$1.425 \times 10 ^ {-39}$

1. 浮動小数点数を上のプログラムに入れる：
   ```c
       fu.value = 1.425e-39f;
   ```
1. `#define ENABLE_VALUE_INPUT`がコメントアウトされていないことを確認する
1. コンパイルして実行し、出力を得る：
   ```plain
   Float raw: f8452
   Float: 1.425e-39
   Double raw: 0
   Double: 0
   ```
1. IEEE 754での表現は$(00\ \text{0F}\ 84\ 52)_{16}$
1. 二進数に変換すると、$(0 00000000 00011111000010001010010)_2$
1. 指数部は0、小数部は$(0001111100001000101001)_2$
1. 指数を計算すると$0 - 126 = -126$
1. よって科学的記数法で表した二進浮動小数点数は$(0.0001111100001000101001)_2 \times 2 ^ {-126} = (0.1111100001000101001)_2 \times 2 ^ {-129}$
1. $(0.1111100001000101001)_2$を十進数に変換すると$0.9698047637939453$
1. 単精度浮動小数点数を使っているので、保証されるのは有効数字6～7桁だけです。最初の7桁だけを見ると、どちらも$0.9698047$なので、検証成功です。

### 実験：特殊な値

| 項目                             | 既知のデータ | 期待する結果                     |
| -------------------------------- | ------------ | -------------------------------- |
| 単精度のNaNの表現を検証する      | 要計算       | 正または負のNaNと表示される      |
| 単精度の$\infty$の表現を検証する | 要計算       | 正または負の$\infty$と表示される |

#### 予備実験

NaNの表現を計算する：定義により、NaNの指数部はすべてのビットが1で、小数部は0ではないので、単精度のNaNを作ります：

| 項目    | 二進表現                                   | 十六進表現                  |
| ------- | ------------------------------------------ | --------------------------- |
| `+sNaN` | $(0\ 11111111\ 00000000000000000000001)_2$ | $\text{(7F 80 00 01)}_{16}$ |
| `-sNaN` | $(1\ 11111111\ 00000000000000000000001)_2$ | $\text{(FF 80 00 01)}_{16}$ |
| `+qNaN` | $(0\ 11111111\ 10000000000000000000000)_2$ | $\text{(7F C0 00 00)}_{16}$ |
| `-qNaN` | $(1\ 11111111\ 10000000000000000000000)_2$ | $\text{(FF C0 00 00)}_{16}$ |

$\infty$の表現を計算する：定義により、$\infty$の指数部はすべてのビットが1で、小数部は0なので、単精度の$\infty$を作ります：

| 項目   | 二進表現                                   | 十六進表現                  |
| ------ | ------------------------------------------ | --------------------------- |
| `+inf` | $(0\ 11111111\ 00000000000000000000000)_2$ | $\text{(7F 80 00 00)}_{16}$ |
| `-inf` | $(1\ 11111111\ 00000000000000000000000)_2$ | $\text{(FF 80 00 00)}_{16}$ |

#### 実験1：NaNの表現を検証する

+sNaN、-sNaN、+qNaN、-qNaNの十六進表現を、上の方法でそれぞれプログラムに入れ、`#define ENABLE_VALUE_INPUT`をコメントアウトしてから、コンパイルして実行し、出力を見ます：

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

NaNは出力時に種類も符号も表示されません。

#### 実験2：∞の表現を検証する

`+inf`と`-inf`の十六進表現を、上の方法でそれぞれプログラムに入れ、`#define ENABLE_VALUE_INPUT`をコメントアウトしてから、コンパイルして実行し、出力を見ます：

```plain
Float raw: 7f800000
Float: inf
////////
Float raw: ff800000
Float: -inf
```

`inf`は出力時に符号が表示されます。
