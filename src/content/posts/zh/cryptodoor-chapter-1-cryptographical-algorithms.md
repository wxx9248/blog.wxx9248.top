---
title: 密码之门·壹章：密码学算法介绍（长期更新）
date: 2021-04-30
tags: [AES, ECC, RSA, SHA, HMAC, DSA, DH]
---

## 0xff 总前言

一直想梳理一下密码学的基本概念，但是一直拖着没有搞。最近放假了，在回国前终于有点时间把密码之门这个超级大坑开开，梳理一下零散的密码学知识。毕竟这些东西很基础，以后不论在哪里都会用到，即使我不从事密码学相关行业。

## 0x00 本章前言

本篇主要介绍主要的密码学算法，以及它们的应用。

## 0x01 密码学算法简介

### 种类划分

- [加密算法](#加密算法)
- [摘要算法](#摘要算法)
- [消息认证算法](#消息认证算法)
- [电子签名算法](#电子签名算法)
- [密钥协商算法](#密钥协商算法)
- [伪随机数算法](#伪随机数算法)

### 加密算法

#### 种类划分

按照**有无密钥**划分，加密算法可以分为两类：

- 受限制的算法：算法本身就是加密/解密的关键，需要被保护
- 基于密钥的算法：算法使用密钥对明文进行加密

按照**密码体制**划分，基于密钥的算法又可划分为两类：

- [对称密码系统](#对称密码系统)（Symmetric Cryptography）
- [非对称密码系统](#非对称密码系统)（Asymmetric Cryptography），又叫公钥密码系统（Public-key Cryptography）

按照**明文类型**划分，对称密码系统还可以划分为两类：

- [块密码](#块密码)，又叫分组密码（Block Cipher）
- [流密码](#流密码)（Stream Cipher）

#### 对称密码系统

在对称密码系统中，加密和解密使用的密钥是同一个。

设加密函数为$e(k,m)$，解密函数为$d(k,c)$，其中，$m$和$c$分别为明文和密文，$k$为密钥，则有：

$$
c=e(k,m)
$$

$$
m=d(k,c)
$$

#### 非对称密码系统

在非对称密码系统中，加密和解密使用的密钥是不同的。公开的密钥称作公钥（Public Key），在加密算法中一般用于加密信息。私有的密钥称作私钥（Private Key），在加密算法中一般用于解密信息。

设加密函数为$e(k_e,m)$，解密函数为$d(k_d,c)$，其中，$m$和$c$分别为明文和密文，$k_e$为公钥，$k_d$为私钥，则有：

$$
c=e(k_e,m)
$$

$$
m=d(k_d,c)
$$

一类非对称密码系统需要依赖一种难解的数学问题，目前具有实用性的有三种：

- 整数分解问题，常见应用：[RSA](#rsa)
- 离散对数问题，常见应用：数字签名算法
- 椭圆曲线问题，常见应用：椭圆曲线加密算法、椭圆曲线数字签名算法、爱德华曲线数字签名算法、椭圆曲线迪非-赫尔曼算法

#### 块密码

块密码是对**固定长度数据**进行操作的对称密码系统，输入和输出数据均被表示为大小固定的方阵。

常见的现代块密码有：

- [高级加密标准](#高级加密标准)（Advanced Encryption Standard, AES），由Rijndael算法当选，目前最常用、安全，且获得广泛硬件加速支持的块密码
- 部分RC系列：RC6，AES候选算法；RC5；~~RC2~~，已被破解
- Fish系列：Twofish，AES候选算法；Threefish；~~Blowfish~~，不推荐，因为块大小过小
- ARIA，KATS标准，RFC 5794
- SM4，国密标准，CAS研发
- ~~数据加密标准（Data Encryption Standard, DES）~~，已被破解；~~3重DES（Triple DES）~~，不推荐，只存在于老旧系统中

##### 块密码的特性

###### 工作模式（Mode of Operation）

块密码的输入和输出都是固定长度的，如果我们需要加密任意长的数据，就需要对输入和输出做分块处理。而组织块密码的输出为密文这一步，由块密码的**工作模式**指定。

块密码的工作模式大致分为两类：

###### 非认证型工作模式

此类工作模式保证了消息的保密性，但是并未保证消息的真实性，即**无法确认消息是否被篡改**。非认证型工作模式仅输出明文对应的密文

考虑此场景：Alice和Bob使用某块密码进行通信，而Eve此时截获了他们的通信，处于中间人的位置。假设Alice给Bob发了一个加密的无格式纯字节流，Bob解密用这个字节流去干其他事情。如果Eve对加密后的信息进行扰乱，那么Bob依然可以继续解密，但是解密出来的东西就不是Alice发给他的了。而由于此字节流本身无格式，Bob也就无从判断这个字节流是否合法，也就不知道这个字节流到底是不是Alice原本想要发给他的那个。

目前常见的非认证型工作模式有：

- 电子密码本（Electronic Codebook, ECB）
- 密码块链接（Cipher-block Chaining, CBC）
- 明文密码块链接（Plaintext Cipher-block Chaining, PCBC）
- 密文反馈（Cipher Feedback, CFB）
- 输出反馈（Output Feedback, OFB）
- 计数器（Counter, CTR）

###### 认证型工作模式（认证加密, Authenticated Encryption, AE）

此类工作模式既保证了消息的保密性，又保证了消息的真实性。认证型工作模式不仅输出密文，同时根据发送方给出的一个密钥输出一个消息认证码（见 [消息认证算法](#消息认证算法)），接收方用MAC可以校验原消息是否被篡改。

认证型工作模式大致分为三类：

- 先加密，后生成MAC（Encrypt-then-MAC, EtM）：安全性最高，前提是使用的MAC必须是强不可伪造

  ![图片来源：Wikipedia](/assets/cryptodoor-chapter-1-cryptographical-algorithms/Authenticated_Encryption_EtM.png)

- 先生成MAC，后加密（MAC-then-Encrypt, MtE)

  ![图片来源：Wikipedia](/assets/cryptodoor-chapter-1-cryptographical-algorithms/Authenticated_Encryption_MtE.png)

- 生成MAC和加密分开进行（Encrypt-and-MAC, EaM）

  ![图片来源：Wikipedia](/assets/cryptodoor-chapter-1-cryptographical-algorithms/Authenticated_Encryption_EaM.png)

目前常见的认证型工作模式有：

- 伽罗瓦/计数器模式（Galois/Counter Mode, GCM）
  - GCM-SIV
- 加密-认证-翻译（Encrypt-Authenticate-Translate, EAX）

###### 填充模式（Padding）

见 [填充模式](#填充模式)

#### 流密码

流密码是对**任意长度数据**进行操作的对称密码系统，输入和输出数据均为字节流。

经典的流密码有：

- 凯撒密码（Caesar Cipher），以及其衍生算法
- 简单异或加密（Simple XOR Cipher）

常见的现代流密码有：

- ChaCha20，Salsa20变种
- ~~RC4~~，已被破解

### 摘要算法

摘要算法，又称密码学哈希算法、散列算法。摘要算法将一串明文映射为一个**固定长度**的、“唯一”的字符串，称为摘要（digest）。

摘要算法可以保证消息的[完整性](#完整性)，但是不能保证消息的[真实性](#真实性)和[不可抵赖性](#不可抵赖性)。

#### 注意

“唯一”被加上双引号，因为没有任何一个摘要算法能**绝对**地实现上述映射，也就是说，这个映射的“唯一性”必然只能存在于某个局部的“情境”之中。

假如说，我需要存储一个网站下所有用户的密码，这就是所谓的“情境”，或者称为上下文（context）。在这个上下文中，假设用户数量对于此摘要算法来说足够少。我们也只能说，在这个上下文中，我们可以将一个优良的摘要算法**视为**一一映射的。

但也有几率，这个映射的“唯一性”被打破，即两个输入被映射到了同一个输出，此时我们称此摘要算法发生了**碰撞**（collision）。

碰撞是不可避免的，我们只能通过设计新摘要算法或优化已有摘要算法来降低碰撞的几率。摘要算法的定义域是任意字符串，而其值域仅包含**固定长度**的字符串。对于这个映射过程，必然在定义域中存在某两个字符串，它们在值域上的映射相同。至于究竟为什么，这就是鸽巢原理：定义域有无穷多个元素，而值域只有有限个元素，不可能存在一一映射。

值得一提的是，摘要的这种“局部唯一”的思想在通用唯一标识符（Universally Unique Identifier, UUID），又称全局唯一标识符（Globally Unique Identifier, GUID）里也大有体现。

#### 抗碰撞性 (Collision Resistance, CR)

##### 分类

- 弱抗碰撞性（Weak Collision Resistance），又称第二原象抗性（Second Preimage Resistance）：对于一个摘要函数$h$，给定一个任意$x$，无法快速计算出一个$y$，使得$x \neq y$ 且 $h(x)=h(y)$。
- 强抗碰撞性（Strong Collision Resistance）：对于一个摘要函数$h$，无法快速找出一对$x,y$，使得$x \neq y$ 且 $h(x)=h(y)$。

##### 典型应用场景

弱抗碰撞性经常需要用在身份验证的场合。假设我们知道用户密码的摘要值，现校验用户是否输入了正确的密码。我们此时需要此摘要函数至少具有弱抗碰撞性。

而如果我们使用摘要作为对象（例如文件）的标识符的话，我们要求此摘要函数具有强抗碰撞性。

#### 常见摘要算法

安全散列算法（Secure Hash Algorithm, SHA）系列：

- SHA-3：SHA3-224、SHA3-256、SHA3-384、SHA3-512、SHAKE128、SHAKE256
- SHA-2：SHA-224、SHA-256、SHA-384、SHA-512
- ~~SHA-1~~，不安全

消息摘要（Message Digest, MD）系列：

- MD6，没有广泛应用
- ~~MD5~~，已被破解
- ~~MD4~~，已被破解
- ~~MD2~~，不安全

### 消息认证算法

消息认证算法接受消息并额外接受一个给定的密钥，只有原消息和密钥均相同时才产生相同的输出。我们将消息认证算法的输出称为**消息认证码**（Message Authentication Code, MAC）。

#### 认证步骤

1. 假设Alice要给Bob发一条消息，Bob想要知道这条消息是否为Alice发出的，且有没有被篡改。
1. Alice事先通过某种方式和Bob确定一个密钥和一个消息认证算法。
1. Alice使用预定的消息认证算法和密钥，为消息生成一个MAC。
1. Alice将消息和MAC同时发送给Bob。
1. Bob使用同样的消息认证算法和密钥，为消息生成一个MAC，如果此MAC和Alice发送的MAC一致，则验证通过。

消息认证算法可以保证消息的[完整性](#完整性)和消息的[真实性](#真实性)，但是不能保证消息的[不可抵赖性](#不可抵赖性)。在上述情景，Bob可以自己用密钥伪造一个Alice从未发送过的消息，并声称Alice向他发送了此消息。

#### 常见消息认证算法

- 散列消息认证码（Hash-based Message Authentication Code, HMAC）
- Poly1305

### 电子签名算法

> 注意，此处所说的电子签名算法为泛指，并非指数字签名算法。

电子签名算法基于[非对称密码系统](#非对称密码系统)。消息发送者使用私钥为一条消息生成签名，通常是对消息的散列值进行加密。消息接收者使用公钥验证此消息的签名，通常是解密此签名，并比对结果是否和消息的散列值是否一致。

电子签名算法可以保证消息的[完整性](#完整性)、消息的[真实性](#真实性)和消息的[不可抵赖性](#不可抵赖性)。

电子签名算法在接收方**不能确定发送方公钥**时，需要依赖电子证书体系，来形成签名的信任链。

假设电子签名算法不使用电子证书，考虑以下情景：

1. Alice准备向Bob发送一条消息，而此时他们的通信被Eve截获——Eve处于中间人的位置。
1. Alice事先生成了一副公、私钥对，并使用她的私钥为消息进行签名。
1. Alice将消息、签名和公钥一并发送给Bob。此时，Eve作为中间人截获了Alice的信息。
1. Eve篡改了Alice的消息，并用Eve自己的私钥对消息进行签名。
1. Eve将篡改的消息、签名和Eve自己的公钥发送给Bob。
1. Bob收到了消息后，发现消息、签名和公钥匹配，而无从察觉Eve篡改了消息。

假设电子签名算法使用了电子证书，再考虑以下情景：

1. Alice准备向Bob发送一条消息，而此时他们的通信被Eve截获——Eve处于中间人的位置。
1. Alice事先生成了一副公、私钥对，并将公钥提交给某个受信任的第三方进行签名，获得了一份有效的电子证书。
1. Alice使用她的私钥为消息进行签名。
1. Alice将消息、签名和证书一并发送给Bob。此时，Eve作为中间人截获了Alice的信息。
1. Eve篡改了Alice的消息，并用Eve自己的私钥对消息进行签名。
1. Eve将篡改的消息、签名和Eve自己的证书发送给Bob。
1. Bob收到了消息后：
   - 假设Eve使用了自签名证书，署名为Alice，那么Bob很容易发现Eve的证书是由某个不受信任的机构签名的，也就是说，Eve伪造的证书未构成信任链。此时，Bob有充分的理由拒绝此消息。
   - 假设Eve也事先向一个受信任的第三方申请了一份证书，那么Bob很容易发现收到的证书的所有者是Eve，而非Alice。Bob也就可以确定，这条消息并非Alice所发送，而是由Eve所发。

常见的电子签名算法有：

- [RSA](#rsa)
- 数字签名算法（Digital Signature Algorithm, DSA），变种有：
  - 椭圆曲线数字签名算法 (Elliptic Curve Digital Signature Algorithm, ECDSA)
  - 爱德华曲线数字签名算法（Edwards-curve Digital Signature Algorithm, EdDSA）：Ed25519、Ed448

### 密钥协商算法

密钥协商算法使得通信双方可以在一个公开信道上确定一个密钥，而其他旁观者无法确定此密钥的具体值。

常见的密钥协商算法大多基于迪非-赫尔曼算法（Diffie-Hellman Algorithm, DH），变种有：椭圆曲线迪非-赫尔曼算法（Elliptic Curve Diffie-Hellman Algorithm, ECDH）

### 伪随机数算法

伪随机数算法生成统计学上分布均匀的伪随机数

一般地，伪随机数算法需要一个初始值来生成一个随机数序列，这个初始值被称为种子（seed）。

伪随机数算法评价标准（[参考文献](/assets/cryptodoor-chapter-1-cryptographical-algorithms/Functionality-Classes-and-Evaluation-Methodology-for-Deterministic-Random-Number-Generators.pdf)）：

- K1 - 随机数序列中包含连续相同元素的可能性很低
- K2 - 使用某些统计学方法，无法辨别产生的序列和真随机序列
- K3 - 攻击者无法使用任意已生成的随机数序列或它们的子序列，计算或猜出后续的序列或者生成器的内部状态
- K4 - 攻击者无法使用生成器的内部状态，计算或猜出之前的序列或者生成器之前的状态

密码学安全的伪随机数算法需要满足K3和K4。

## 0x02 常用加密算法介绍

### 对称加密算法

#### 高级加密标准

高级加密标准（AES）算法是目前普遍使用的对称加密算法，其获得了广泛的硬件加速支持，包括x86，ARM，RISC-V等在内。AES硬件加速最主要且影响最为深远的作用是加速TLS协议，而TLS协议被广泛应用于各个现代Web站点。处理器支持AES指令集可使得网站访问快速且安全。

AES算法的完整定义在[FIPS-197](https://nvlpubs.nist.gov/nistpubs/FIPS/NIST.FIPS.197.pdf)中。

##### 算法简介

AES的块长度为128-bit，密钥长度可选128-bit、192-bit和256-bit。值得一提的是，Rijndael算法本身**还**支持分组长度160-bit、192-bit、224-bit和256-bit，密钥长度160-bit、224-bit ~~，但都被NIST砍了~~。

AES包含四种基本操作，分别是：

- [字节替代](#字节替代)（`SubBytes`）
- [行移位](#行移位)（`ShiftRows`）
- [列混淆](#列混淆)（`MixColumns`）
- [轮密钥加](#轮密钥加)（`AddRoundKey`）

按照定义，AES的所有的矩阵元素均为按列排列的，即元素是从上到下，从左到右排列的。AES的操作全部作用于一个$4 \times 4$的矩阵上，这个矩阵称为状态矩阵（State Matrix）。

AES对不同的密钥长度进行不同轮数的处理：

- AES-128处理10轮；
- AES-192处理12轮；
- AES-256处理14轮；

对于一个$n_r$轮的AES加密过程，处理过程为下：

- 先进行一次$\text{AddRoundKey}$，记为第0轮；
- 对于第$i$轮，$i \in \{1, 2, ..., n_r - 1\}$
  - 如果$i \neq n_r - 1$：$\text{SubBytes}$、$\text{ShiftRows}$、$\text{MixColumns}$、$\text{AddRoundKey}$
  - 如果$i = n_r - 1$：$\text{SubBytes}$、$\text{ShiftRows}$、$\text{AddRoundKey}$

对于一个$n_r$轮的AES解密过程，处理过程为下：

- 先进行一次$\text{AddRoundKey}$，记为第0轮；
- 对于第$i$轮，$i \in \{1, 2, ..., n_r - 1\}$
  - 如果$i \neq n_r - 1$：$\text{ShiftRows}^{-1}$、$\text{SubBytes}^{-1}$、$\text{AddRoundKey}$、$\text{MixColumns}^{-1}$
  - 如果$i = n_r - 1$：$\text{ShiftRows}^{-1}$、$\text{SubBytes}^{-1}$、$\text{AddRoundKey}$

其中，$^{-1}$表示逆函数。

注意，解密时轮密钥也必须是逆序使用的：即对于第$i$轮加/解密，如果加密时使用第$i$组轮密钥，那么解密时需要使用第$(n_r - i - 1)$组轮密钥。

##### 字节替代

S盒的构造方法请参见FIPS-197, Section 5.1.1。

S盒的使用：

- 加密时，$\text{SubBytes}$通过S盒（S-Box）进行字节的映射，以增加算法的**混淆性**。
- 解密时，$\text{SubBytes}^{-1}$使用逆S盒（Inverse S-Box），将映射后的字节恢复。

例如，现有字节`0x00`，我们将`0x00`作为S盒下标，得到映射为`0x63`；`0x63`再通过逆S盒，用同样的方法可以映射为`0x00`。

S盒和逆S盒的内容：

```c title="SBox.h"
#ifndef AES_SBOX_H
#define AES_SBOX_H

#include <inttypes.h>

// S-Box
const uint8_t S_BOX[256] = {
    0x63, 0x7c, 0x77, 0x7b, 0xf2, 0x6b, 0x6f, 0xc5, 0x30, 0x01, 0x67, 0x2b, 0xfe, 0xd7, 0xab, 0x76,
    0xca, 0x82, 0xc9, 0x7d, 0xfa, 0x59, 0x47, 0xf0, 0xad, 0xd4, 0xa2, 0xaf, 0x9c, 0xa4, 0x72, 0xc0,
    0xb7, 0xfd, 0x93, 0x26, 0x36, 0x3f, 0xf7, 0xcc, 0x34, 0xa5, 0xe5, 0xf1, 0x71, 0xd8, 0x31, 0x15,
    0x04, 0xc7, 0x23, 0xc3, 0x18, 0x96, 0x05, 0x9a, 0x07, 0x12, 0x80, 0xe2, 0xeb, 0x27, 0xb2, 0x75,
    0x09, 0x83, 0x2c, 0x1a, 0x1b, 0x6e, 0x5a, 0xa0, 0x52, 0x3b, 0xd6, 0xb3, 0x29, 0xe3, 0x2f, 0x84,
    0x53, 0xd1, 0x00, 0xed, 0x20, 0xfc, 0xb1, 0x5b, 0x6a, 0xcb, 0xbe, 0x39, 0x4a, 0x4c, 0x58, 0xcf,
    0xd0, 0xef, 0xaa, 0xfb, 0x43, 0x4d, 0x33, 0x85, 0x45, 0xf9, 0x02, 0x7f, 0x50, 0x3c, 0x9f, 0xa8,
    0x51, 0xa3, 0x40, 0x8f, 0x92, 0x9d, 0x38, 0xf5, 0xbc, 0xb6, 0xda, 0x21, 0x10, 0xff, 0xf3, 0xd2,
    0xcd, 0x0c, 0x13, 0xec, 0x5f, 0x97, 0x44, 0x17, 0xc4, 0xa7, 0x7e, 0x3d, 0x64, 0x5d, 0x19, 0x73,
    0x60, 0x81, 0x4f, 0xdc, 0x22, 0x2a, 0x90, 0x88, 0x46, 0xee, 0xb8, 0x14, 0xde, 0x5e, 0x0b, 0xdb,
    0xe0, 0x32, 0x3a, 0x0a, 0x49, 0x06, 0x24, 0x5c, 0xc2, 0xd3, 0xac, 0x62, 0x91, 0x95, 0xe4, 0x79,
    0xe7, 0xc8, 0x37, 0x6d, 0x8d, 0xd5, 0x4e, 0xa9, 0x6c, 0x56, 0xf4, 0xea, 0x65, 0x7a, 0xae, 0x08,
    0xba, 0x78, 0x25, 0x2e, 0x1c, 0xa6, 0xb4, 0xc6, 0xe8, 0xdd, 0x74, 0x1f, 0x4b, 0xbd, 0x8b, 0x8a,
    0x70, 0x3e, 0xb5, 0x66, 0x48, 0x03, 0xf6, 0x0e, 0x61, 0x35, 0x57, 0xb9, 0x86, 0xc1, 0x1d, 0x9e,
    0xe1, 0xf8, 0x98, 0x11, 0x69, 0xd9, 0x8e, 0x94, 0x9b, 0x1e, 0x87, 0xe9, 0xce, 0x55, 0x28, 0xdf,
    0x8c, 0xa1, 0x89, 0x0d, 0xbf, 0xe6, 0x42, 0x68, 0x41, 0x99, 0x2d, 0x0f, 0xb0, 0x54, 0xbb, 0x16
};

// Inverse S-Box
const uint8_t S_BOX_INV[256] = {
    0x52, 0x09, 0x6a, 0xd5, 0x30, 0x36, 0xa5, 0x38, 0xbf, 0x40, 0xa3, 0x9e, 0x81, 0xf3, 0xd7, 0xfb,
    0x7c, 0xe3, 0x39, 0x82, 0x9b, 0x2f, 0xff, 0x87, 0x34, 0x8e, 0x43, 0x44, 0xc4, 0xde, 0xe9, 0xcb,
    0x54, 0x7b, 0x94, 0x32, 0xa6, 0xc2, 0x23, 0x3d, 0xee, 0x4c, 0x95, 0x0b, 0x42, 0xfa, 0xc3, 0x4e,
    0x08, 0x2e, 0xa1, 0x66, 0x28, 0xd9, 0x24, 0xb2, 0x76, 0x5b, 0xa2, 0x49, 0x6d, 0x8b, 0xd1, 0x25,
    0x72, 0xf8, 0xf6, 0x64, 0x86, 0x68, 0x98, 0x16, 0xd4, 0xa4, 0x5c, 0xcc, 0x5d, 0x65, 0xb6, 0x92,
    0x6c, 0x70, 0x48, 0x50, 0xfd, 0xed, 0xb9, 0xda, 0x5e, 0x15, 0x46, 0x57, 0xa7, 0x8d, 0x9d, 0x84,
    0x90, 0xd8, 0xab, 0x00, 0x8c, 0xbc, 0xd3, 0x0a, 0xf7, 0xe4, 0x58, 0x05, 0xb8, 0xb3, 0x45, 0x06,
    0xd0, 0x2c, 0x1e, 0x8f, 0xca, 0x3f, 0x0f, 0x02, 0xc1, 0xaf, 0xbd, 0x03, 0x01, 0x13, 0x8a, 0x6b,
    0x3a, 0x91, 0x11, 0x41, 0x4f, 0x67, 0xdc, 0xea, 0x97, 0xf2, 0xcf, 0xce, 0xf0, 0xb4, 0xe6, 0x73,
    0x96, 0xac, 0x74, 0x22, 0xe7, 0xad, 0x35, 0x85, 0xe2, 0xf9, 0x37, 0xe8, 0x1c, 0x75, 0xdf, 0x6e,
    0x47, 0xf1, 0x1a, 0x71, 0x1d, 0x29, 0xc5, 0x89, 0x6f, 0xb7, 0x62, 0x0e, 0xaa, 0x18, 0xbe, 0x1b,
    0xfc, 0x56, 0x3e, 0x4b, 0xc6, 0xd2, 0x79, 0x20, 0x9a, 0xdb, 0xc0, 0xfe, 0x78, 0xcd, 0x5a, 0xf4,
    0x1f, 0xdd, 0xa8, 0x33, 0x88, 0x07, 0xc7, 0x31, 0xb1, 0x12, 0x10, 0x59, 0x27, 0x80, 0xec, 0x5f,
    0x60, 0x51, 0x7f, 0xa9, 0x19, 0xb5, 0x4a, 0x0d, 0x2d, 0xe5, 0x7a, 0x9f, 0x93, 0xc9, 0x9c, 0xef,
    0xa0, 0xe0, 0x3b, 0x4d, 0xae, 0x2a, 0xf5, 0xb0, 0xc8, 0xeb, 0xbb, 0x3c, 0x83, 0x53, 0x99, 0x61,
    0x17, 0x2b, 0x04, 0x7e, 0xba, 0x77, 0xd6, 0x26, 0xe1, 0x69, 0x14, 0x63, 0x55, 0x21, 0x0c, 0x7d
};

#endif //AES_SBOX_H
```

###### 代码实现

```c title="SubBytes.c"
#include "include/SubBytes.h"
#include "include/SBox.h"

errno_t subBytes(uint8_t *matrix, size_t sizeMatrix, bool inverse)
{
    if (!matrix)
        return EFAULT;

    for (size_t i = 0; i < sizeMatrix; ++i)
        matrix[i] = inverse ? S_BOX_INV[matrix[i]] : S_BOX[matrix[i]];

    return 0;
}

```

##### 行移位

行移位提供了算法的**扩散性**。

- 正向行移位：状态矩阵第$i$行以**字节**为单位，**循环左移**$i$单位，$i \in \{0, 1, 2, 3\}$。
- 逆向行移位：状态矩阵第$i$行以**字节**为单位，**循环右移**$i$单位，$i \in \{0, 1, 2, 3\}$。

图示：

![来源：Wikipedia](/assets/cryptodoor-chapter-1-cryptographical-algorithms/AES-ShiftRows.svg)

###### 代码实现

```c title="ShiftRows.c"
#include "include/ShiftRows.h"

static int modulo(int32_t n, int32_t m)
{
    return n - m * (int) floor((double) n / m);
}

// External function
errno_t shiftRows(uint8_t *matrix, size_t sizeMatrix, bool inverse)
{
    if (matrix == NULL)
        return EFAULT;    // Bad address
    if (sizeMatrix < 16)
        return EINVAL;    // Bad length

    uint8_t t[16];
    int8_t sign = inverse ? -1 : 1;

    for (int32_t i = 0; i < 4; ++i)
        for (int32_t j = 0; j < 4; ++j)
            t[i * 4 + j] = matrix[i * 4 + modulo(j + sign * i, 4)];

    return memcpy_s(matrix, sizeMatrix, t, sizeMatrix);
}
```

##### 列混淆

列混淆同样提供了算法的**扩散性**。

- 正向列混淆：混淆矩阵$M$*左乘*状态矩阵。
- 逆向列混淆：逆混淆矩阵$M^{-1}$*左乘*状态矩阵。

###### 特殊的矩阵乘法

细心的读者（如果有的话）或许已经发现，上述文字的*左乘*使用了斜体，这是因为这个*左乘*不是一般意义上的矩阵乘法。

###### 有限域（Finite Field）

域，是加、减、乘和除运算都定义良好且满足特定规则的一个集合。

例如：

- 全体有理数就是一个域；
- $\mathbb{Z}_p$，或更正式地记作$\mathbb{Z} / p \mathbb{Z}$，称作整数$p$模环（ring of integers modulo $p$）。当$p$是一个质数，$\mathbb{Z} / p \mathbb{Z}$也是一个域。因为$p$是质数，那么域$\mathbb{Z} / p \mathbb{Z}$中的每个元素都有一个乘法逆元，这样就满足了域必须有除法定义的要求 ~~（啊熟悉的离散，我爱离散数学，但是我学不会（这是masochism吗（大雾~~。这其实也就是接下来要说明的有限域的一种，$\text{GF}(p^1)$。

有限域，或称伽罗瓦域（Galois Field），是一个具有有限元素的域。有限域的元素数称为阶（order）。

定理：有限域的阶数必定是$p^n$，其中$p$是一个质数，$n$是一个正整数。有限域记为$\text{GF}(p^n)$。

二元域（Binary Field），是阶为2的有限域，记作$\text{GF}(2)$。整个域只有两个元素（0和1）。域中的加法即为异或（XOR）操作。域中的乘法即为与（AND）操作。

阶为$2^n$的有限域，记为$\text{GF}(2^n)$。我们使用多项式的基本表示法构造$\text{GF}(2^n)$：

$$
\text{GF}(2^n) = \{ \sum_{i=0}^{n-1}{a_ix^i} \}, a_i \in \text{GF}(2)
$$

自然地，$\text{GF}(2^n)$中的多项式有$2^n$个，并且它们的阶数不超过$n-1$。

因为多项式的系数仅在$\text{GF}(2)=\{0,1\}$中取值，我们隐去多项式的未知数部分，而只使用多项式的二进制系数来表示这些多项式，这样的表示法称为二进制数表示法。因此$\text{GF}(2^n)$在计算机科学中有广泛应用。例如，在$\text{GF}(2^4)$中，有多项式$x^3+x^1+1$。我们可以简易地使用二进制数$(1011)_2$，或十六进制数$(\text{B})_{16}$来表示此多项式。

###### $\text{GF}(2^n)$加法

在$\text{GF}(2^n)$中，多项式的加法需要**多项式系数模2**，等效于多项式系数做异或（XOR）运算，也等效于它们的二进制数表示法做**按位异或**（XOR）运算。

举个栗子，在$\text{GF}(2^4)$中，$(x^2+x+1)+(x+1)=x^2+2x+2$，而由于系数是仅在$\text{GF}(2)=\{0,1\}$中取值，多项式系数需要模2，我们得到最终的结果为$x^2$。而在对应的二进制数表示法下，我们对应有$(0111)_2 \oplus (0011)_2=(0100)_2$。

###### $\text{GF}(2^n)$乘法

在$\text{GF}(2^n)$中，多项式的乘法也需要**多项式系数模2**。但是乘法有可能得出**度比$n-1$大**的结果多项式。所以乘法比加法还多出一个步骤，就是需要结果多项式模另外一个不可约多项式，称为最小多项式（Minimum Polynomial），使得结果多项式的度小于$n$。

最小多项式需要被作为一个特定有限域的参数，即描述一个有限域时不仅仅需要描述它的阶数，而且需要描述这个有限域采用的最小多项式。

举个栗子，有有限域$\text{GF}(2^3)$，最小多项式$m(x)=x^3+x+1$。我们需要计算$(x^2+x+1) \cdot (x^2+1)$在有限域中的值。

1. $(x^2+x+1) \cdot (x^2+1)=x^4+x^3+2x^2+x+1$；
1. 系数模2后，我们得到$x^4+x^3+x+1$；
1. 我们发现，此结果多项式中出现了$x^4$和$x^3$项，不在有限域中。所以我们需要对其模$m(x)$；
1. $x^4+x^3+x+1 \equiv x^2+x \pmod{m(x)=x^3+x+1}$；

   请注意，多项式的系数处于$\text{GF}(2)$中。所以在使用长除法计算多项式余数时，需要注意减法相当于异或（XOR）运算。

1. 所以，我们得到了$(x^2+x+1) \cdot (x^2+1)$在有限域中的值，为$x^2+x$。

同样地，$\text{GF}(2^n)$乘法也可以在计算机中快速计算：模拟长除法。

继续考虑以上的栗子，我们将多项式们的二进制表示写出来：我们需要在$(1011)_2$下计算$(111)_2 \cdot (101)_2$。

1. 首先计算乘法：$(111)_2 \cdot (101)_2=(11011)_2$；

   请再次注意，在使用竖式计算乘法时，依然使用异或操作代替加法。

1. 然后我们进行**长除法**：$(11011)_2 / (1011)_2$

   注意，此处的长除法也需要使用按位异或代替减法。

   步骤：
   1. 将$(1011)_2$左移一位（$(10110)_2$），和被除数对齐；
   1. 计算$(11011)_2 \oplus (10110)_2 = (1101)_2$；
   1. 计算$(1101)_2 \oplus (1011)_2 = (110)_2$。

1. 我们得到结果多项式的二进制表示为$(110)_2$，即$x^2+x$。

###### Rijndael有限域

列混淆的矩阵乘法是定义在Rijndael有限域上的。

Rijndael有限域是一个$\text{GF}(2^8)$域，且最小多项式为$x^8+x^4+x^3+x+1$（$(100011011)_2$）

矩阵的每个元素的大小都是一字节，而一个字节有8位，共$2^8=256$种可能。

矩阵乘法可以被拆解成标量加法和标量乘法。加法使用$\text{GF}(2^8)$加法，可以用按位异或（XOR）运算进行运算。乘法使用$\text{GF}(2^8)$乘法，可以使用乘法和移位异或进行运算。

混淆矩阵$M$：

$$
M=
\begin{bmatrix}
2 & 3 & 1 & 1 \\
1 & 2 & 3 & 1 \\
1 & 1 & 2 & 3 \\
3 & 1 & 1 & 2
\end{bmatrix}
$$

混淆矩阵的逆$M^{-1}$：

$$
M^{-1}=
\begin{bmatrix}
14 & 11 & 13 & 9 \\
9 & 14 & 11 & 13 \\
13 & 9 & 14 & 11 \\
11 & 13 & 9 & 14
\end{bmatrix}
$$

混淆矩阵和它的逆的构造请参见FIPS-197, Section 5.1.3。

###### 代码实现（未优化，完全按照上述算法实现）

```c title="MixColumns.c"
#include "include/MixColumns.h"

static uint8_t countBinaryDigit(uint64_t n)
{
    uint8_t r = 0;
    while (n)
    {
        ++r;
        n >>= 1;
    }
    return r;
}

static uint8_t rijndaelAdd(uint8_t a, uint8_t b)
{
    return a ^ b;
}

static uint8_t rijndaelMultiply(uint8_t a, uint8_t b)
{
    uint16_t m           = 0x011b;    // 0b0000 0001 0001 1011
    uint8_t  mDigitCount = 9;

    // Calculate the product of a and b (XOR as addition)
    uint16_t aExpand = a, bExpand = b;
    uint16_t product = 0;
    while (bExpand)
    {
        product ^= (bExpand & 0x1) * aExpand;
        bExpand >>= 1;
        aExpand <<= 1;
    }

    uint8_t productDigitCount = countBinaryDigit(product);

    // Check if reduction is needed
    if (productDigitCount >= mDigitCount)
    {
        uint8_t shiftCount = productDigitCount - mDigitCount;
        m <<= shiftCount;

        // Simulate long division
        do
        {
            // If the algorithm does not reach to the end AND the MSB of `product` is 1
            if (productDigitCount - shiftCount >= mDigitCount && (product & (0x1 << (shiftCount + mDigitCount - 1))))
                product ^= m;
            m >>= 1;
        }
        while (shiftCount-- > 0);
        // We need to loop one more time when the digit count of `product` and `m` are the same.
    }

    return (uint8_t) product;
}

static errno_t matrixMultiply(
    const uint8_t *leftMatrix,
    const uint8_t *rightMatrix,
    uint8_t *resultMatrix,
    uint8_t (*add)(uint8_t a, uint8_t b),
    uint8_t (*multiply)(uint8_t a, uint8_t b))
{
    if (leftMatrix == NULL || rightMatrix == NULL || resultMatrix == NULL || add == NULL || multiply == NULL)
        return EFAULT;    // Bad address
    else
    {
        for (size_t i = 0; i < 4; ++i)
            for (size_t j = 0; j < 4; ++j)
            {
                size_t t = i * 4 + j;
                resultMatrix[t] = 0;
                // Dot product for two vectors
                for (size_t k       = 0; k < 4; ++k)
                    resultMatrix[t] = add(resultMatrix[t], multiply(leftMatrix[i * 4 + k], rightMatrix[k * 4 + j]));
            }
        return 0;
    }
}

// External function
errno_t mixColumns(uint8_t *matrix, size_t sizeMatrix, bool inverse)
{
    static const uint8_t M[16]     = {
        0x02, 0x03, 0x01, 0x01,
        0x01, 0x02, 0x03, 0x01,
        0x01, 0x01, 0x02, 0x03,
        0x03, 0x01, 0x01, 0x02
    };
    static const uint8_t M_INV[16] = {
        0x0e, 0x0b, 0x0d, 0x09,
        0x09, 0x0e, 0x0b, 0x0d,
        0x0d, 0x09, 0x0e, 0x0b,
        0x0b, 0x0d, 0x09, 0x0e
    };

    if (matrix == NULL || sizeMatrix != 16)
        return EFAULT;    // Bad address
    if (sizeMatrix < 16)
        return EINVAL;    // Bad length

    errno_t e;
    uint8_t resultMatrix[16];

    if (inverse)
        e = matrixMultiply(M_INV, matrix, resultMatrix, rijndaelAdd, rijndaelMultiply);
    else
        e = matrixMultiply(M, matrix, resultMatrix, rijndaelAdd, rijndaelMultiply);

    if (e)
        return e;
    else
        return memcpy_s(matrix, 16, resultMatrix, 16);
}
```

##### 密钥扩展

要了解轮密钥加，就先要了解AES的密钥扩展算法。AES使用给定的密钥扩展算法将密钥扩展为**轮密钥**，即各轮加密时使用的密钥。

步骤：

1. 假设密钥$k$长度为$l_k$ bit，$l_k \in \{128, 192, 256\}$。
1. 将密钥按字节按列装填至$4 \times n$矩阵$K$中，下称密钥矩阵，其中$n = l_k / 32$。设密钥的第$i$个字节为$k_i$，$i \in \{0, 1, ..., 4n - 1\}$，则装填后的密钥矩阵类似

   $$
   K=
   \begin{bmatrix}
   k_0 & k_4 & ... & k_{4n - 4} \\
   k_1 & k_5 & ... & k_{4n - 3} \\
   k_2 & k_6 & ... & k_{4n - 2} \\
   k_3 & k_7 & ... & k_{4n - 1}
   \end{bmatrix}
   $$

   4来自于AES的块大小：4个双字（`DWORD`，a.k.a. `uint32_t`），128-bit。

1. 设密钥矩阵$K$的第$i$列为$k_{d_i}$，那么$K$可写作元素为双字的一个向量：

   $$
   K=
   \begin{bmatrix}
   k_{d_0} & k_{d_1} & ... & k_{d_{n - 1}}
   \end{bmatrix}
   $$

1. 设$n_r$为轮密钥的个数（同时也是加密的**总轮数**，包括第0轮），则$n_r = n + 7$。
1. 设轮密钥组$R$为一个长度为$4n_r$的向量，且
   - $R$的第$4i$列到$4i + 3$列即是第$i$轮加密所需要的轮密钥，$i \in \{0, 1, ..., n_r - 1\}$
   - $R$的每个元素都是双字。
1. 我们将$R$的每一个元素编号为$r_i$，$i \in \{0, 1, ..., 4n_r - 1\}$，则

   $$
   r_i =
   \begin{cases}
   k_{d_i}, & \text{if } i < n \\
   r_{i - n} \oplus \text{SubWord}(\text{RotWord}(r_{i - 1})) \oplus rcon_{\lfloor i / n \rfloor}, & \text{if } i \geq n \text{ and } i \equiv 0 \pmod{n} \\
   r_{i - n} \oplus \text{SubWord}(r_{i-1}), & \text{if } i \geq n, n > 6 \text{ and } i \equiv 4 \pmod{n} \\
   r_{i - n} \oplus r_{i - 1}, & \text{otherwise}
   \end{cases}
   $$

其中：

- $\text{SubWord}$函数将每个**字节**进行S盒映射。
- $\text{RotWord}$函数将输入**向左**移动**一个字节**。
- $rcon$是一个常量数组，其中的每一个元素都是双字。其内容定义为：

  $$
  rcon_i =
  \begin{pmatrix}
  rc_i & (00)_{16} & (00)_{16} & (00)_{16}
  \end{pmatrix}
  $$

$rc_i = (02) ^ {i - 1}$，定义在**Rijndael有限域**上。具体的生成算法由下面的递推式定义：

$$
rc_i =
\begin{cases}
0 & \text{if } i = 0 \\
1 & \text{if } i = 1 \\
2rc_{i - 1} & \text{if } i > 1 \text{ and } rc_{i - 1} < (80)_{16} \\
2rc_{i - 1} \oplus (\text{11B})_{16} & \text{if } i > 1 \text{ and } rc_{i - 1} \geq (80)_{16}
\end{cases}
$$

由于$r_i$的范围，我们最多只使用到$rcon_{10}$，所以我们可以将数组硬编码。由于$rcon$的每个元素都有大量的填充（padding）0，我们只需要编码$rc_i$即可。

$$
rc_i =
\begin{bmatrix}
(00)_{16} & (01)_{16} & (02)_{16} & (04)_{16} & (08)_{16} & (10)_{16} & (20)_{16} & (40)_{16} & (80)_{16} & (\text{1B})_{16} & (36)_{16}
\end{bmatrix}
$$

##### 轮密钥加

知道了怎么扩展密钥，轮密钥加就很好理解了。轮密钥加就是将轮密钥和每轮的状态矩阵异或。

注意，回顾一下[总体步骤](#高级加密标准)，我们先将$i = 0$时的轮密钥和状态矩阵异或一次，再从$i = 1$开始进行真正的加密过程。所以在生成轮密钥的时候，生成的轮密钥数要比加密轮数多1。

轮密钥加是对称的，即轮密钥加的正向过程和反向过程相同。

###### 代码实现

这里我将密钥矩阵按行装填，并且按字节存储，没有打包成双字。所以对于每一个$i$，$i \in [0, n + 7)$, `roundKeys[i * 16]`到`roundKeys[(i + 1) * 16]`（不含）之间就是对应第$i$轮的轮密钥。

没有按定义那样按列装填密钥到矩阵并打包成双字的原因如下：

- 按行装填的矩阵在下标计算上比按列装填的矩阵更容易，并且两者在此处其实是等效的：仔细想想就会发现，定义上进行打包实际上是将矩阵按列向量进行操作，那我们在此处按行向量进行操作是一样的；
- 打包成双字其实并不利于计算，因为状态矩阵是按字节存储的，使用时还需要将轮密钥解包，或者进行繁琐的位运算。

```c title="AddRoundKey.c"
#include "include/SubBytes.h"
#include "include/AddRoundKey.h"

#define DWORD_ROW_INDEX_TO_OFFSET(rowIndex) ((rowIndex) * 4)

static const uint8_t rc[] = {
    0x00, 0x01, 0x02, 0x04, 0x08, 0x10, 0x20, 0x40, 0x80, 0x1b, 0x36
};

static uint8_t *subWord(uint8_t *dword)
{
    subBytes(dword, 4, false);
    return dword;
}

static uint8_t *rotWord(uint8_t *dword)
{
    uint8_t t = dword[0];

    dword[0] = dword[1];
    dword[1] = dword[2];
    dword[2] = dword[3];
    dword[3] = t;

    return dword;
}

// External functions
errno_t expandRoundKey(AESKeyLength keyLength, uint8_t *roundKeys, size_t sizeRoundKeys)
{
    if (roundKeys == NULL)
        return EFAULT;
    else
    {
        // n is the length of key in DWORD (a.k.a. uint32_t)
        size_t n = 0;

        switch (keyLength)
        {
            case AES_KL_128:
                n = 128 / 32;
                break;
            case AES_KL_192:
                n = 192 / 32;
                break;
            case AES_KL_256:
                n = 256 / 32;
                break;
            default:
                break;
        }

        /*
         * There are (n + 7) rounds. Each round consume a round key of 16 * 16 bytes.
         * Therefore, the total size of round key is (n + 7) * 4 * 4 bytes.
         */
        if (sizeRoundKeys < (n + 7) * 16)
            return EINVAL;

        /*
         * We assume that the key is loaded by row, rather than column,
         * since indices of rows are easier to calculate.
         *
         * We assume that a seed key is loaded in `roundKeys`,
         * so we are skipping the situation where rowIndex = 0 to n - 1.
         *
         * We are doing expansion in byte, rather than in DWORD,
         * so the algorithm has to be modified slightly.
         */
        for (size_t rowIndex = n; rowIndex < (n + 7) * 4; ++rowIndex)
        {
            if (!(rowIndex % n))
            {
                uint8_t previousRow[4];

                errno_t e = memcpy_s(previousRow, 4,
                                     roundKeys + DWORD_ROW_INDEX_TO_OFFSET(rowIndex - 1), 4);
                if (e)
                    return e;

                subWord(rotWord(previousRow));

                for (size_t i = 0; i < 4; ++i)
                {
                    roundKeys[DWORD_ROW_INDEX_TO_OFFSET(rowIndex) + i] =
                        roundKeys[DWORD_ROW_INDEX_TO_OFFSET(rowIndex - n) + i] ^
                        previousRow[i] ^
                        (i ? 0x00 : rc[rowIndex / n]);
                    // If i == 0, XOR with rc[i / n]; otherwise XOR with 0x00 (unchanged)
                }
            }
            else if (n > 6 && rowIndex % n == 4)
            {
                uint8_t previousRow[4];

                errno_t e = memcpy_s(previousRow, 4,
                                     roundKeys + DWORD_ROW_INDEX_TO_OFFSET(rowIndex - 1), 4);
                if (e)
                    return e;

                subWord(previousRow);

                for (size_t i = 0; i < 4; ++i)
                {
                    roundKeys[DWORD_ROW_INDEX_TO_OFFSET(rowIndex) + i] =
                        roundKeys[DWORD_ROW_INDEX_TO_OFFSET(rowIndex - n) + i] ^ previousRow[i];
                }
            }
            else
            {
                for (size_t i = 0; i < 4; ++i)
                {
                    roundKeys[DWORD_ROW_INDEX_TO_OFFSET(rowIndex) + i] =
                        roundKeys[DWORD_ROW_INDEX_TO_OFFSET(rowIndex - n) + i] ^
                        roundKeys[DWORD_ROW_INDEX_TO_OFFSET(rowIndex - 1) + i];
                }
            }
        }

        return 0;
    }
}

// Main procedure
errno_t addRoundKey(
    uint8_t *matrix, size_t sizeMatrix,
    const uint8_t *roundKeys, size_t sizeRoundKeys,
    size_t round)
{
    if (matrix == NULL || roundKeys == NULL)
        return EFAULT;
    if (sizeMatrix < 16)
        return EINVAL;
    if (sizeRoundKeys == 0 || sizeRoundKeys < (round + 1) * 16)
        return EINVAL;

    for (size_t i = 0; i < 4; ++i)
        for (size_t j = 0; j < 4; ++j)
            matrix[i * 4 + j] ^= roundKeys[round * 16 + j * 4 + i];

    return 0;
}
```

##### 主程序

注：我实现的版本的密钥、轮密钥、明文和密文矩阵都是按行排列的，并没有AES的定义要求做，因为我觉得这样更符合人的使用习惯。`encrypt`和`decrypt`函数会在内部对矩阵转置，再进行操作。

```c title="AES.c"
#include "include/AES.h"

#include "include/SubBytes.h"
#include "include/ShiftRows.h"
#include "include/MixColumns.h"

errno_t encrypt(const uint8_t *plain,
                size_t sizePlain,
                uint8_t *cipher,
                size_t sizeCipher,
                const uint8_t *roundKeys,
                size_t sizeRoundKeys,
                AESKeyLength keyLength)
{
    if (!(plain && cipher && roundKeys))
        return EFAULT;
    if (sizePlain < 16 || sizeCipher < 16)
        return EINVAL;

    size_t n = 0;
    switch (keyLength)
    {
        case AES_KL_128:
            n = 128 / 32;
            break;
        case AES_KL_192:
            n = 192 / 32;
            break;
        case AES_KL_256:
            n = 256 / 32;
            break;
        default:
            break;
    }
    if (sizeRoundKeys < (n + 7) * 16)
        return EINVAL;

    size_t round = 0;

    errno_t e = memcpy_s(cipher, sizeCipher, plain, sizePlain);
    if (e)
        return e;

    // Transpose the state matrix: we assumed that the plain text is loaded by row.
    for (size_t i = 0; i < 4; ++i)
        for (size_t j = 0; j < i; ++j)
        {
            uint8_t t = cipher[i * 4 + j];
            cipher[i * 4 + j] = cipher[j * 4 + i];
            cipher[j * 4 + i] = t;
        }

    e = addRoundKey(cipher, sizeCipher, roundKeys, sizeRoundKeys, round++);
    if (e)
        return e;

    while (round < n + 7)
    {
        e = subBytes(cipher, sizeCipher, false);
        if (e)
            return e;

        e = shiftRows(cipher, sizeCipher, false);
        if (e)
            return e;

        if (round != n + 7 - 1)
        {
            e = mixColumns(cipher, sizeCipher, false);
            if (e)
                return e;
        }

        e = addRoundKey(cipher, sizeCipher, roundKeys, sizeRoundKeys, round++);
        if (e)
            return e;
    }

    // Transpose back the state matrix: the cipher is also need to be consistent with the plain text in terms of format.
    for (size_t i = 0; i < 4; ++i)
        for (size_t j = 0; j < i; ++j)
        {
            uint8_t t = cipher[i * 4 + j];
            cipher[i * 4 + j] = cipher[j * 4 + i];
            cipher[j * 4 + i] = t;
        }

    return 0;
}

errno_t decrypt(const uint8_t *cipher,
                size_t sizeCipher,
                uint8_t *plain,
                size_t sizePlain,
                const uint8_t *roundKeys,
                size_t sizeRoundKeys,
                AESKeyLength keyLength)
{
    if (!(plain && cipher && roundKeys))
        return EFAULT;
    if (sizePlain < 16 || sizeCipher < 16)
        return EINVAL;

    size_t n = 0;
    switch (keyLength)
    {
        case AES_KL_128:
            n = 128 / 32;
            break;
        case AES_KL_192:
            n = 192 / 32;
            break;
        case AES_KL_256:
            n = 256 / 32;
            break;
        default:
            break;
    }
    if (sizeRoundKeys < (n + 7) * 16)
        return EINVAL;

    size_t round = n + 7 - 1;

    errno_t e = memcpy_s(plain, sizePlain, cipher, sizeCipher);
    if (e)
        return e;

    // Transpose the state matrix: we assumed that the cipher text is loaded by row.
    for (size_t i = 0; i < 4; ++i)
        for (size_t j = 0; j < i; ++j)
        {
            uint8_t t = plain[i * 4 + j];
            plain[i * 4 + j] = plain[j * 4 + i];
            plain[j * 4 + i] = t;
        }

    e = addRoundKey(plain, sizePlain, roundKeys, sizeRoundKeys, round);
    if (e)
        return e;

    while (round > 0)
    {
        e = shiftRows(plain, sizePlain, true);
        if (e)
            return e;

        e = subBytes(plain, sizePlain, true);
        if (e)
            return e;

        e = addRoundKey(plain, sizePlain, roundKeys, sizeRoundKeys, --round);
        if (e)
            return e;

        if (round)
        {
            e = mixColumns(plain, sizePlain, true);
            if (e)
                return e;
        }
    }

    // Transpose back the state matrix: the plain text is also need to be consistent with the cipher in terms of format.
    for (size_t i = 0; i < 4; ++i)
        for (size_t j = 0; j < i; ++j)
        {
            uint8_t t = plain[i * 4 + j];
            plain[i * 4 + j] = plain[j * 4 + i];
            plain[j * 4 + i] = t;
        }

    return 0;
}
```

##### 测试用驱动程序

此程序按照FIPS-197, 附录C的内容对算法进行测试

```c title="main.c"
/*
 * Carrying out FIPS-197 specified tests.
 */

#include <stdio.h>

#include "include/AES.h"

#define TEST_KEY_LENGTH 32    // Option: 16, 24, or 32 bytes
#define TEST_KEY_LENGTH_ENUM AES_KL_256

static void printMatrix(uint8_t *matrix, size_t sizeMatrix);

int main(void)
{
    static uint8_t key[TEST_KEY_LENGTH];
    static uint8_t plain[16];
    static uint8_t cipher[16];
    static uint8_t roundKeys[(TEST_KEY_LENGTH / 4 + 7) * 16];

    for (size_t i = 0; i < sizeof(key); ++i)
        key[i] = (uint8_t) i;
    puts("Key matrix:");
    printMatrix(key, sizeof(key));

    for (size_t i = 0; i < sizeof(plain); ++i)
        plain[i] = (uint8_t) ((i << 4) + i);
    puts("Plain text matrix:");
    printMatrix(plain, sizeof(plain));

    errno_t e;

    memcpy_s(roundKeys, sizeof(roundKeys), key, sizeof(key));
    e = expandRoundKey(TEST_KEY_LENGTH_ENUM, roundKeys, sizeof(roundKeys));
    if (e)
    {
        fprintf(stderr, "Error code: %d", e);
        return e;
    }
    puts("Expanded round key matrix:");
    printMatrix(roundKeys, sizeof(roundKeys));

    printf("AES-%d encryption test:\n", TEST_KEY_LENGTH * 8);
    e = encrypt(plain, sizeof(plain), cipher, sizeof(cipher), roundKeys, sizeof(roundKeys), TEST_KEY_LENGTH_ENUM);
    if (e)
    {
        fprintf(stderr, "Error code: %d", e);
        return e;
    }
    puts("Cipher text matrix:");
    printMatrix(cipher, sizeof(cipher));

    printf("AES-%d decryption test:\n", TEST_KEY_LENGTH * 8);
    e = decrypt(cipher, sizeof(cipher), plain, sizeof(plain), roundKeys, sizeof(roundKeys), TEST_KEY_LENGTH_ENUM);
    if (e)
    {
        fprintf(stderr, "Error code: %d", e);
        return e;
    }
    puts("Plain text matrix:");
    printMatrix(plain, sizeof(plain));

    return 0;
}

void printMatrix(uint8_t *matrix, size_t sizeMatrix)
{
    if (!(matrix && sizeMatrix))
        return;

    for (size_t i = 0; i < sizeMatrix; ++i)
    {
        printf("0x%02hhx ", matrix[i]);
        if (i % 4 == 3)
            putchar('\n');
    }
}
```

##### 完整CLion工程

详见[我的Github](https://github.com/wxx9248/AES.c)

### 非对称加密算法

> Tip：非对称加密算法通常并不直接用于加密数据，而是用于加密对称密钥

#### RSA

RSA是目前普遍使用的非对称加密和签名算法之一。它实现简单，兼容性好，但是有被椭圆曲线类算法取代的趋势。

RSA被广泛使用的定义是在[RFC2313](https://tools.ietf.org/html/rfc2313)（PKCS #1 Version 1.5）中。而其最新版定义是在[RFC8017](https://tools.ietf.org/html/rfc8017)（PKCS #1 Version 2.2）中。最新版将RSA算法推广到了多质数的情况，而这种RSA版本在多处理器系统上可以被并行加速。不过很可惜，多质数RSA目前在主流密码库中的支持并不普遍。

在这里，我们先讨论经典RSA（RFC2313）。

##### 概念介绍

###### 密钥生成步骤

1. 选择两个不相等的质数，记为$p, q$；
1. 设$n = pq$；
1. 取一个随机的$e$，使得：

   $$
   \gcd(e, (p - 1)(q - 1)) = 1
   $$

   $$
   1 < e < (p - 1)(q - 1)
   $$

1. 从下面的线性同余式中解出$d$（即在$\mathbb{Z}/(p - 1)(q - 1)\mathbb{Z}$中，找出$e$的逆$d$），且$1 < d < (p - 1)(q - 1)$：

   $$
   ed \equiv 1 \pmod{(p - 1)(q - 1)}
   $$

1. 则$(e, n)$为公钥，$(p, q)$和$(d, n)$是私钥。

###### RFC2313的额外要求

- $p, q$需要为奇数；
- 设$n$的**字节长度**为$k$，则$k$满足：

  $$
  2 ^ {8(k - 1)} \leq n < 2 ^ {8k}
  $$

  这个限制保证了密钥足够长，使得其足够加密后文提到的明文块。

- $e$的值需要被标准化，现常采用的值有[^WhySoSmall]：3；第四个费马数[^FermatNumbers]$F_4 = 65537$（更加普遍）；

###### RSA公钥格式

ASN.1定义：

```fortran-free-form
RSAPublicKey ::= SEQUENCE
{
    modulus INTEGER,
    publicExponent INTEGER
}
```

各个成员的含义如下：

| 成员名称         | 含义        |
| ---------------- | ----------- |
| `modulus`        | 模数$n$     |
| `publicExponent` | 公钥指数$e$ |

###### RSA私钥格式

ASN.1定义：

```fortran-free-form
RSAPrivateKey ::= SEQUENCE
{
    version Version,
    modulus INTEGER,
    publicExponent INTEGER,
    privateExponent INTEGER,
    prime1 INTEGER,
    prime2 INTEGER,
    exponent1 INTEGER,
    exponent2 INTEGER,
    coefficient INTEGER
}
```

各个成员的含义如下：

| 成员名称          | 含义                                                              |
| ----------------- | ----------------------------------------------------------------- |
| `version`         | 版本号，对于PKCS #1 Version 1.5来说，应该为0                      |
| `modulus`         | 模数$n$                                                           |
| `publicExponent`  | 公钥指数$e$                                                       |
| `privateExponent` | 私钥指数$d$                                                       |
| `prime1`          | 质数$p$                                                           |
| `prime2`          | 质数$q$                                                           |
| `exponent1`       | 提前计算$d \bmod{p - 1}$得到                                      |
| `exponent2`       | 提前计算$d \bmod{q - 1}$得到                                      |
| `coefficient`     | 提前计算好的中国剩余定理（CRT）系数$q ^ {-1} \bmod{p}$[^qInverse] |

##### 加密流程

加密流程包括四部分：

1. 消息块填充；
1. 字节流到整数转换；
1. RSA加密计算；
1. 整数到字节流转换；

###### 消息块填充

RSA消息块，或称密文块（Encryption Block）由这些部分组成：

$$
\text{EB} = (00)_{16}\ ||\ \text{BT}\ ||\ \text{PS}\ ||\ (00)_{16}\ ||\ \text{D}
$$

| 域名称      | 含义                                                                                                                                                                                                                                                                                                                                                           |
| ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| $\text{BT}$ | 块类型（Block Type），$1$字节长，指示此消息块的结构。<br>此值在进行私钥操作时为$(00)_{16}$或$(01)_{16}$，在进行公钥操作为$(02)_{16}$。                                                                                                                                                                                                                         |
| $\text{PS}$ | 填充字符（Padding String），$k - 3 - \|\text{D}\|$字节长。<br>其中，$k$为模数$n$的字节长度，$\|\text{D}\|$为消息的字节长度。<br><ul><li>如果$\text{BT} = (00)_{16}$，那么填充字符均为$(00)_{16}$；</li><li>如果$\text{BT} = (01)_{16}$，那么填充字符均为$(\text{FF})_{16}$；</li><li>如果$\text{BT} = (02)_{16}$，那么填充字符应是随机生成的非零值。</li></ul> |
| $\text{D}$  | 明文（Data）                                                                                                                                                                                                                                                                                                                                                   |

注：

1. 最前面的$(00)_{16}$保证了$\text{EB}$转换成整数一定比$n$小；
1. 建议使用$\text{BT} = (01)_{16}$：
   - 对于$\text{BT} = (00)_{16}$，$\text{D}$的开头一定不能为$(00)_{16}$，否则会有二义性，而$\text{BT} = (01)_{16}$没有此问题；
   - $\text{BT} = (01)_{16}$保证了$\text{EB}$转换成整数会比较大，保证了安全性；
1. 对于$\text{BT} = (02)_{16}$：
   - 对于每次加密过程，$\text{PS}$都需要被随机生成；
   - 出于安全考虑，$\text{PS}$的最小长度为8字节。这也就确定了<strong>$\text{D}$的长度不能超过$k - 11$</strong>。

###### 字节流到整数转换

$\text{EB}$必须要转换为一个整数$x$，才能参与RSA运算。我们使用如下的方法进行转换：

$$
x = \sum_{i = 1}^{k}{2 ^ {8(k - i)} \text{EB}_i}
$$

> 注：也就是说，EB的第一字节占权重最大，最后一字节占权重最小。\
> 注2：$x$的大小满足$0 \leq x < n$，因为$\text{EB}_1 = (00)_{16}$ 且 $2 ^ {8(k - 1)} \leq n$

###### RSA加密计算

按如下方法计算$y$：

$$
y = x ^ e \pmod{n}, 0 \leq y < n
$$

###### 整数到字节流转换

我们需要将$y$转换到字节块，以读取密文。这次我们没有具体的数学公式来指导计算，只能以$2 ^ 8$为基数，按长除法将$y$分解成一个个的字节。

伪代码（Python风格）：

```python
# k：模数n的长度
# y：密文数
# output：一个空的，容量为k的数组（列表）

i = k - 1
while True:
    output[i] = chr(y % 256)
    y //= 256
    i -= 1

    if i < 0 or y == 0:
        return output
```

##### 解密流程

解密流程包括四部分：

1. 字节流到整数转换；
1. RSA解密计算；
1. 整数到字节流转换；
1. 解析消息块；

###### 字节流到整数转换

这一步与加密时基本相同，只不过我们需要验证下列条件，以判断输入有效：

- 字节流的长度等于模数长度$k$；
- 字节流转换为整数$y$后，其值在$0 \leq y < n$内；

###### RSA解密计算

按如下方法计算$x$：

$$
x = y ^ d \pmod{n}, 0 \leq x < n
$$

###### 整数到字节流转换

这一步与加密时基本相同，只不过转换后的字节流的长度需要为$k$；

###### 解析消息块

按照加密时填充的格式$\text{EB}$解析消息，我们需要验证下列条件，以判断此消息有效：

- 消息块需要被无歧义地解析出来；
- 填充字符串$\text{PS}$大于等于8字节，并与块类型$\text{BT}$的要求相符；
- 如果解密过程是公钥操作，$\text{BT}$需要为$(00)_{16}$或$(01)_{16}$；如果解密过程是私钥操作，$\text{BT}$需要为$(02)_{16}$。

## 0x03 常用摘要算法介绍

### 常见哈希算法

### 常见消息认证码

## 0x04 常用签名算法介绍

## 0x05 常用密钥协商算法介绍

## 0x06 其他

### 工作模式

### 填充模式

### 一些名词的定义

#### 完整性

消息的完整性（integrity）指消息未被（有意或无意地）篡改。

#### 真实性

消息的真实性（authenticity）指能确定消息是由发送方发出，而不是由第三方发出。

#### 不可抵赖性

消息的不可抵赖性（non-repudiability）在**确定真实性**的同时，还能确定发送方做出了发送消息给接收方的动作，且此动作可以被任何第三方验证有效。

[^WhySoSmall]: 为什么$e$这么小：加密的耗时取决于$e$的大小。我们希望消息发送者加密快一点，就会选取较为小的$e$值。而$d$由同余关系式$ed \equiv 1 \pmod{(p - 1)(q - 1)}$决定，通常和模数差不多长，所以解密要比加密慢。

[^FermatNumbers]: $F_n = 2 ^ {2 ^ n} + 1$；

[^qInverse]: 根据CRT，我们需要计算$q$在$\mathbb{Z} / p \mathbb{Z}$中的逆，即在同余式$qy \equiv 1 \pmod{p}$中解出$y$的值
