---
title: 尝试编译小米8 UEFI固件
date: 2020-02-19
tags: [EDK, ARM64]
---

## 0x00 前言

前些时间，栗子酱（@Ritsu909）私下发给我一个小米8的[UEFI固件](/assets/compile-edk2-for-dipper/MI8_UEFI.img)和托管在Github上的[源代码](https://github.com/NekokeCore/edk2_dipper_SDM845_Xiaomi_mi_8)，说让我试一下。\
刚好自己有这个机子，也已经解锁了，就准备试试，毕竟这个对我这个不怎么接触嵌入式（暂时）的人还是挺新奇的。

关机进fastboot，插上手机，执行`fastboot boot boot.img`，闪过去一大堆代码以后，屏幕最后留下了一串stack traceback和register dump，看样子像是引导失败了。\
![第一次引导](/assets/compile-edk2-for-dipper/UEFI_Failure.jpg)\
<video width=100% controls>\
<source src="/storage/compile-edk2-for-dipper/UEFI_Failure.mp4" type="video/mp4">\
你的浏览器不支持HTML 5 :(\
</video>

等我跟栗子酱反馈完上图之后，我又尝试了一次，这一次引导成功了：![UEFI Shell](/assets/compile-edk2-for-dipper/UEFI_Success.jpg)\
可惜我没有外置键盘（暂时），如果有的话我会进行进一步测试（根据Github上的描述，这个UEFI固件已经能引导半个Fedora内核了）。

由于栗子酱对ARM64平台的热衷，我也准备时刻关注这个项目。

既然现在没有外置键盘，那我就得先熟悉熟悉EDK和这个项目了。\
就先从编译出一份镜像开始吧。

## 0x01 工作环境

|                   |                                                                             |
| ----------------- | --------------------------------------------------------------------------- |
| 操作系统          | Ubuntu 18.04 LTS x64 (VMWare 15.1)                                          |
| 默认Shell解释器   | `/usr/bin/fish`                                                             |
| C编译器 (Native)  | GCC version 7.4.0                                                           |
| C编译器 (AArch64) | GCC version 7.4.0                                                           |
| EDK2 版本         | `edk2-stable201911`                                                         |
| MI 8 Package      | 最后一次commit<br>Jan 7, 2020                                               |
| 手机硬件相关信息  | `hw-revision`: `20001`<br>`cpuid`: `0x898bbd5f`<br>`board_version`: `3.3.0` |

## 0x02 工作流程

### 下载EDK2

```bash
wxx9248@DELL-VM-Ubuntu ~/workspace> wget https://github.com/tianocore/edk2/archive/edk2-stable201911.zip
wxx9248@DELL-VM-Ubuntu ~/workspace> unzip edk2-stable201911.zip
wxx9248@DELL-VM-Ubuntu ~/workspace> mv edk2-edk2-stable201911/ edk2
```

```bash
wxx9248@DELL-VM-Ubuntu ~/workspace> git clone https://github.com/NekokeCore/edk2_dipper_SDM845_Xiaomi_mi_8
```

### 分析文件结构

P.S.:本人没有接触过EDK开发，所以以下分析肯定会有不专业的地方。如有不妥，请在留言区指正。

首先看到`edk2_dipper_SDM845_Xiaomi_mi_8`中的`XiaomiMI8Pkg`，跟`edk2`下面的各个Package命名很相似。\
应该是要把`XiaomiMI8Pkg`放到`edk2`下：

```bash
wxx9248@DELL-VM-Ubuntu ~/workspace> mv edk2_dipper_SDM845_Xiaomi_mi_8/XiaomiMI8Pkg/ edk2/
wxx9248@DELL-VM-Ubuntu ~/workspace> mv edk2_dipper_SDM845_Xiaomi_mi_8/dipper.dtb edk2/
wxx9248@DELL-VM-Ubuntu ~/workspace> mv edk2_dipper_SDM845_Xiaomi_mi_8/build.sh edk2/build.sh
```

`dipper.dtb`应该是制作好dipper的设备树文件。

因为我发现`build.sh`有点问题，所以我直接分析代码。从提供的`build.sh`来看：

```bash title="build.sh"
#!/bin/bash
# based on the instructions from edk2-platform
echo cleanning BuidFiles
rm -rf workspace/*
echo Done.
set -e
. build_common.sh
# not actually GCC5; it's GCC7 on Ubuntu 18.04.
GCC5_AARCH64_PREFIX=aarch64-linux-gnu- build -s -n 0 -a AARCH64 -t GCC5 -p XiaomiMI8Pkg/XiaomiMI8Pkg.dsc
gzip -c < workspace/Build/XiaomiMI8Pkg/DEBUG_GCC5/FV/XIAOMIMI8PKG_UEFI.fd >uefi.img
cat dipper.dtb >>uefi.img
rm -rf /mnt/hgfs/HostWorkSpaces/ADB/platform-tools/uefi.img
cp uefi.img /mnt/hgfs/HostWorkSpaces/ADB/platform-tools/
```

首先执行完`build_common.sh`之后，设置了交叉编译器的名称前缀。\
然后之后应该是换一行的。执行`build`，生成原始UEFI固件文件。\
再将固件文件通过`gzip`压缩，写入`uefi.img`。\
再将`dipper.dtb`追加到`uefi.img`的尾部，即为最后的启动镜像。

但是有个问题，我并没有在任何地方找到`build_common.sh`\
在研究了EDK2的官方文档以后，我发现这个sh文件应该指的是`edk2/edksetup.sh`\
这个sh文件设置了EDK2的开发环境。从这里我也得出这个build命令是`edk2/BaseTools/Source/Python/build/build.py`\
这样就解释通了。

同时，我在翻阅EDK2官方文档的时候，发现需要先编译`BaseTools`。\
这也印证了作者提供的`firstrun.sh`：

```bash title="firstrun.sh"
#!/bin/bash
# based on the instructions from edk2-platform
# do this first:
# https://github.com/tianocore/tianocore.github.io/wiki/Using-EDK-II-with-Native-GCC#Install_required_software_from_apt
set -e
. build_common.sh
make -C ../edk2/BaseTools
```

### 编译`EDK2/BaseTools`

```bash
wxx9248@DELL-VM-Ubuntu ~/w/edk2> make -C BaseTools/
```

### 修改`build.sh`

```bash title="build.sh"
#!/bin/bash
# Based on the instructions from edk2-platform
rm UEFI.img
# Erasing specific variables
set -e
# Initialize environment
. edksetup.sh
# Set cross compiler
export GCC5_AARCH64_PREFIX=aarch64-linux-gnu-
# Build
build -n 0 -a AARCH64 -t GCC5 -p XiaomiMI8Pkg/XiaomiMI8Pkg.dsc
gzip -c < Build/XiaomiMI8Pkg/DEBUG_GCC5/FV/XIAOMIMI8PKG_UEFI.fd >UEFI.img
cat dipper.dtb >>UEFI.img
```

### 第一次编译尝试

```bash
wxx9248@DELL-VM-Ubuntu ~/w/edk2> chmod +x *.sh
wxx9248@DELL-VM-Ubuntu ~/w/edk2> ./build.sh
```

`build.py`返回了错误：\
提示找不到`edk2/IntelFrameworkModulePkg/Library/LzmaCustomDecompressLib/LzmaCustomDecompressLib.inf`：

```plain
Processing meta-data .
Architecture(s)  = AARCH64
Build target     = DEBUG
Toolchain        = GCC5

Active Platform          = /home/wxx9248/workspace/edk2/XiaomiMI8Pkg/XiaomiMI8Pkg.dsc

build.py...
/home/wxx9248/workspace/edk2/XiaomiMI8Pkg/XiaomiMI8Pkg.dsc(101): error 000E: File/directory not found in workspace
        /home/wxx9248/workspace/edk2/IntelFrameworkModulePkg/Library/LzmaCustomDecompressLib/LzmaCustomDecompressLib.inf

- Failed -
Build end time: 22:17:38, Feb.19 2020
Build total time: 00:00:01
```

我去EDK2的Git源看了下，不论是stable release，还是最新的commit，都找不到`IntelFrameworkModulePkg`的影子。\
于是我就去求助万能的Google，搜了一下，在[这个commit](https://github.com/tianocore/edk2/commit/aa7fc1c11c3d57d82842dbede50d064639671a98)上：

> Remove IntelFrameworkModulePkg

`IntelFrameworkModulePkg`已经被EDK2移除了。

然后我在[Google Source](https://android.googlesource.com/device/linaro/bootloader/edk2/)上找到了一份还没有移除这个包的EDK2拷贝克隆下来，然后直接合并到一个文件夹：

```bash
wxx9248@DELL-VM-Ubuntu ~/workspace> mkdir google
wxx9248@DELL-VM-Ubuntu ~/workspace> cd google/
wxx9248@DELL-VM-Ubuntu ~/w/google> git clone https://android.googlesource.com/device/linaro/bootloader/edk2/
wxx9248@DELL-VM-Ubuntu ~/w/google> cp -rn edk2/ ../
```

### 第二次编译尝试

在执行`build.sh`后，`build.py`又返回了错误：\
提示找不到`edk2/MdeModulePkg/Library/BaseUefiTianoCustomDecompressLib/BaseUefiTianoCustomDecompressLib.inf`

我用同样的方法在Google上找了一圈，发现`BaseUefiTianoCustomDecompressLib`被合并至`edk2/MdePkg/Library/BaseUefiDecompressLib`里面了

那就把`BaseUefiTianoCustomDecompressLib`拷回至`MdeModulePkg`：

```bash
wxx9248@DELL-VM-Ubuntu ~/w/edk2> cd MdePkg/Library/
wxx9248@DELL-VM-Ubuntu ~/w/e/M/Library> cp -r BaseUefiDecompressLib/ ../../MdeModulePkg/Library/
wxx9248@DELL-VM-Ubuntu ~/w/e/M/Library> cd ../../MdeModulePkg/Library/
wxx9248@DELL-VM-Ubuntu ~/w/e/M/Library> mv BaseUefiDecompressLib/ BaseUefiTianoCustomDecompressLib/
```

### 第三次编译尝试

GCC返回了错误：\
提示隐式函数声明：`implicit declaration of function ‘NetLibDetectMediaWaitTimeout’`

```plain
/home/wxx9248/workspace/edk2/ShellPkg/Library/UefiShellNetwork1CommandsLib/Ifconfig.c: In function ‘IfConfigShowInterfaceInfo’:
/home/wxx9248/workspace/edk2/ShellPkg/Library/UefiShellNetwork1CommandsLib/Ifconfig.c:573:24: error: implicit declaration of function ‘NetLibDetectMediaWaitTimeout’; did you mean ‘NetLibDetectMedia’? [-Werror=implicit-function-declaration]
    if (EFI_SUCCESS == NetLibDetectMediaWaitTimeout (IfCb->NicHandle, 0, &MediaStatus)) {
                        ^~~~~~~~~~~~~~~~~~~~~~~~~~~~
                        NetLibDetectMedia
cc1: all warnings being treated as errors
GNUmakefile:382: recipe for target '/home/wxx9248/workspace/edk2/Build/XiaomiMI8Pkg/DEBUG_GCC5/AARCH64/ShellPkg/Library/UefiShellNetwork1CommandsLib/UefiShellNetwork1CommandsLib/OUTPUT/Ifconfig.obj' failed
make: *** [/home/wxx9248/workspace/edk2/Build/XiaomiMI8Pkg/DEBUG_GCC5/AARCH64/ShellPkg/Library/UefiShellNetwork1CommandsLib/UefiShellNetwork1CommandsLib/OUTPUT/Ifconfig.obj] Error 1
```

看起来这个函数没有进行声明，直接进行了调用。\
但是通过阅读源代码和`Makefile`发现，发现其实这个函数是有显式声明的。\
接下来进行追踪。

```c title="Ifconfig_excerpt.c"
/** @file
The implementation for Shell command ifconfig based on IP4Config2 protocol.

(C) Copyright 2013-2015 Hewlett-Packard Development Company, L.P.<BR>
Copyright (c) 2006 - 2018, Intel Corporation. All rights reserved.<BR>

SPDX-License-Identifier: BSD-2-Clause-Patent

**/

#include "UefiShellNetwork1CommandsLib.h"
```

```c title="Ping_excerpt.c"
/** @file
The implementation for Ping shell command.

(C) Copyright 2015 Hewlett-Packard Development Company, L.P.<BR>
Copyright (c) 2009 - 2018, Intel Corporation. All rights reserved.<BR>
(C) Copyright 2016 Hewlett Packard Enterprise Development LP<BR>

SPDX-License-Identifier: BSD-2-Clause-Patent

**/

#include "UefiShellNetwork1CommandsLib.h"
```

追踪`UefiShellNetwork1CommandsLib.h：`

```c title="UefiShellNetwork1CommandsLib_excerpt.h"
/** @file
header file for NULL named library for network1 shell command functions.

Copyright (c) 2010 - 2016, Intel Corporation. All rights reserved. <BR>

SPDX-License-Identifier: BSD-2-Clause-Patent

**/

#ifndef _UEFI_SHELL_NETWORK1_COMMANDS_LIB_H_
#define _UEFI_SHELL_NETWORK1_COMMANDS_LIB_H_

#include <Uefi.h>

#include <Guid/ShellLibHiiGuid.h>

#include <Protocol/Cpu.h>
#include <Protocol/ServiceBinding.h>
#include <Protocol/Ip6.h>
#include <Protocol/Ip6Config.h>
#include <Protocol/Ip4.h>
#include <Protocol/Ip4Config2.h>
#include <Protocol/Arp.h>

#include <Library/BaseLib.h>
#include <Library/BaseMemoryLib.h>
#include <Library/DebugLib.h>
#include <Library/MemoryAllocationLib.h>
#include <Library/PcdLib.h>
#include <Library/ShellCommandLib.h>
#include <Library/ShellLib.h>
#include <Library/SortLib.h>
#include <Library/UefiLib.h>
#include <Library/UefiRuntimeServicesTableLib.h>
#include <Library/UefiBootServicesTableLib.h>
#include <Library/HiiLib.h>
#include <Library/NetLib.h>
#include <Library/DevicePathLib.h>
#include <Library/PrintLib.h>
```

对编译参数进行分析，发现编译的时候会搜索`Package`下的`Include`文件夹：

```plain
"aarch64-linux-gnu-gcc"
-ffunction-sections -fdata-sections
-DSTRING_ARRAY_NAME=UefiShellNetwork1CommandsLibStrings
-g
-Os
-fshort-wchar -fno-builtin -fno-strict-aliasing
-Wall -Werror -Wno-array-bounds
-include AutoGen.h
-fno-common
-mlittle-endian
-fno-short-enums -fverbose-asm -funsigned-char -ffunction-sections -fdata-sections
-Wno-address
-fno-asynchronous-unwind-tables -fno-unwind-tables -fno-pic -fno-pie -ffixed-x18
-mcmodel=small
-flto
-Wno-unused-but-set-variable -Wno-unused-const-variable
-c
-o /home/wxx9248/workspace/edk2/Build/XiaomiMI8Pkg/DEBUG_GCC5/AARCH64/ShellPkg/Library/UefiShellNetwork1CommandsLib/UefiShellNetwork1CommandsLib/OUTPUT/./Ifconfig.obj
-I/home/wxx9248/workspace/edk2/ShellPkg/Library/UefiShellNetwork1CommandsLib -I/home/wxx9248/workspace/edk2/Build/XiaomiMI8Pkg/DEBUG_GCC5/AARCH64/ShellPkg/Library/UefiShellNetwork1CommandsLib/UefiShellNetwork1CommandsLib/DEBUG -I/home/wxx9248/workspace/edk2/MdePkg -I/home/wxx9248/workspace/edk2/MdePkg/Include -I/home/wxx9248/workspace/edk2/MdePkg/Include/AArch64 -I/home/wxx9248/workspace/edk2/ShellPkg -I/home/wxx9248/workspace/edk2/ShellPkg/Include -I/home/wxx9248/workspace/edk2/MdeModulePkg -I/home/wxx9248/workspace/edk2/MdeModulePkg/Include -I/home/wxx9248/workspace/edk2/NetworkPkg -I/home/wxx9248/workspace/edk2/NetworkPkg/Include
/home/wxx9248/workspace/edk2/ShellPkg/Library/UefiShellNetwork1CommandsLib/Ifconfig.c
```

于是定位`edk2/NetworkPkg/Include/Library/NetLib.h`：

```c title="NetLib_excerpt.h"
/**
Detect media state for a network device. This routine will wait for a period of time at
a specified checking interval when a certain network is under connecting until connection
process finishes or timeout. If Aip protocol is supported by low layer drivers, three kinds
of media states can be detected: EFI_SUCCESS, EFI_NOT_READY and EFI_NO_MEDIA, represents
connected state, connecting state and no media state respectively. When function detects
the current state is EFI_NOT_READY, it will loop to wait for next time's check until state
turns to be EFI_SUCCESS or EFI_NO_MEDIA. If Aip protocol is not supported, function will
call NetLibDetectMedia() and return state directly.

@param[in]   ServiceHandle    The handle where network service binding protocols are
                                installed on.
@param[in]   Timeout          The maximum number of 100ns units to wait when network
                                is connecting. Zero value means detect once and return
                                immediately.
@param[out]  MediaState       The pointer to the detected media state.

@retval EFI_SUCCESS           Media detection success.
@retval EFI_INVALID_PARAMETER ServiceHandle is not a valid network device handle or
                                MediaState pointer is NULL.
@retval EFI_DEVICE_ERROR      A device error occurred.
@retval EFI_TIMEOUT           Network is connecting but timeout.

**/
EFI_STATUS
EFIAPI
NetLibDetectMediaWaitTimeout (
IN  EFI_HANDLE            ServiceHandle,
IN  UINT64                Timeout,
OUT EFI_STATUS            *MediaState
);
```

找到了函数声明。\
按理来说，包含关系是确定的，但是编译器找不到函数的声明。

在`NetworkPkg`下查找包含`NetLibDetectMediaWaitTimeout`字符串的文件：

```bash
wxx9248@DELL-VM-Ubuntu ~/w/e/NetworkPkg> grep -rn "NetLibDetectMediaWaitTimeout"
```

```plain
Dhcp4Dxe/Dhcp4Impl.c:811:  NetLibDetectMediaWaitTimeout (DhcpSb->Controller, DHCP_CHECK_MEDIA_WAITING_TIME, &MediaStatus);
Dhcp6Dxe/Dhcp6Impl.c:102:  NetLibDetectMediaWaitTimeout (Service->Controller, DHCP_CHECK_MEDIA_WAITING_TIME, &MediaStatus);
DnsDxe/DnsDhcp.c:314:  NetLibDetectMediaWaitTimeout (Controller, DNS_CHECK_MEDIA_GET_DHCP_WAITING_TIME, &MediaStatus);
DnsDxe/DnsDhcp.c:633:  NetLibDetectMediaWaitTimeout (Controller, DNS_CHECK_MEDIA_GET_DHCP_WAITING_TIME, &MediaStatus);
HttpBootDxe/HttpBootImpl.c:575:  NetLibDetectMediaWaitTimeout (Private->Controller, HTTP_BOOT_CHECK_MEDIA_WAITING_TIME, &MediaStatus);
IScsiDxe/IScsiDhcp.c:452:  NetLibDetectMediaWaitTimeout (Controller, ISCSI_CHECK_MEDIA_GET_DHCP_WAITING_TIME, &MediaStatus);
IScsiDxe/IScsiDhcp6.c:404:  NetLibDetectMediaWaitTimeout (Controller, ISCSI_CHECK_MEDIA_GET_DHCP_WAITING_TIME, &MediaStatus);
IScsiDxe/IScsiProto.c:447:  NetLibDetectMediaWaitTimeout (Session->Private->Controller, ISCSI_CHECK_MEDIA_LOGIN_WAITING_TIME, &MediaStatus);
Include/Library/NetLib.h:1307:NetLibDetectMediaWaitTimeout (
Library/DxeNetLib/DxeNetLib.c:2601:NetLibDetectMediaWaitTimeout (
UefiPxeBcDxe/PxeBcImpl.c:2366:  NetLibDetectMediaWaitTimeout (Private->Controller, PXEBC_CHECK_MEDIA_WAITING_TIME, &MediaStatus);
```

在`Library/DxeNetLib/DxeNetLib.c`文件中找到了函数定义。

由于我不是很清楚怎么让它识别到那个函数，暂且先屏蔽掉这个函数的调用吧。

在`edk2/Conf/tools_def.txt`中，查找所有`-Werror `，替换为空。\
在`edk2/ShellPkg/Library/UefiShellNetwork1CommandsLib/Ifconfig.c`中，作如下修改：

```c title="Ifconfig_excerpt.c"
    //
    // Get Media State.
    //

    //if (EFI_SUCCESS == NetLibDetectMediaWaitTimeout (IfCb->NicHandle, 0, &MediaStatus)) {
    //if (MediaStatus != EFI_SUCCESS) {
    if (0) {
        ShellPrintHiiEx (-1, -1, NULL, STRING_TOKEN (STR_IFCONFIG_INFO_MEDIA_STATE), gShellNetwork1HiiHandle, L"Media disconnected");
    } else {
        ShellPrintHiiEx (-1, -1, NULL, STRING_TOKEN (STR_IFCONFIG_INFO_MEDIA_STATE), gShellNetwork1HiiHandle, L"Media present");
    }
    /*} else {
    ShellPrintHiiEx (-1, -1, NULL, STRING_TOKEN (STR_IFCONFIG_INFO_MEDIA_STATE), gShellNetwork1HiiHandle, L"Media state unknown");
    }*/
```

同样，在`edk2/ShellPkg/Library/UefiShellNetwork1CommandsLib/Ping.c`中，作如下修改：

```c title="Ping_excerpt.c"
    if (UnspecifiedSrc) {
    //
    // Check media.
    //
    //NetLibDetectMediaWaitTimeout (HandleBuffer[HandleIndex], 0, &MediaStatus);
    //if (MediaStatus != EFI_SUCCESS) {
        if (0) {
        //
        // Skip this one.
        //
        continue;
    }
    }
```

这样做很不安全，但是现在我暂时想不出什么办法。

### 第四次编译尝试

脚本报告编译成功：

```plain
Fd File Name:XIAOMIMI8PKG_UEFI (/home/wxx9248/workspace/edk2/Build/XiaomiMI8Pkg/DEBUG_GCC5/FV/XIAOMIMI8PKG_UEFI.fd)

Generate Region at Offset 0x0
Region Size = 0x8000
Region Name = DATA

Generate Region at Offset 0x8000
Region Size = 0x1F8000
Region Name = FV

Generating FVMAIN_COMPACT FV
#
Generating FVMAIN FV
#######################
GUID cross reference file can be found at /home/wxx9248/workspace/edk2/Build/XiaomiMI8Pkg/DEBUG_GCC5/FV/Guid.xref

FV Space Information
FVMAIN [99%Full] 5757312 total, 5757304 used, 8 free
FVMAIN_COMPACT [70%Full] 2064384 total, 1445120 used, 619264 free

- Done -
Build end time: 01:03:40, Feb.20 2020
Build total time: 00:01:45
```

最终生成了大小为`7354028`(≈7.0 MiB)的 [UEFI.img](/assets/compile-edk2-for-dipper/UEFI.img)

## 0x03 引导测试

虽然固件不算真正的“完整”（屏蔽了一个函数的功能），但是至少编译出来了。

使用fastboot命令引导：

```bash
wxx9248@DELL-VM-Ubuntu ~/w/edk2> fastboot boot UEFI.img
```

在闪过一大堆信息之后，手机进入了UEFI Shell，界面跟原作者编译的镜像相同。\
![引导成功](/assets/compile-edk2-for-dipper/UEFI_Success_Self-compiled.jpg)\
<video width=100% controls>\
<source src="/storage/compile-edk2-for-dipper/UEFI_Success_Self-compiled.mp4" type="video/mp4">\
你的浏览器不支持HTML 5 :(\
</video>

但是这个镜像100%能引导入UEFI Shell，原作者提供的镜像有的时候可以引导成功，而有的时候就会报错。

至此，编译工作基本已经完毕。\
但是函数声明找不到的问题还是需要解决，否则可能会影响以后的系统稳定性。

全量自配置编译环境下载：[点我](/storage/compile-edk2-for-dipper/env.tar.xz)
