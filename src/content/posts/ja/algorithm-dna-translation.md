---
title: ZSTUOJ - DNA Translation
date: 2019-11-09
tags: [C]
---

## 0x00 雑談

ずいぶん長いことブログを更新していませんでした……コードを書く腕もなまってきたので……簡単な問題を選んで練習してみました。\
元の問題：[こちら](/assets/algorithm-dna-translation/1512%20-%20DNA%20Translation.html)

**最初にお断りしておくと、このコードは提出してもACになりませんでした。でもどうしてもバグが見つからなかったので、参考程度にしてください……**\
この問題の出来がよくない理由は後で説明します。

2026-11-07 更新：バグが見つかりました。詳しくは[末尾の更新](#0x05-更新)を見てください。

問題の要求は単純で、入力されたDNA配列を表の規則に従ってタンパク質の配列に変換するというもので、主に文字列処理が問われます。\
コードの中心はマッピングの手法で、trimしたRNA配列をいくつかの配列でタンパク質の文字列に対応付けるので、中心となるデータ構造は文字列ポインタの配列です。\
まずはコードからどうぞ。

## 0x01 コード

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

## 0x02 コードの説明

まずは中心となる変数と関数から。\
`mapv[]`はDNA配列をその相補鎖に対応付けます。\
`mapt[]`はRNA配列上のコドンの塩基一つを、mapの添字に対応付けます。\
`map[][][]`は上の添字で引くタンパク質のコード表です。\
`mapp[]`はタンパク質のコードをタンパク質の文字列に対応付けます。\
なので、`translate()`関数の次の行もすぐ分かるでしょう<del>（入れ子禁止）</del>：

```c title="1512-excerpt.c"
for (l = 0; (l + 1) * 3 <= len && -1 != map[mapt[mRNA[l * 3]]][mapt[mRNA[l * 3 + 1]]][mapt[mRNA[l * 3 + 2]]]; ++l)
    pchain[l] = mapp[map[mapt[mRNA[l * 3]]][mapt[mRNA[l * 3 + 1]]][mapt[mRNA[l * 3 + 2]]]];
```

`translate()`関数は各マッピングの結果（`char *`）を順にポインタ配列`pchain[]`に代入し、終止コドンに達したら処理を止めて、配列の実際の長さを返します。\
`printchain()`関数は`pchain[]`の結果を整形して出力します。

## 0x03 main()の流れ

プログラムはまず、元のDNA配列とその相補鎖を同時に読み込みます（*を検出したら終了します）。

```c title="1512-excerpt.c"
if (!i)
    continue;
```

このコード片は空行の入力を無視するためのもので、これがないと`*** No translatable DNA found ***`が出力されてしまいます。

次にプログラムは逆順にコピーして、元のDNA鎖と相補鎖をそれぞれ逆順にした鎖を得ます（問題の要求により、この四本の鎖は決まった順序で一本ずつテストする必要があります<del>が、ネットで見つけた順序はどれも正しくありませんでした</del>）。

```c title="1512-excerpt.c"
for (i = 0; i < len; ++i)
{
    strands[Sp][i] = strands[S][len - i - 1];
    strands[Svp][i] = strands[Sv][len - i - 1];
}
```

プログラムは`strands[]`の添字の小さい順にDNA鎖を切り出します。

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

まず各DNA鎖でATG（mRNAに変換するとAUG、開始コドン）を探し、次に**有効な**終止コドンがあるかを調べつつ、`start(prime)`ポインタと`end`ポインタを使ってDNA鎖を切り出します。\
**有効な**終止コドンとは、重ならないように三塩基ずつ順に読み、「TAA」「TAG」「TGA」があるかを調べることを指します。\
見つかったら鎖の文字列のアドレスを`prime`ポインタに代入し、見つからなければ`prime && end`は必ず偽になります。\
なぜ`goto`を使うのかは聞かないでください。プログラムがより簡潔で分かりやすくなるなら、適切な場面で使えばいいのです。ここで`goto`を使っているのは、多重ループから抜けるためです。

テストの順序はプログラムの先頭で定義しています：

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

ループを抜けたら`prime && end`の論理値を調べます。説明は省きます。\
真であればmRNAに変換し、TをUに置き換えます。

続いて`translate()`関数を呼び出し、`pchain[]`の先頭アドレス、mRNAの開始アドレス、mRNAの長さを渡して、タンパク質配列の長さlenとタンパク質の鎖`pchain[]`を得ます。\
`printchain()`関数を呼び出して結果を端末に表示すれば、一回の変換は終わりです。

## 0x04 愚痴

問題は入力ごとに4通りをテストするよう求めていますが、元の問題文はどの鎖を先にテストするかを示していません。そのため結果が複数になり、一つの入力に対して正しい答えが複数ありえます。\
その後、HINTの部分にテストの順序が書き足されているのに気づきましたが……とにかく正しい結果は出せませんでした……手計算してみても、出てくるのはプログラムの出力と同じ結果で、問題の出力例ではありませんでした……\
とあるオンラインジャッジのコメント欄で、別のテスト順序（今プログラムで有効にしているもの）を挙げている人がいて、出力例はすべて一致しましたが、それでもWAでした……\
プログラムのバグを疑いましたが、本当に見つけられませんでした……未熟ですみません。

生物学的な問題もいくつかあります：\
まず、開始コドンはAUGだけではありません。GUG（主に原核生物）も開始コドンになり、その場合はやはりメチオニンに翻訳されます。しかし問題では開始コドンはAUGの一つだけです。\
次に、開始コドンもタンパク質に翻訳されます。問題文のように開始コドンが翻訳されないわけではないので、すべての出力例の先頭にはMet（メチオニン）があるはずです。

## 0x05 更新

2026-11-07 更新：ブログを移行するときにこのコードを再実行したところ、上で書いたことは間違いで、プログラムには確かにバグがありました：

1. コドン表が間違っています：`map`の`CC?`の行が`{  6,  6,  6,  9 }`になっていて、`CCG`をGlnに対応付けています。問題の表では`CCG`はProなので、`{  6,  6,  6,  6 }`であるべきです。
1. `printchain()`は`len >= 3`を要求していますが、`len`には先頭のMetも数えられているので、アミノ酸が一つだけのタンパク質は何も出力されません。`len >= 2`に直すべきです。
1. プログラムで有効にしているテスト順序では、実は問題の3番目のサンプルが通りません。入力`TTAATACGACATAATTAT`に対して`Leu-Tyr`と出力しますが、出力例は`Ser-Tyr`です。`Svp`を`Sv`より前にする必要があり、たとえば二番目にコメントアウトされている順序（`S`、`Sp`、`Svp`、`Sv`）にします。
