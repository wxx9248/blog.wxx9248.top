---
title: C++11の新機能 - 範囲for文
date: 2019-07-02
tags: [C++]
---

C++11では、新しいループの形式として範囲for文が追加されました。\
主に、コンテナ型のデータを**要素ごとに**走査する処理を簡単にできます。

さっそく簡単な例を挙げます：

```cpp title="new-for-loop.cpp"
#include <iostream>
int main()
{
    using std::cout;
    using std::endl;
    int arr[] = { 2, 3, 4, 7, 8, 9, 5 };
    for (int x: arr)
        cout << x << endl;
    return 0;
}
```

```plain title="実行結果"
C:\Users\wxx9248\Desktop>g++ -o new-for-loop.exe new-for-loop.cpp

C:\Users\wxx9248\Desktop>new-for-loop
2
3
4
7
8
9
5

C:\Users\wxx9248\Desktop>
```

ループのたびに、`x`は現在の要素`arr[i]`で**初期化**され（`i`は0から数えます）、それからループ本体が実行されます。<br>

元のコンテナの値を**変更**したい場合はどうでしょうか？そこでC++の**参照**の出番です。例：

```cpp title="new-for-loop-reference.cpp"
#include <iostream>
int main()
{
    using std::cout;
    using std::endl;
    int arr[] = { 2, 3, 4, 7, 8, 9, 5 };
    for (int &x: arr)
        x = x + 1;
    // 変数のスコープの影響を避けるため、ここではデータ処理と出力を分けている
    for (int &x: arr)
        cout << x << endl;
    return 0;
}
```

```plain title="実行結果"
C:\Users\wxx9248\Desktop>g++ -o new-for-loop-reference.exe new-for-loop-reference.cpp

C:\Users\wxx9248\Desktop>new-for-loop-reference
3
4
5
8
9
10
6

C:\Users\wxx9248\Desktop>
```

for文の中で波括弧のリストを直接ループすることもできます。その型は`std::initializer_list<int>`で、裏では名前のない**定数**配列が使われています。例：

```cpp title="new-for-loop-anonymous.cpp"
#include <iostream>
int main()
{
    using std::cout;
    using std::endl;
    for (int x: { 2, 3, 4, 7, 8, 9, 5 })
        cout << x << ' ';
    cout << endl;
    for (int x: { 2, 3, 4, 7, 8, 9, 5 })
    {
        ++x;
        cout << x << ' ';
    }
    cout << endl;
    return 0;
}
```

```plain title="実行結果"
C:\Users\wxx9248\Desktop>g++ -o new-for-loop-anonymous.exe new-for-loop-anonymous.cpp

C:\Users\wxx9248\Desktop>new-for-loop-anonymous
2 3 4 7 8 9 5
3 4 5 8 9 10 6

C:\Users\wxx9248\Desktop>
```

この例からも、`x`は変数であって配列の要素への参照ではないことが分かります。無理に参照（`int &x`）にすると、コンパイラがエラーを出します：

```plain title="コンパイラの出力"
new-for-loop-anonymous.cpp: In function 'int main()':
new-for-loop-anonymous.cpp:7:37: error: binding reference of type 'int&' to 'const int' discards qualifiers
    7 |  for (int &x: { 2, 3, 4, 7, 8, 9, 5 })
    |
```

配列は定数配列なので、const参照`const int &`を使う必要があります
