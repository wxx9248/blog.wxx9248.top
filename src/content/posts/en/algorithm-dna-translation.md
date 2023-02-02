---
title: ZSTUOJ - DNA Translation
date: 2019-11-09
tags: [C]
---

## 0x00 Chit-Chat

I haven't updated the blog in ages... my coding is getting rusty too... so I picked an easy problem to practice on.\
The original problem: [here](/assets/algorithm-dna-translation/1512%20-%20DNA%20Translation.html)

**A disclaimer first: this code did not get AC when I submitted it, but I really couldn't find any bug, so it's for reference only...**\
I'll explain later why this problem is poorly designed.

Update (2026-11-07): I found the bugs. See [the update at the end](#0x05-update).

The task is simple: convert the input DNA sequence into a protein sequence following the rules in the table. It mainly tests string handling.\
The core of the code is a mapping approach: it maps the trimmed RNA sequence to protein strings through a few arrays, so the core data structure is an array of string pointers.\
Here's the code first.

## 0x01 The Code

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

## 0x02 How the Code Works

Let's start with the core variables and functions:\
`mapv[]` maps a DNA sequence to its complementary strand;\
`mapt[]` maps one base of a codon on the RNA sequence to an index into map;\
`map[][][]` is a protein code table indexed by those indices;\
`mapp[]` maps a protein code to a protein string.\
So this line in `translate()` is easy to understand <del>(no nesting allowed)</del>:

```c title="1512-excerpt.c"
for (l = 0; (l + 1) * 3 <= len && -1 != map[mapt[mRNA[l * 3]]][mapt[mRNA[l * 3 + 1]]][mapt[mRNA[l * 3 + 2]]]; ++l)
    pchain[l] = mapp[map[mapt[mRNA[l * 3]]][mapt[mRNA[l * 3 + 1]]][mapt[mRNA[l * 3 + 2]]]];
```

`translate()` assigns each mapping result (`char *`) in turn to the pointer array `pchain[]`, stops when it reaches a stop codon, and returns the actual length of the array;\
`printchain()` formats and prints the results in `pchain[]`.

## 0x03 The main() Flow

The program first reads in the original DNA sequence and its complementary strand at the same time (it stops when it sees *).

```c title="1512-excerpt.c"
if (!i)
    continue;
```

This snippet ignores empty input lines. Without it, the program would print `*** No translatable DNA found ***`.

Next the program copies them in reverse order to get reversed copies of the original DNA strand and the complementary strand (as the problem requires, these four strands have to be tested one by one in a specific order<del>, but none of the many orders I found online were right</del>).

```c title="1512-excerpt.c"
for (i = 0; i < len; ++i)
{
    strands[Sp][i] = strands[S][len - i - 1];
    strands[Svp][i] = strands[Sv][len - i - 1];
}
```

The program extracts a segment from the DNA strands in increasing order of their `strands[]` index.

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

It first looks for ATG in each DNA strand (AUG once converted to mRNA, the start codon), then checks whether there is a **valid** stop codon, using the `start(prime)` pointer and the `end` pointer to extract that segment of the DNA strand.\
A **valid** stop codon means reading three bases at a time without overlap and checking for "TAA", "TAG" or "TGA".\
Once one is found, the address of the strand string is assigned to the `prime` pointer. If none is found, `prime && end` is always false.\
Don't ask me why I used `goto`: use it when it fits, as long as it makes your program simpler and clearer. Here `goto` is used to break out of nested loops.

The test order is defined at the top of the program:

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

After leaving the loop, the program checks the truth value of `prime && end`. Nothing more to say there.\
If it's true, it converts to mRNA by replacing T with U.

Then it calls `translate()`, passing the head address of `pchain[]`, the start address of the mRNA and the mRNA's length, and gets back the protein sequence length len and the protein chain `pchain[]`.\
It calls `printchain()` to print the result to the terminal, and one conversion is done.

## 0x04 Complaints

The problem asks you to test 4 cases for every input, but the original problem doesn't say which strand to test first. That leads to multiple results: one input can have several valid answers.\
Later I found the test order added in the HINT section, but... I never got the correct results with it anyway... I worked it out by hand, and I also got what the program printed, not the sample output it gives...\
In the comments section on one online judge, someone gave a different test order (the one currently enabled in my program), and all the sample outputs matched, but it was still WA...\
I suspect the program has a bug, but I really couldn't find it... I'm such a noob, sorry.

There are also a few biology problems:\
First, AUG isn't the only start codon: GUG (mostly in prokaryotes) can be one too, and in that position it's also translated as methionine, but the problem has only one start codon, AUG.\
Second, the start codon is translated into protein, not left untranslated as the problem says, so every sample output should begin with a Met (methionine).

## 0x05 Update

Update (2026-11-07): I reran this code while migrating the blog and found that what I said above is wrong. The program does have bugs:

1. The codon table is wrong: the `CC?` row in `map` is `{  6,  6,  6,  9 }`, which maps `CCG` to Gln. According to the problem's table, `CCG` is Pro, so it should be `{  6,  6,  6,  6 }`.
1. `printchain()` requires `len >= 3`, but `len` also counts the leading Met, so a protein with only one amino acid prints nothing. It should be `len >= 2`.
1. The test order enabled in the program actually fails the problem's third sample: for the input `TTAATACGACATAATTAT` it prints `Leu-Tyr`, while the sample says `Ser-Tyr`. `Svp` needs to come before `Sv`, as in the second commented-out order (`S`, `Sp`, `Svp`, `Sv`).
