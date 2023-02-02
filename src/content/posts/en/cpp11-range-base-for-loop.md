---
title: C++11 New Features - Range-Based for Loops
date: 2019-07-02
tags: [C++]
---

C++11 adds a new loop form: the range-based for loop.\
It mainly simplifies **element-by-element** traversal of containers.

Let's go straight to a simple example:

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

```plain title="Output"
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

On each iteration, `x` is **initialized** with the current element `arr[i]` (counting `i` from 0), and then the loop body runs.<br>

What if you need to **change** the values in the original container? That's where C++ **references** come in. An example:

```cpp title="new-for-loop-reference.cpp"
#include <iostream>
int main()
{
    using std::cout;
    using std::endl;
    int arr[] = { 2, 3, 4, 7, 8, 9, 5 };
    for (int &x: arr)
        x = x + 1;
    // Processing and output are kept apart here to avoid any effect of variable scope
    for (int &x: arr)
        cout << x << endl;
    return 0;
}
```

```plain title="Output"
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

You can even loop over a braced list right inside the for loop. Its type is `std::initializer_list<int>`, backed by an anonymous **constant** array. An example:

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

```plain title="Output"
C:\Users\wxx9248\Desktop>g++ -o new-for-loop-anonymous.exe new-for-loop-anonymous.cpp

C:\Users\wxx9248\Desktop>new-for-loop-anonymous
2 3 4 7 8 9 5
3 4 5 8 9 10 6

C:\Users\wxx9248\Desktop>
```

The example shows again that `x` is a variable, not a reference into the array. If you force a reference (`int &x`), the compiler reports an error:

```plain title="Compiler output"
new-for-loop-anonymous.cpp: In function 'int main()':
new-for-loop-anonymous.cpp:7:37: error: binding reference of type 'int&' to 'const int' discards qualifiers
    7 |  for (int &x: { 2, 3, 4, 7, 8, 9, 5 })
    |
```

Because the array is a constant array, you must use a reference to const, `const int &`
