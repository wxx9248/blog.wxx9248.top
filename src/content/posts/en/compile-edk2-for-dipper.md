---
title: Trying to Build UEFI Firmware for the Xiaomi Mi 8
date: 2020-02-19
tags: [EDK, ARM64]
---

## 0x00 Preface

A while ago, Ritsu-chan (@Ritsu909) privately sent me a [UEFI firmware image](/assets/compile-edk2-for-dipper/MI8_UEFI.img) for the Xiaomi Mi 8, along with its [source code](https://github.com/NekokeCore/edk2_dipper_SDM845_Xiaomi_mi_8) hosted on GitHub, and asked me to give it a try.\
I happen to have this phone, already unlocked, so I decided to try it. After all, this is pretty novel for someone like me who (for now) doesn't do much embedded work.

I powered the phone off, booted into fastboot, plugged it in and ran `fastboot boot boot.img`. After a whole lot of output flashed past, the screen was left with a stack traceback and a register dump. It looked like the boot had failed.\
![The first boot](/assets/compile-edk2-for-dipper/UEFI_Failure.jpg)\
<video width=100% controls>\
<source src="/storage/compile-edk2-for-dipper/UEFI_Failure.mp4" type="video/mp4">\
Your browser doesn't support HTML 5 :(\
</video>

After I reported the picture above to Ritsu-chan, I tried again, and this time it booted: ![UEFI Shell](/assets/compile-edk2-for-dipper/UEFI_Success.jpg)\
Sadly I don't have an external keyboard (for now). If I had one, I'd test further (according to the description on GitHub, this UEFI firmware can already boot half a Fedora kernel).

Since Ritsu-chan is so keen on the ARM64 platform, I plan to keep an eye on this project too.

Without an external keyboard for now, I'll have to get familiar with EDK and this project first.\
Let's start by building an image.

## 0x01 Environment

|                            |                                                                             |
| -------------------------- | --------------------------------------------------------------------------- |
| Operating system           | Ubuntu 18.04 LTS x64 (VMWare 15.1)                                          |
| Default shell              | `/usr/bin/fish`                                                             |
| C compiler (Native)        | GCC version 7.4.0                                                           |
| C compiler (AArch64)       | GCC version 7.4.0                                                           |
| EDK2 version               | `edk2-stable201911`                                                         |
| MI 8 Package               | Last commit<br>Jan 7, 2020                                                  |
| Phone hardware information | `hw-revision`: `20001`<br>`cpuid`: `0x898bbd5f`<br>`board_version`: `3.3.0` |

## 0x02 Steps

### Downloading EDK2

```bash
wxx9248@DELL-VM-Ubuntu ~/workspace> wget https://github.com/tianocore/edk2/archive/edk2-stable201911.zip
wxx9248@DELL-VM-Ubuntu ~/workspace> unzip edk2-stable201911.zip
wxx9248@DELL-VM-Ubuntu ~/workspace> mv edk2-edk2-stable201911/ edk2
```

```bash
wxx9248@DELL-VM-Ubuntu ~/workspace> git clone https://github.com/NekokeCore/edk2_dipper_SDM845_Xiaomi_mi_8
```

### Analyzing the File Structure

P.S.: I've never done EDK development, so the analysis below is bound to be unprofessional in places. If something's wrong, please point it out in the comments.

First, `XiaomiMI8Pkg` in `edk2_dipper_SDM845_Xiaomi_mi_8` is named much like the packages under `edk2`.\
So `XiaomiMI8Pkg` presumably goes under `edk2`:

```bash
wxx9248@DELL-VM-Ubuntu ~/workspace> mv edk2_dipper_SDM845_Xiaomi_mi_8/XiaomiMI8Pkg/ edk2/
wxx9248@DELL-VM-Ubuntu ~/workspace> mv edk2_dipper_SDM845_Xiaomi_mi_8/dipper.dtb edk2/
wxx9248@DELL-VM-Ubuntu ~/workspace> mv edk2_dipper_SDM845_Xiaomi_mi_8/build.sh edk2/build.sh
```

`dipper.dtb` should be a ready-made device tree file for dipper.

I found a few problems in `build.sh`, so I went straight to analyzing the code. Judging from the provided `build.sh`:

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

After running `build_common.sh`, it sets the cross-compiler's name prefix.\
Then there should be a line break. It runs `build`, which produces the raw UEFI firmware file.\
Then it compresses the firmware file with `gzip` and writes it to `uefi.img`.\
Then it appends `dipper.dtb` to the end of `uefi.img`, and that's the final boot image.

But there's a problem: I couldn't find `build_common.sh` anywhere.\
After studying the official EDK2 documentation, I found that this script should actually be `edk2/edksetup.sh`,\
which sets up the EDK2 development environment. From this I also worked out that the build command is `edk2/BaseTools/Source/Python/build/build.py`.\
That explains it.

Also, while going through the official EDK2 documentation, I found that `BaseTools` has to be built first.\
That matches the `firstrun.sh` the author provided:

```bash title="firstrun.sh"
#!/bin/bash
# based on the instructions from edk2-platform
# do this first:
# https://github.com/tianocore/tianocore.github.io/wiki/Using-EDK-II-with-Native-GCC#Install_required_software_from_apt
set -e
. build_common.sh
make -C ../edk2/BaseTools
```

### Building `EDK2/BaseTools`

```bash
wxx9248@DELL-VM-Ubuntu ~/w/edk2> make -C BaseTools/
```

### Modifying `build.sh`

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

### First Build Attempt

```bash
wxx9248@DELL-VM-Ubuntu ~/w/edk2> chmod +x *.sh
wxx9248@DELL-VM-Ubuntu ~/w/edk2> ./build.sh
```

`build.py` returned an error:\
it couldn't find `edk2/IntelFrameworkModulePkg/Library/LzmaCustomDecompressLib/LzmaCustomDecompressLib.inf`:

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

I checked EDK2's Git repository, and there's no trace of `IntelFrameworkModulePkg` in either the stable release or the latest commit.\
So I turned to almighty Google and found the answer in [this commit](https://github.com/tianocore/edk2/commit/aa7fc1c11c3d57d82842dbede50d064639671a98):

> Remove IntelFrameworkModulePkg

`IntelFrameworkModulePkg` has been removed from EDK2.

Then I found a copy of EDK2 on [Google Source](https://android.googlesource.com/device/linaro/bootloader/edk2/) that still has this package, cloned it, and merged the two directly into one folder:

```bash
wxx9248@DELL-VM-Ubuntu ~/workspace> mkdir google
wxx9248@DELL-VM-Ubuntu ~/workspace> cd google/
wxx9248@DELL-VM-Ubuntu ~/w/google> git clone https://android.googlesource.com/device/linaro/bootloader/edk2/
wxx9248@DELL-VM-Ubuntu ~/w/google> cp -rn edk2/ ../
```

### Second Build Attempt

After running `build.sh`, `build.py` returned another error:\
it couldn't find `edk2/MdeModulePkg/Library/BaseUefiTianoCustomDecompressLib/BaseUefiTianoCustomDecompressLib.inf`

I searched Google the same way and found that `BaseUefiTianoCustomDecompressLib` had been merged into `edk2/MdePkg/Library/BaseUefiDecompressLib`.

So I copied `BaseUefiDecompressLib` back into `MdeModulePkg` and renamed it to `BaseUefiTianoCustomDecompressLib`:

```bash
wxx9248@DELL-VM-Ubuntu ~/w/edk2> cd MdePkg/Library/
wxx9248@DELL-VM-Ubuntu ~/w/e/M/Library> cp -r BaseUefiDecompressLib/ ../../MdeModulePkg/Library/
wxx9248@DELL-VM-Ubuntu ~/w/e/M/Library> cd ../../MdeModulePkg/Library/
wxx9248@DELL-VM-Ubuntu ~/w/e/M/Library> mv BaseUefiDecompressLib/ BaseUefiTianoCustomDecompressLib/
```

### Third Build Attempt

GCC returned an error:\
an implicit function declaration: `implicit declaration of function ‘NetLibDetectMediaWaitTimeout’`

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

It looks like this function is called without being declared.\
But reading the source code and the `Makefile`, I found that the function does have an explicit declaration.\
Let's trace it.

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

Tracing `UefiShellNetwork1CommandsLib.h`:

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

Analyzing the compiler arguments shows that the build searches the `Include` folder under each `Package`:

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

So I located `edk2/NetworkPkg/Include/Library/NetLib.h`:

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

There's the function declaration.\
In principle the include relationships are clear, yet the compiler can't find the function's declaration.

Searching `NetworkPkg` for files containing the string `NetLibDetectMediaWaitTimeout`:

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

The function definition is in `Library/DxeNetLib/DxeNetLib.c`.

Since I don't really know how to make it recognize that function, I'll disable the calls to it for now.

In `edk2/Conf/tools_def.txt`, find every `-Werror ` and replace it with nothing.\
In `edk2/ShellPkg/Library/UefiShellNetwork1CommandsLib/Ifconfig.c`, make the following change:

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

Likewise, in `edk2/ShellPkg/Library/UefiShellNetwork1CommandsLib/Ping.c`, make the following change:

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

This is quite unsafe, but I can't think of anything better for now.

### Fourth Build Attempt

The script reports a successful build:

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

The final result is a [UEFI.img](/assets/compile-edk2-for-dipper/UEFI.img) of `7354028` bytes (≈7.0 MiB).

## 0x03 Boot Test

The firmware isn't truly "complete" (one function is disabled), but at least it builds.

Boot it with fastboot:

```bash
wxx9248@DELL-VM-Ubuntu ~/w/edk2> fastboot boot UEFI.img
```

After a whole lot of output flashed past, the phone entered the UEFI Shell, with the same screen as the image the original author built.\
![Successful boot](/assets/compile-edk2-for-dipper/UEFI_Success_Self-compiled.jpg)\
<video width=100% controls>\
<source src="/storage/compile-edk2-for-dipper/UEFI_Success_Self-compiled.mp4" type="video/mp4">\
Your browser doesn't support HTML 5 :(\
</video>

That said, this image boots into the UEFI Shell 100% of the time, while the image the original author provided sometimes boots and sometimes errors out.

That basically wraps up the build.\
But the problem of the compiler not finding the function declaration still needs to be solved, or it may affect system stability later.

Download the complete self-configured build environment: [here](/storage/compile-edk2-for-dipper/env.tar.xz)
