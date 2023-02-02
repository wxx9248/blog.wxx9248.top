---
title: C++11 新特性 - 基于范围的for循环
date: 2019-07-02
tags: [C++]
---

C++11 新增了循环格式：基于范围的for循环。\
主要可以简化对容器类数据对象的**逐元素**遍历操作。

直接举一个简单的栗子：

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

```plain title="运行结果"
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

每次循环中，`x`都会被**初始化**为当前元素`arr[i]`（`i`从0开始），然后执行循环体。<br>

如果需要**改变**原容器的值呢？C++的**引用**就可以派上用场了。栗子：

```cpp title="new-for-loop-reference.cpp"
#include <iostream>
int main()
{
    using std::cout;
    using std::endl;
    int arr[] = { 2, 3, 4, 7, 8, 9, 5 };
    for (int &x: arr)
        x = x + 1;
    // 为了避免变量作用域的影响，这里将数据处理和输出分开
    for (int &x: arr)
        cout << x << endl;
    return 0;
}
```

```plain title="运行结果"
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

你甚至可以在for循环内直接遍历一个花括号列表。它的类型是`std::initializer_list<int>`，背后是一个匿名的**常量**数组。栗子：

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

```plain title="运行结果"
C:\Users\wxx9248\Desktop>g++ -o new-for-loop-anonymous.exe new-for-loop-anonymous.cpp

C:\Users\wxx9248\Desktop>new-for-loop-anonymous
2 3 4 7 8 9 5
3 4 5 8 9 10 6

C:\Users\wxx9248\Desktop>
```

栗子再次证明，`x`是一个变量，不是数组的引用。若强制进行引用（`int &x`），那么编译器会报错：

```plain title="编译器输出"
new-for-loop-anonymous.cpp: In function 'int main()':
new-for-loop-anonymous.cpp:7:37: error: binding reference of type 'int&' to 'const int' discards qualifiers
    7 |  for (int &x: { 2, 3, 4, 7, 8, 9, 5 })
    |
```

因为数组为常量数组，所以必须使用常量的引用方式`const int &`
