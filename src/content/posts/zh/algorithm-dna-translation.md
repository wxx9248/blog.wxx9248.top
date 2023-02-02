---
title: ZSTUOJ - DNA Translation
date: 2019-11-09
tags: [C]
---

## 0x00 闲话

好久都没有更新博客了啊……代码也要生草了……挑了个简单题练练手。\
原题目：[传送门](/assets/algorithm-dna-translation/1512%20-%20DNA%20Translation.html)

**先声明一下，这份代码我交上去没有AC，但是我实在是没找出什么bug，所以仅供参考……**\
后面会说为啥这题目出的不好

20261107 更新：bug找到了，详见[文末的更新](#0x05-更新)。

题目要求很简单，就是把输入的DNA序列按照表格的规则转换成蛋白质序列，主要考察字符串处理。\
代码核心采用mapping的方法，将trim后的RNA序列用一些数组映射到蛋白质字符串上，所以核心数据结构采用字符串指针数组。\
先上代码吧。

## 0x01 代码展示

```c title="1512.c"
#include <stdio.h>
#include <string.h>

// #define ONLINE_JUDGE

#define STRAND_LEN              256

/*
#define Svp                 0
#define Sv                      1
#define Sp                      2
#define S                       3
*/

/*
#define S                       0
#define Sp                      1
#define Svp                 2
#define Sv                      3
*/

/*
#define Sv                      0
#define Svp                 1
#define S                       2
#define Sp                      3
*/

///*
#define Sv                      0
#define Svp                 1
#define Sp                      2
#define S                       3
//*/

char strands[4][STRAND_LEN], mRNA[STRAND_LEN];
char mapv[128], mapt[128];

char map[4][4][4] =
{
    {                           // U
        {  0,  0,  4,  4 },                 // U
        {  1,  1,  1,  1 },                 // C
        {  2,  2, -1, -1 },                 // A
        {  3,  3, -1,  5 }                  // G
    },
    {                           // C
        {  4,  4,  4,  4 },
        {  6,  6,  6,  9 },
        {  7,  7,  9,  9 },
        {  8,  8,  8,  8 }
    },
    {                           // A
        { 10, 10, 10, 18 },
        { 11, 11, 11, 11 },
        { 12, 12, 13, 13 },
        {  1,  1,  8,  8 }
    },
    {                           // G
        { 14, 14, 14, 14 },
        { 15, 15, 15, 15 },
        { 16, 16, 19, 19 },
        { 17, 17, 17, 17 }
    }
};

char *mapp[] =
{
    "Phe", "Ser", "Tyr", "Cys",         //  0,  1,  2,  3
    "Leu", "Trp", "Pro", "His",         //  4,  5,  6,  7
    "Arg", "Gln", "Ile", "Thr",         //  8,  9, 10, 11
    "Asn", "Lys", "Val", "Ala",         // 12, 13, 14, 15
    "Asp", "Gly", "Met", "Glu"          // 16, 17, 18, 19
};

void mapinit(void)
{
    mapv['A'] = 'T';
    mapv['T'] = 'A';
    mapv['C'] = 'G';
    mapv['G'] = 'C';

    mapt['U'] = 0;
    mapt['C'] = 1;
    mapt['A'] = 2;
    mapt['G'] = 3;
}

size_t translate(char *pchain[], char *mRNA, size_t len)
{
    size_t l = 0;

    if (pchain && mRNA && len > 0)
    {
        for (l = 0; (l + 1) * 3 <= len && -1 != map[mapt[mRNA[l * 3]]][mapt[mRNA[l * 3 + 1]]][mapt[mRNA[l * 3 + 2]]]; ++l)
            pchain[l] = mapp[map[mapt[mRNA[l * 3]]][mapt[mRNA[l * 3 + 1]]][mapt[mRNA[l * 3 + 2]]]];

        pchain[l] = NULL;
    }

    return l;
}

void printchain(char *pchain[], size_t len)
{
    if (pchain && pchain[1] && len >= 3)        // It seems that we don't have to print the first "Met" out...
    {
        fputs(pchain[1], stdout);
        for (int i = 2; i < len && pchain[i]; ++i)
            printf("-%s", pchain[i]);
        putchar('\n');
    }
}

int main(void)
{
    mapinit();

    char c;
    char *prime, *start, *end;
    char *pchain[STRAND_LEN / 3 + 1];

    size_t len = 0;
    int i, j;

    for (;;)
    {
        prime = end = NULL;
        memset(pchain, 0x0, STRAND_LEN / 3 + 1);
        for (i = 0; i < STRAND_LEN && (c = getchar()) != '\n'; ++i)
        {
            if ('*' == c)
                return 0;

            strands[S][i] = c;
            strands[Sv][i] = mapv[strands[S][i]];
        }

        if (!i)
            continue;

        strands[S][i] = strands[Sv][i] = '\0';
        len = i;

        for (i = 0; i < len; ++i)
        {
            strands[Sp][i] = strands[S][len - i - 1];
            strands[Svp][i] = strands[Sv][len - i - 1];
        }

        strands[Sp][i] = strands[Svp][i] = '\0';

#ifndef ONLINE_JUDGE
        for (i = 0; i < 4; ++i)
            puts(strands[i]);
        getchar();
#endif

        for (i = 0; i < 4; ++i)
            if (start = strstr(strands[i], "ATG"))
            {
                size_t max = strlen(start) / 3;

                for (j = 2; j < max; ++j)
                    if (!strncmp(start + j * 3, "TAA", 3) || !strncmp(start + j * 3, "TAG", 3) || !strncmp(start + j * 3, "TGA", 3))
                    {
                        prime = start;
                        end = start + j * 3;
                        goto BreakAll;
                    }
            }

    BreakAll:
        if (!(prime && end))
        {
            puts("*** No translatable DNA found ***");
            continue;
        }

        for (j = 0; j < end - start + 3; ++j)
            prime[j] == 'T' ? mRNA[j] = 'U' : (mRNA[j] = prime[j]);
        mRNA[j] = '\0';

#ifndef ONLINE_JUDGE
        puts(mRNA);
        getchar();
#endif

        len = translate(pchain, mRNA, j);
        printchain(pchain, len);
    }

    return 0;
}

```

## 0x02 代码解释

先说说核心变量和函数吧：\
`mapv[]` 可以将一个DNA序列映射到其互补链；\
`mapt[]` 将RNA序列的上的一个密码子其中的一个碱基映射到map的一个下标；\
`map[][][]` 是由上述下标确定的一个蛋白质编码表；\
`mapp[]` 将蛋白质编码映射到蛋白质字符串。\
所以`translate()`函数中的这一行也就很好理解了<del>（禁 止 套 娃）</del>：

```c title="1512-excerpt.c"
for (l = 0; (l + 1) * 3 <= len && -1 != map[mapt[mRNA[l * 3]]][mapt[mRNA[l * 3 + 1]]][mapt[mRNA[l * 3 + 2]]]; ++l)
    pchain[l] = mapp[map[mapt[mRNA[l * 3]]][mapt[mRNA[l * 3 + 1]]][mapt[mRNA[l * 3 + 2]]]];
```

`translate()`函数将每个映射结果（`char *`）依次赋值给指针数组`pchain[]`，遇到终止密码子则停止过程，返回数组实际长度；\
`printchain()`函数将`pchain[]`里的结果格式化输出。

## 0x03 main()流程

程序首先同时读入原始DNA序列及其互补链（检测到*就终止）。

```c title="1512-excerpt.c"
if (!i)
    continue;
```

此代码段用于屏蔽空行输入，不加的话会输出`*** No translatable DNA found ***`。

接下来程序倒序赋值，得到原始DNA链和互补链的反向链（应题目要求，这四条链需要以特定顺序依次测试<del>，但是我网上找了很多顺序都不对</del>）。

```c title="1512-excerpt.c"
for (i = 0; i < len; ++i)
{
    strands[Sp][i] = strands[S][len - i - 1];
    strands[Svp][i] = strands[Sv][len - i - 1];
}
```

程序按`strands[]`下标依次递增的顺序进行DNA链的截取。

```c title="1512-excerpt.c"
for (i = 0; i < 4; ++i)
    if (start = strstr(strands[i], "ATG"))
    {
        size_t max = strlen(start) / 3;

        for (j = 2; j < max; ++j)
            if (!strncmp(start + j * 3, "TAA", 3) || !strncmp(start + j * 3, "TAG", 3) || !strncmp(start + j * 3, "TGA", 3))
            {
                prime = start;
                end = start + j * 3;
                goto BreakAll;
            }
    }
```

先在各个DNA链中检测ATG（转为mRNA后为AUG，起始密码子），随后再测试是否有**合法**的终止密码子，同时利用`start(prime)`指针和end指针进行DNA链的截取。\
**合法**的终止密码子指非重叠依次读取三个碱基，检测是否有“TAA”、“TAG”和“TGA”。\
检测出后将链字符串地址赋值到`prime`指针，未检测到则`prime && end`一定为假。\
不要问我为啥用`goto`，合适的时候就用，只要能让你的程序更简洁明了。这里使用`goto`是为了跳出多层循环。

测试顺序在程序头定义：

```c title="1512-excerpt.c"
/*
#define Svp                 0
#define Sv                      1
#define Sp                      2
#define S                       3
*/

/*
#define S                       0
#define Sp                      1
#define Svp                 2
#define Sv                      3
*/

/*
#define Sv                      0
#define Svp                 1
#define S                       2
#define Sp                      3
*/

///*
#define Sv                      0
#define Svp                 1
#define Sp                      2
#define S                       3
//*/
```

跳出循环后，检测`prime && end`的逻辑值，不赘述。\
如果为真，进行mRNA转换，将T替换为U。

随后，调用`translate()`函数，将`pchain[]`头地址，mRNA起始地址，mRNA长度传入，得到蛋白质序列长度len和蛋白质链`pchain[]`。\
调用`printchain()`函数，将结果打印在终端上，一次转换过程结束。

## 0x04 吐槽

题目要求对每次输入测试4种情况，而原题目并没有指明先测试哪条链，这造成了多重结果，即一个输入可以有多个可行解。\
随后发现在HINT部分附加了测试顺序，但是……反正我是没有跑出来正确结果……手算了一遍，也是程序跑出来的结果，而不是它给出的样本输出……\
在某在线OJ底下的评论区，有人给出了不同的测试顺序（也就是现在我程序上启用的那个），样本输出全部对上了，但是还是WA……\
怀疑程序有bug，但是我是真的没有查出来……我太菜了对不起

还有几个生物学上的问题：\
首先，起始密码子不止AUG一个，GUG（主要见于原核生物）也可以作为起始密码子，此时它同样翻译为甲硫氨酸，但是题目上起始密码子只有AUG一个。\
其次，起始密码子翻译蛋白质，而不是题目所说起始密码子不翻译蛋白质，即所有的输出样本前都应该有个Met（甲硫氨酸）。

## 0x05 更新

20261107 更新：迁移博客的时候把这份代码重新跑了一遍，发现上面的说法不对，程序确实有bug：

1. 密码子表写错了：`map`里`CC?`那一行是`{  6,  6,  6,  9 }`，把`CCG`映射成了Gln。按题目的表，`CCG`是Pro，应该是`{  6,  6,  6,  6 }`；
1. `printchain()`要求`len >= 3`，而`len`把开头的Met也算了进去，所以只有一个氨基酸的蛋白质什么都不会输出，应该改成`len >= 2`；
1. 程序里启用的测试顺序其实过不了题目的第三组样例：输入`TTAATACGACATAATTAT`时输出的是`Leu-Tyr`，而样例是`Ser-Tyr`。`Svp`需要排在`Sv`前面，比如第二组被注释掉的顺序（`S`、`Sp`、`Svp`、`Sv`）。
