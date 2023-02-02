---
title: "A Look at the Floating-Point Standard: IEEE 754"
date: 2021-07-16
tags: [floating point, IEEE 754]
---

## 0x00 Preface

In my first year at university, the Digital Systems course covered how signed integers, unsigned integers and floating-point numbers are represented inside a computer. The floating-point representation is a little more complicated and generally follows the IEEE 754 standard. The floating-point numbers we use in C/C++, Java, C#, Python and other languages work this way.

IEEE 754 mainly defines standards in 5 areas:

1. [Arithmetic formats](#arithmetic-formats): a set of binary and decimal floating-point formats, including positive/negative zero, denormalized numbers, infinities, not-a-number (NaN) and so on;
1. [Encoding formats](#encoding-formats): efficient encoding, storage and transmission of floating-point numbers;
1. [Rounding rules](#rounding-rules): rounding when floating-point numbers are computed and converted;
1. [Operations](#operations): arithmetic operators and some other operations (for example, trigonometric functions);
1. [Exception handling](#exception-handling): how to handle exceptional conditions (for example, division by zero and overflow);

We'll go through them one by one below.

## 0x01 A Refresher

### Scientific Notation

Every real number can be written in this form:

$$
f = \text{mantissa} \times \text{base} ^ \text{exponent}
$$

where the symbols mean:

| Symbol            | Meaning                                                                                 |
| ----------------- | --------------------------------------------------------------------------------------- |
| $\text{mantissa}$ | The mantissa, $\lvert\text{mantissa}\rvert < \text{base}$                               |
| $\text{base}$     | The base, a positive integer: the base of the number system (binary, decimal and so on) |
| $\text{exponent}$ | The exponent, an integer                                                                |

### Binary Real Numbers to Decimal

Let $f$ be a real number whose integer part has $n$ digits and whose fractional part has $m$ digits. Then:

$$
f = \sum_{i = -m} ^ {n - 1}f_{2_i} 2 ^ i
$$

where $f_{2_i}$ is digit $i$ of $f$ in binary (0 or 1), and the weight of that digit is $2 ^ i$.

An example:

$$
(10.1101)_2 = 1 \times 2 ^ {-4} + 0 \times 2 ^ {-3} + 1 \times 2 ^ {-2} + 1 \times 2 ^ {-1} + 0 \times 2 ^ 0 + 1 \times 2 ^ {1} = 2.8125
$$

### Decimal Real Numbers to Binary

- Integer part: divide by two and take the remainders, in reverse order
- Fractional part: multiply by two and take the integer parts, in order

An example: write $12.125$ in binary:

Integer part:

$$
\begin{aligned}
12 &= 2 \times 6 + \textbf{0} \\
6 &= 2 \times 3 + \textbf{0} \\
3 &= 2 \times 1 + \textbf{1} \\
1 &= 2 \times 0 + \textbf{1} \\
\end{aligned}
$$

So $12 = (1100)_2$.

Fractional part:

$$
\begin{aligned}
0.125 \times 2 &= \textbf{0}.25 \\
0.25 \times 2 &= \textbf{0}.5 \\
0.5 \times 2 &= \textbf{1}.0
\end{aligned}
$$

So $0.125 = (0.001)_2$.

Putting them together:

$$
12.125 = (1100.001)_2
$$

## 0x02 The Standard

### Arithmetic Formats

In the IEEE 754 standard, a floating-point number can be described by these parameters:

- The base $b$, $b = 2$ or $b = 10$, meaning the number is represented in binary or decimal;
- The precision $p$;
- The exponent range $[e_{\text{min}}, e_{\text{max}}]$, where the standard has $e_{\text{min}} = 1 - e_{\text{max}}$;

Floating-point numbers include:

- [Ordinary floating-point numbers](#ordinary-floating-point-numbers), including ±0;
- Two infinities: positive and negative;
- Two kinds of not-a-number (NaN): quiet NaN (qNaN) and signaling NaN (sNaN);
  - A qNaN doesn't trigger anything;
  - An sNaN usually raises an exception in the floating-point unit (FPU). On *nix systems, a floating-point exception typically shows up as a `SIGFPE` signal sent to the process.

#### Ordinary Floating-Point Numbers

Note: from this section on, we only discuss the representation of **binary** floating-point numbers. Decimal floating-point numbers aren't suited to representation inside a computer, so they aren't covered here.

To make them easy to represent in a computer, IEEE modified scientific notation, so that a floating-point number can be written in this form[^1]:

$$
f = (-1) ^ {\text{sign}} \times (1 + \text{fraction}) \times 2 ^ {\text{exponent} - \text{bias}}
$$

The symbols mean:

| Symbol                          | Meaning                                                                                      |
| ------------------------------- | -------------------------------------------------------------------------------------------- |
| $\text{sign}$                   | The sign bit, $0$ or $1$                                                                     |
| $\text{fraction}$               | The fraction, the part after the binary point                                                |
| $\text{exponent}$               | The **biased** exponent, a non-negative integer: the exponent used when the number is stored |
| $\text{bias}$                   | The exponent bias, which depends on the precision of the number                              |
| $\text{exponent} - \text{bias}$ | Called the unbiased exponent: the exponent used in actual computation                        |

The following also holds:

Let the precision be $p$, and write the floating-point number as $(-1) ^ {\text{sign}} \times c \times 2 ^ q$, where $c$ is a $p$-digit binary integer and $q$ is the value of the exponent. Then $q + p - 1 \in [e_{\text{min}}, e_{\text{max}}]$, that is, $q \in [e_{\text{min}} + 1 - p, e_{\text{max}} + 1 - p]$.

[^1]: In the actual encoding, the digit in front of $\text{fraction}$ (the integer part) can be 1 ([normalized floating-point numbers](#normalized-floating-point-numbers)) or 0 ([denormalized floating-point numbers](#denormalized-floating-point-numbers)).

### Encoding Formats

#### Basic Memory Layout

A floating-point number has three fields in memory:

1. The sign bit ($\text{sign}$)
1. The biased exponent ($\text{exponent}$)
1. The fraction ($\text{fraction}$)

As shown below:\
![Image source: Charles Esson, Wikipedia, https://commons.wikimedia.org/w/index.php?curid=3356830](/assets/ieee-754/General_floating_point_frac.svg)

The symbols mean:

| Symbol | Meaning                      |
| ------ | ---------------------------- |
| $f$    | Length of the fraction field |
| $e$    | Length of the exponent field |

> Note: for binary floating-point numbers, $e_{\text{max}} = 2 ^ {e - 1} - 1$.

#### Normalized Floating-Point Numbers

A normalized floating-point number must meet these conditions:

- When the number is written in scientific notation, the integer part must be $(1)_2$;
- The biased exponent must be in the range $(0, 2 ^ e - 1)$, meaning the unbiased exponent is in the range $(-2 ^ {e - 1} + 1, 2 ^ {e - 1})$.

The implicit integer bit $(1)_2$ together with the normalized fraction, that is $(1.\text{fraction})_2$, is called the significand. The exponent bias of a normalized floating-point number is $\text{bias} = 2 ^ {e - 1} - 1$. When a normalized floating-point number is written in scientific notation, the mantissa is in the range $[1, 2)$.

For example, say we want to normalize $(1101.01)_2$:

1. First make the integer part 1, writing it in scientific notation as $(1.10101)_2 \times 2 ^ 3$

   As an aside, $(1.10101)_2$ is the mantissa ($\text{mantissa}$) in scientific notation. Don't confuse it with the fraction ($\text{fraction}$) in IEEE 754.

1. Take the fraction $\text{fraction} = (10101)_2$;
1. Take the unbiased exponent $\text{exponent} - \text{bias} = 3 = (11)_2$, and compute the biased exponent $\text{exponent} = (11)_2 + 2 ^ {e - 1} - 1$, with $e$ still to be determined.

#### Denormalized Floating-Point Numbers

Denormalized floating-point numbers have these properties:

- The biased exponent $\text{exponent} = 0$
- The fraction $\text{fraction} \neq 0$

Denormalized floating-point numbers are generally used only when a number is very close to 0 (when the biased exponent reaches 0).

When a denormalized floating-point number is written in scientific notation, the mantissa is in the range $(0, 1)$. It follows that every denormalized floating-point number has a smaller absolute value than every normalized one.

The exponent bias of a denormalized floating-point number is $\text{bias} = 2 ^ {e - 1} - 2$, one less than the bias of normalized floating-point numbers.

#### Special Values

| Condition                                                         | Meaning                                                                                          |
| ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| $\text{exponent} = \text{fraction} = 0$                           | The number is 0, with the sign given by $\text{sign}$                                            |
| $\text{exponent} = 2 ^ e - 1 \text{ and } \text{fraction} = 0$    | The number is infinity ($\infty$), with the sign given by $\text{sign}$                          |
| $\text{exponent} = 2 ^ e - 1 \text{ and } \text{fraction} \neq 0$ | The number is a NaN; it's a qNaN if the top bit of $\text{fraction}$ is 1, and an sNaN if it's 0 |

#### Interchange Formats

| Name        | Common name         | Significand length | Exponent field length | $e_{\text{min}}$ | $e_{\text{max}}$ |
| ----------- | ------------------- | ------------------ | --------------------- | ---------------- | ---------------- |
| `binary16`  | Half precision      | 11                 | 5                     | -14              | 15               |
| `binary32`  | Single precision    | 24                 | 8                     | -126             | 127              |
| `binary64`  | Double precision    | 53                 | 11                    | -1022            | 1023             |
| `binary128` | Quadruple precision | 113                | 15                    | -16382           | 16383            |
| `binary256` | Octuple precision   | 237                | 19                    | -262142          | 262143           |

Note: significand length = the implicit integer bit (1 bit) + the length of the fraction field.

##### Single Precision (32 Bits)

The layout from the most significant bit to the least significant bit is:

- Sign bit: 1 bit
- Biased exponent: 8 bits
- Fraction: 23 bits

As shown below:
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

##### Double Precision (64 Bits)

The layout from the most significant bit to the least significant bit is:

- Sign bit: 1 bit
- Biased exponent: 11 bits
- Fraction: 52 bits

As shown below:
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

### Rounding Rules

IEEE 754 defines 5 rounding rules. The first two round to nearest, and the other three are called directed roundings.

#### Rounding to Nearest

- Round to nearest, ties to even: round to the nearest number, but when two numbers are equally close to the original, take the even one (the one ending in 0 in binary). This is the default rounding method;
- Round to nearest, ties away from zero: round to the nearest number, but when two numbers are equally close to the original, round to the larger one if the original is positive, and to the smaller one if the original is negative.

#### Directed Rounding

- Round toward $0$: also called truncation;
- Round toward $+\infty$: also called rounding up (ceiling);
- Round toward $-\infty$: also called rounding down (floor).

### Operations

IEEE 754 specifies some operations that can be performed on floating-point numbers:

1. Arithmetic operations (the four basic operations, square root, fused multiply-add, power, remainder, trigonometric functions and so on);
   - It specifies $\sqrt{-0.0} = -0.0$
   - It specifies the remainder $\text{remainder}(x, y) = x - (\text{round}(x / y) \cdot y)$
1. Conversion operations (between floating-point formats, from floating-point numbers to strings, from strings to floating-point numbers and so on);
1. Sign operations (absolute value, negation and so on);
   - $\text{copysign}(x, y)$ returns the sign of $y$ combined with the non-sign part of $x$, and works on NaN
   - $-x$ flips the sign of $x$. When $x$ is $\plusmn 0$ or NaN, this means something different from $0 - x$
1. Comparison and ordering;
   - It specifies $+0.0 = -0.0$, $-\text{inf} = -\text{inf}$ and $\text{inf} = \text{inf}$, and that every comparison between a NaN and any number (NaN included) is false, except `!=`, which is true. So you can detect a NaN with `x != x`, or with `isnan(x)`; `isunordered(x, y)` checks whether `x` and `y` can't be compared (for example, when one of them is a NaN)
   - -inf < negative normalized numbers < negative denormalized numbers < 0.0 < positive denormalized numbers < positive normalized numbers < inf
   - $x <> y \equiv x < y \text{ or } x > y$; note how this differs from $x \neq y$
1. Classification and testing;
   - `class(x)` returns the class of `x`: sNaN, qNaN, inf, 0.0, normalized or denormalized, sign and so on
   - `isfinite(x)` checks whether `x` is finite
1. Other operations;

### Exception Handling

IEEE 754 defines 5 exceptions that must be handled:

1. Invalid operation: a mathematically undefined operation (for example, the square root of a negative number). Returns a qNaN by default.
1. Division by zero: returns `inf` by default, with the sign determined by the signs of the dividend and the divisor together (for example, $1 / -0.0 = -\infty$).
1. Overflow: the absolute value of the result is too large for the exponent to hold (above $e_{\text{max}}$). Returns `inf` by default, with the sign of the original number.
1. Underflow: the absolute value of the result is too small for the exponent to hold (below $e_{\text{min}}$). Returns a denormalized representation by default, or 0 if it's too small.
1. Inexact: the result's significand is too long to be represented at the original precision. Returns the rounded result by default.

## 0x03 Hands-On

Notes:

- I use an x86 machine with the amd64 extension, so the byte order discussed below is **little-endian**.
- My C compiler is `gcc version 10.2.0 (Rev10, Built by MSYS2 project)`. `float` is 32 bits long and `double` is 64 bits long.

I used the following test program for the experiments:

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

### Experiment: Normalized Floating-Point Numbers

Let's use the earlier examples for the experiments:

| Task                                                              | Given         | Expected result |
| ----------------------------------------------------------------- | ------------- | --------------- |
| Build a single-precision number per IEEE 754 and verify it        | $(10.1101)_2$ | $2.8125$        |
| Write an IEEE 754 single-precision number as binary and verify it | $12.125$      | $(1100.001)_2$  |

#### Experiment 1

Given: the binary floating-point number $(10.1101)_2$

1. Convert it to scientific notation: $(10.1101)_2 = (1.01101)_2 \times 2 ^ 1$
1. The fraction is $(01101)_2$ and the unbiased exponent is $1$
1. The biased exponent is $1 + 127 = 128 = (10000000)_2$
1. So the number we build is $(0\ 10000000\ 01101000000000000000000)_2$
1. Converting it to hexadecimal gives $(01000000\ 00110100\ 00000000\ 00000000)_2 = (\text{40\ 34\ 00\ 00})_{16}$
1. Fill it into the program above in little-endian order:
   ```c
       fu.byte[3] = 0x40;
       fu.byte[2] = 0x34;
       fu.byte[1] = 0x00;
       fu.byte[0] = 0x00;
   ```
1. Comment out `#define ENABLE_VALUE_INPUT`
1. Compile, run and look at the output:
   ```plain
   Float raw: 40340000
   Float: 2.8125
   Double raw: 0
   Double: 0
   ```
1. Verified

#### Experiment 2

Given: the decimal floating-point number $12.125$

1. Fill the number into the program above:
   ```c
       fu.value = 12.125f;
   ```
1. Make sure `#define ENABLE_VALUE_INPUT` isn't commented out
1. Compile and run, and get the output:
   ```plain
   Float raw: 41420000
   Float: 12.125
   Double raw: 0
   Double: 0
   ```
1. The IEEE 754 representation is $(41\ 42\ 00\ 00)_{16}$
1. In binary, that's $(0 10000010 10000100000000000000000)_2$
1. The biased exponent is $(10000010)_2 = 130$ and the fraction is $(100001)_2$
1. So the exponent is $130 - 127 = 3$
1. So in scientific notation, the binary floating-point number is $(1.100001)_2 \times 2 ^ 3 = (1100.001)_2$
1. Verified

### Experiment: Denormalized Floating-Point Numbers

| Task                                                              | Given                     | Expected result |
| ----------------------------------------------------------------- | ------------------------- | --------------- |
| Write an IEEE 754 single-precision number as binary and verify it | $1.425 \times 10 ^ {-39}$ | To be computed  |

#### Preliminary Experiment

Because $1.425$ repeats when converted to a binary fraction, and $\log_{2}{10}$ is irrational, the best we can do is compute a theoretical estimate of $1.425 \times 10 ^ {-39}$ first, then compare it with the actual binary result.

1. First, convert $10 ^ {-39}$ to a power of 2:

   $$
   10 ^ {-39} = 2 ^ x
   $$

   which gives:

   $$
   x = \log_2{10 ^ {-39}} = -39 \log_2{10}
   $$

1. Then convert $1.425$ to a power of 2:

   $$
   1.425 = 2 ^ {\log_2{1.425}}
   $$

1. Now we can write the original value as:

   $$
   2 ^ {\log_2{1.425}} \times 2 ^ {-39 \log_2{10}} = 2 ^ {\log_2{1.425} - 39 \log_2{10}}
   $$

1. Computing the exponent above gives:

   $$
   2 ^ {\log_2{1.425} - 39 \log_2{10}} \approx 2 ^ {-129.04423378132975}
   $$

1. Splitting the power gives:

   $$
   2 ^ {-0.04423378132975} \times 2 ^ {-129}
   $$

1. Computing the first half of the power gives:

   $$
   2 ^ {-0.04423378132975} \approx 0.9698047457246761
   $$

1. So the estimated theoretical value is:

   $$
   0.9698047457246761 \times 2 ^ {-129}
   $$

#### Experiment

Given: the decimal floating-point number $1.425 \times 10 ^ {-39}$

1. Fill the number into the program above:
   ```c
       fu.value = 1.425e-39f;
   ```
1. Make sure `#define ENABLE_VALUE_INPUT` isn't commented out
1. Compile and run, and get the output:
   ```plain
   Float raw: f8452
   Float: 1.425e-39
   Double raw: 0
   Double: 0
   ```
1. The IEEE 754 representation is $(00\ \text{0F}\ 84\ 52)_{16}$
1. In binary, that's $(0 00000000 00011111000010001010010)_2$
1. The biased exponent is 0 and the fraction is $(0001111100001000101001)_2$
1. So the exponent is $0 - 126 = -126$
1. So in scientific notation, the binary floating-point number is $(0.0001111100001000101001)_2 \times 2 ^ {-126} = (0.1111100001000101001)_2 \times 2 ^ {-129}$
1. Converting $(0.1111100001000101001)_2$ to decimal gives $0.9698047637939453$
1. Since we're using single precision, only 6 to 7 significant digits are guaranteed. Looking at just the first 7 digits, both are $0.9698047$, so it's verified.

### Experiment: Special Values

| Task                                                   | Given          | Expected result                       |
| ------------------------------------------------------ | -------------- | ------------------------------------- |
| Verify the single-precision representation of NaN      | To be computed | Shows a positive or negative NaN      |
| Verify the single-precision representation of $\infty$ | To be computed | Shows a positive or negative $\infty$ |

#### Preliminary Experiment

Computing the representation of NaN: by definition, every bit of a NaN's biased exponent is 1 and the fraction isn't 0. We build single-precision NaNs:

| Item    | Binary                                     | Hexadecimal                 |
| ------- | ------------------------------------------ | --------------------------- |
| `+sNaN` | $(0\ 11111111\ 00000000000000000000001)_2$ | $\text{(7F 80 00 01)}_{16}$ |
| `-sNaN` | $(1\ 11111111\ 00000000000000000000001)_2$ | $\text{(FF 80 00 01)}_{16}$ |
| `+qNaN` | $(0\ 11111111\ 10000000000000000000000)_2$ | $\text{(7F C0 00 00)}_{16}$ |
| `-qNaN` | $(1\ 11111111\ 10000000000000000000000)_2$ | $\text{(FF C0 00 00)}_{16}$ |

Computing the representation of $\infty$: by definition, every bit of $\infty$'s biased exponent is 1 and the fraction is 0. We build single-precision $\infty$:

| Item   | Binary                                     | Hexadecimal                 |
| ------ | ------------------------------------------ | --------------------------- |
| `+inf` | $(0\ 11111111\ 00000000000000000000000)_2$ | $\text{(7F 80 00 00)}_{16}$ |
| `-inf` | $(1\ 11111111\ 00000000000000000000000)_2$ | $\text{(FF 80 00 00)}_{16}$ |

#### Experiment 1: Verifying the Representation of NaN

Fill the hexadecimal representations of +sNaN, -sNaN, +qNaN and -qNaN into the program one at a time as above, comment out `#define ENABLE_VALUE_INPUT`, then compile, run and look at the output:

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

NaNs are printed without their type or sign.

#### Experiment 2: Verifying the Representation of ∞

Fill the hexadecimal representations of `+inf` and `-inf` into the program one at a time as above, comment out `#define ENABLE_VALUE_INPUT`, then compile, run and look at the output:

```plain
Float raw: 7f800000
Float: inf
////////
Float raw: ff800000
Float: -inf
```

`inf` is printed with its sign.
