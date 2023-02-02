---
title: C++ - Separating Template Declarations and Definitions
date: 2020-03-20
tags: [C++, generic programming]
---

## 0x00 Preface

When we write C++ templates for the first time, our first instinct is usually to treat function/class templates like ordinary functions/classes:\
put the template's declaration in a .hpp file, put its definition in a separate .cpp file, and have the other files include the template header.\
Then we happily compile everything, only to find the linker moaning about a pile of baffling "undefined references"...

Why on earth is that? <del>Is it the twisting of human nature, or the decline of morality?</del>

This post looks at why splitting a template's declaration and definition directly fails, and at some common solutions.

## 0x01 Analysis

### The Build Process

First we need to be clear on how a compiler builds a project.

#### Translation Units

To start, let's define a concept: the translation unit.

> In C and C++ programming language terminology, a **translation unit** is the ultimate input to a C or C++ compiler from which an object file is generated. (Wikipedia)

Roughly: a translation unit is the final input that makes a C/C++ compiler produce **one** object file.

In other words, the set of inputs needed to compile one object file is a translation unit.\
Normally the compiler produces one object file for each .cpp file,\
so we generally consider **one .cpp file to be one translation unit**.

#### Compiling

A large project always has multiple translation units. So how does the compiler handle them?

Think about the definition of a translation unit: for each actual .cpp file, the compiler produces a separate object file.\
And while it processes one translation unit, the other units are **completely invisible** to the compiler.

That's also why a translation unit is called a "unit": each one is a logical block.\
To the compiler, it just contains a big bunch of functions.\
The compiler's job is only to turn the code in each function into machine code and leave an entry label so it can be called. That's all.

Someone might ask: what about external functions? If the other units are invisible, what happens when a function from another unit is called?\
The compiler says: not my problem. A symbol you don't recognize? What do you do with a question you can't answer in an exam?\
You mark it. I can't do this one, so I'll leave it there and get on with my work.

#### Linking

As we know, after compiling comes linking.

The linker reads all the object files into memory and analyzes the object files the compiler produced one by one, to figure out how to clean up after the compiler.\
The compiler left behind a big lump of symbols it didn't recognize, so the linker says: let me number these symbols first, so they're easy to find later.\
With the numbering done, the linker looks them over: ah, I know this symbol, it's in that object file, so I'll write a jmp and have the CPU jump there;\
ah, this symbol seems to be in the runtime library, so I'll give it a number too and insert a jmp for the CPU to go execute there...

With the work done, the linker checks the paper once more.\
If the linker finds, whoa, there are a few here I don't recognize either, what then? Too bad\~ Pass the blame to whoever wrote the bug, and off goes undefined reference\~\
If the linker sees that every symbol has a home, it copies in the platform's startup code, sticks it onto the linked object files, and writes out the result.

<del>And then whoever wrote the bug falls into the clutches of runtime errors...</del>

### What's Special About Templates

So what's special (read: the pitfall) about templates?

The C++ standard says explicitly that only templates that are used get instantiated, and only for the types they're used with.\
This means the compiler generates the corresponding object code for a template only **when it is used**.\
When a template isn't used, you won't find its code in the corresponding object code.

The concept of a template exists only at compile time. If you don't use a template (give its generic type a concrete type),\
the compiler has nothing to work with, because it has to compile your code into machine code, and machine language has no concept of generics:\
it's all concrete instructions. The CPU needs concrete values for stack operations and pointer arithmetic. Without a concrete type,\
the compiler can't know the size of the type, so it can't compute the values those operations need.

### The Answer

The answer seems obvious by now.

Suppose your project contains these files: main.cpp, template.cpp, template.hpp and Makefile

template.hpp holds the template's declaration, template.cpp holds the template's definition,\
and main.cpp calls the function template directly. Both template.cpp and main.cpp include template.hpp.

When the compiler compiles main.cpp, it finds only a function declaration (in the included .hpp) and no definition.\
It assumes this might be an external symbol, marks it, writes the object file, and passes the buck to the linker.

When the compiler compiles template.cpp, it finds the template's declaration and definition, but nothing seems to use the function template.\
So the compiler ignores the function template and writes an **empty** object file.

When the linker gets these two object files, it's stumped: the main.o from the compiler has an external symbol,\
but the matching symbol can't be found in any other object file (or in the system runtime libraries)...\
So it gives up, prints "undefined reference", and leaves it to you, the bug writer, to figure out.

## 0x02 Solutions

### The Usual Solution

Typical introductory C++ tutorials, or people answering questions online who want to take the easy way out, will tell you to just put the definition in the header file too.\
That way the template shows up in every .cpp file, and the missing-symbol problem goes away.

But doing that makes header files significantly larger. Besides being a lot of trouble for whoever reads and maintains the code,\
it also puts a lot of load on the preprocessor and compiler, which slows down the build of the whole project, wasting both time and computing power.

Second, this approach can't modularize templates. All the function templates get compiled into scattered executables and DLLs.\
That increases the program's coupling at the binary level and makes disassembly and debugging harder.

### Going a Step Further

Some tutorials and books suggest putting the template's definition in a separate .ipp file,\
and then including the .ipp file on the last line of the .hpp header that holds the template's declaration.

This makes the code easier to maintain,\
and if you need users to be able to **instantiate your template freely**, it seems to be the preferred solution.\
The famous third-party C++ library <a href="https://www.boost.org">Boost</a>\
uses this approach: you can pass any reasonable type to its templates.

But it doesn't lighten the compiler's load, and it doesn't solve the binary-level coupling either.\
Is there a better solution?

### The Recommended Solution

The commonly recommended approach is to split the template's declaration and definition into template.hpp and template.cpp,\
and in template.cpp **explicitly instantiate** the template for every type that the other .cpp files need.\
That way, when the compiler compiles the template definition, it generates the template's code, and the linker can find the symbols.

Or you can get creative and move the explicit instantiations into a separate temp_instantiation.hpp file, then include it in template.cpp,\
but this header must **not** be included by any other .cpp file.

At the same time, the object code of the instantiated templates ends up in the object file with the matching name,\
so the binary-level coupling is solved too.\
You can also compile the instantiated template code into a DLL and ship it with the software.

The only drawback of this approach is that you **can't instantiate** a template **freely**.\
You must first explicitly instantiate the template for that type by hand in the template's **definition** file before it can be used elsewhere in the program.\
For template types that aren't explicitly instantiated, the linker throws an "undefined reference" error.

Sample code:

```makefile title="Makefile"
OUT=Test.exe
OBJ= main.o template.o
CC=g++

Test: $(OBJ)
	$(CC) -s -o $(OUT) $(OBJ)

main.o: template.hpp
template.o: template.hpp

.PHONY: clean run
clean:
	rm -rf *.exe *.o

run:
	.\\$(OUT)
```

```cpp title="main.cpp"
#include <iostream>
#include "template.hpp"

int main()
{
    using namespace std;
    cout << add(1, 2.0f) << endl; // Only add<int, float> can be used, no other types
    return 0;
}
```

```cpp title="template.hpp"
#ifndef TEMPLATE_HPP
#define TEMPLATE_HPP

template <class T1, class T2>
auto add(const T1 &a, const T2 &b) -> decltype (a + b);

#endif
```

```cpp title="template.cpp"
#include "template.hpp"

template <class T1, class T2>
auto add(const T1 &a, const T2 &b) -> decltype (a + b)
{
    return a + b;
}

// Explicit instantiation
template
auto add<int, float>(const int &a, const float &b) -> decltype (a + b);
```
