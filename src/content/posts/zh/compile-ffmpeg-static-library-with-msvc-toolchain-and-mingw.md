---
title: 用MinGW和MSVC工具链编译FFmpeg静态链接库
date: 2019-07-25
tags: [FFmpeg]
---

最近在写的一个工程里面需要用到`FFmpeg`的静态链接库，\
但是`FFmpeg`官方只提供源代码，能找到的Windows预编译版本也只有动态库。

于是，本着自己动手丰衣足食和顺带提高自己的姿势水平的想法，\
我自己编译了一份`FFmpeg`的静态链接库，并在此记录过程，供参考。

首先说说为什么需要MinGW环境：

`FFmpeg`工程采用的是Linux上典型的`configure` + `make`的方式来进行工程管理的，\
而`configure`是Linux Shell脚本，Windows无法直接执行，这就需要MinGW提供的sh来解释执行了。

但是，同时采用MSVC工具链和MinGW环境会有一个比较大的矛盾：

1. 如果采用`vcvarsall.bat`初始化的普通的Windows命令行，那么就无法执行`configure`来配置`make`；
1. 如果采用了MinGW的MinTTY进行编译，那就无法用`vcvarsall.bat`初始化MSVC工具链环境，导致`configure`找不到MSVC环境。

对此，网上有人提供的办法是，在`msys.bat`的开头CALL一下`vcvarsall.bat`，但是新版msys貌似不领情：在开头如果调用`vcvarsall.bat`，MinTTY会直接闪退。

所以，我自己想了个办法：\
先用`vcvarsall.bat`初始化MSVC工具链环境，再直接调用MinGW里面的sh加载`configure`。\
就像这样（我已经将他们加入了环境变量，方便使用）：

```plain
E:\FFmpeg-n4.1.4>vcvars32
**********************************************************************
** Visual Studio 2017 Developer Command Prompt v15.9.12
** Copyright (c) 2017 Microsoft Corporation
**********************************************************************
[vcvarsall.bat] Environment initialized for: 'x86'

E:\FFmpeg-n4.1.4> sh ./configure [parameters]
...
```

这样一来，这个问题便迎刃而解了。

其次，`configure`的参数也非常重要，我前几次编译的时候参数没有调对，费了不少功夫……

```plain
E:\FFmpeg-n4.1.4> sh ./configure --target-os=win32 --disable-debug --enable-static --prefix=./vs2017_build_static --toolchain=msvc
```

如果`configure`提示`./configure: cmp: command not found`，请在**MSYS**里安装`diffutils`。\
如果一切正常，在`configure`执行完毕后，可以将根目录中的`config.h`转换为UTF-8编码，要不然CL在编译的时候会持续提示编码有问题。在一切准备妥当之后，我们就可以执行期待已久的`make`了。

```plain
E:\FFmpeg-n4.1.4> make
```

在编译过后，在每个对应文件夹中会生成`.a`文件，此时这些文件已经可以进行链接了。\
如果你有强迫症，可以将开头的`lib`去掉，将其扩展名改为`.lib`。

至此，`FFmpeg`的编译过程就结束了。

编译出来的库可能依赖下列项目，不引用这些的话会爆`LNK2001`或者`LNK2019`：

```cpp
#pragma comment(lib, "bcrypt.lib")
#pragma comment(lib, "ws2_32.lib")
#pragma comment(lib, "secur32.lib")
#pragma comment(lib, "gdi32.lib")
#pragma comment(lib, "version.lib")
#pragma comment(lib, "imm32.lib")
#pragma comment(lib, "setupapi.lib")
#pragma comment(lib, "strmiids.lib")
#pragma comment(lib, "quartz.lib")
#pragma comment(lib, "vfw32.lib")
```
