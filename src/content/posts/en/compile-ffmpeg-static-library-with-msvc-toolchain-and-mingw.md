---
title: Building FFmpeg Static Libraries with MinGW and the MSVC Toolchain
date: 2019-07-25
tags: [FFmpeg]
---

A project I've been working on recently needs `FFmpeg` static libraries,\
but `FFmpeg` officially provides only source code, and the prebuilt Windows builds I could find only came with shared libraries.

So, in the spirit of doing it myself and picking up some knowledge along the way,\
I built a copy of the `FFmpeg` static libraries myself, and I'm recording the process here for reference.

First, why the MinGW environment is needed:

The `FFmpeg` project is managed the way projects typically are on Linux, with `configure` + `make`,\
and `configure` is a Linux shell script that Windows can't run directly, so it needs the sh that MinGW provides to interpret it.

However, using the MSVC toolchain and the MinGW environment together runs into a fairly big conflict:

1. If you use an ordinary Windows command prompt initialized with `vcvarsall.bat`, you can't run `configure` to configure `make`;
1. If you build in MinGW's MinTTY, you can't initialize the MSVC toolchain environment with `vcvarsall.bat`, so `configure` can't find the MSVC environment.

One fix people suggest online is to CALL `vcvarsall.bat` at the start of `msys.bat`, but newer versions of msys don't seem to like that: if `vcvarsall.bat` is called at the start, MinTTY crashes immediately.

So I came up with my own approach:\
first initialize the MSVC toolchain environment with `vcvarsall.bat`, then call MinGW's sh directly to load `configure`.\
Like this (I've added them to the PATH for convenience):

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

And with that, the problem is solved.

Second, the `configure` parameters matter a lot. I didn't get them right the first few times I built it, and it cost me a lot of effort...

```plain
E:\FFmpeg-n4.1.4> sh ./configure --target-os=win32 --disable-debug --enable-static --prefix=./vs2017_build_static --toolchain=msvc
```

If `configure` reports `./configure: cmp: command not found`, install `diffutils` in **MSYS**.\
If everything goes well, after `configure` finishes you can convert `config.h` in the root directory to UTF-8, or CL will keep complaining about the encoding during the build. Once everything is ready, we can run the long-awaited `make`.

```plain
E:\FFmpeg-n4.1.4> make
```

After the build, `.a` files are generated in each corresponding folder, and they can already be linked.\
If you're a perfectionist, you can remove the leading `lib` and change the extension to `.lib`.

That's the end of the `FFmpeg` build process.

The built libraries may depend on the following, and without them you'll get `LNK2001` or `LNK2019` linker errors:

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
