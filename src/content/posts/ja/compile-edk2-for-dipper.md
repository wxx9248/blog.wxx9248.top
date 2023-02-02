---
title: Xiaomi Mi 8のUEFIファームウェアをビルドしてみる
date: 2020-02-19
tags: [EDK, ARM64]
---

## 0x00 はじめに

少し前、リツちゃん（@Ritsu909）からXiaomi Mi 8の[UEFIファームウェア](/assets/compile-edk2-for-dipper/MI8_UEFI.img)と、GitHubで公開されている[ソースコード](https://github.com/NekokeCore/edk2_dipper_SDM845_Xiaomi_mi_8)が個人的に送られてきて、試してみてほしいと言われました。\
ちょうどこの機種を持っていて、アンロックも済んでいたので、試してみることにしました。（今のところ）組み込みにあまり触れていない自分にとっては、かなり新鮮です。

電源を切ってfastbootに入り、スマホをつないで`fastboot boot boot.img`を実行しました。大量の出力が流れたあと、画面にはスタックトレースとレジスタダンプが残っていて、どうやら起動に失敗したようです。\
![一回目の起動](/assets/compile-edk2-for-dipper/UEFI_Failure.jpg)\
<video width=100% controls>\
<source src="/storage/compile-edk2-for-dipper/UEFI_Failure.mp4" type="video/mp4">\
お使いのブラウザはHTML 5に対応していません :(\
</video>

上の画像をリツちゃんに報告してからもう一度試すと、今度は起動に成功しました：![UEFI Shell](/assets/compile-edk2-for-dipper/UEFI_Success.jpg)\
残念ながら（今のところ）外付けキーボードを持っていません。あればさらにテストするところです（GitHubの説明によると、このUEFIファームウェアはすでにFedoraのカーネルを半分くらいまで起動できるそうです）。

リツちゃんはARM64プラットフォームに熱心なので、自分もこのプロジェクトを注視していくつもりです。

今は外付けキーボードがないので、まずはEDKとこのプロジェクトに慣れておく必要があります。\
手始めにイメージを一つビルドしてみましょう。

## 0x01 作業環境

|                          |                                                                             |
| ------------------------ | --------------------------------------------------------------------------- |
| OS                       | Ubuntu 18.04 LTS x64 (VMWare 15.1)                                          |
| デフォルトのシェル       | `/usr/bin/fish`                                                             |
| Cコンパイラ (Native)     | GCC version 7.4.0                                                           |
| Cコンパイラ (AArch64)    | GCC version 7.4.0                                                           |
| EDK2のバージョン         | `edk2-stable201911`                                                         |
| MI 8 Package             | 最後のコミット<br>Jan 7, 2020                                               |
| スマホのハードウェア情報 | `hw-revision`: `20001`<br>`cpuid`: `0x898bbd5f`<br>`board_version`: `3.3.0` |

## 0x02 作業の流れ

### EDK2のダウンロード

```bash
wxx9248@DELL-VM-Ubuntu ~/workspace> wget https://github.com/tianocore/edk2/archive/edk2-stable201911.zip
wxx9248@DELL-VM-Ubuntu ~/workspace> unzip edk2-stable201911.zip
wxx9248@DELL-VM-Ubuntu ~/workspace> mv edk2-edk2-stable201911/ edk2
```

```bash
wxx9248@DELL-VM-Ubuntu ~/workspace> git clone https://github.com/NekokeCore/edk2_dipper_SDM845_Xiaomi_mi_8
```

### ファイル構成の分析

注：自分はEDKでの開発経験がないので、以下の分析にはきっと素人くさいところがあります。おかしな点があれば、コメント欄で指摘してください。

まず、`edk2_dipper_SDM845_Xiaomi_mi_8`の中の`XiaomiMI8Pkg`は、`edk2`の下の各パッケージと名前の付け方がよく似ています。\
`XiaomiMI8Pkg`を`edk2`の下に置けばよさそうです：

```bash
wxx9248@DELL-VM-Ubuntu ~/workspace> mv edk2_dipper_SDM845_Xiaomi_mi_8/XiaomiMI8Pkg/ edk2/
wxx9248@DELL-VM-Ubuntu ~/workspace> mv edk2_dipper_SDM845_Xiaomi_mi_8/dipper.dtb edk2/
wxx9248@DELL-VM-Ubuntu ~/workspace> mv edk2_dipper_SDM845_Xiaomi_mi_8/build.sh edk2/build.sh
```

`dipper.dtb`はdipper用に作られたデバイスツリーファイルでしょう。

`build.sh`に少し問題があることに気づいたので、直接コードを分析しました。提供されている`build.sh`を見ると：

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

まず`build_common.sh`を実行したあと、クロスコンパイラの名前のプレフィックスを設定しています。\
その次は改行が入るはずです。`build`を実行して、元のUEFIファームウェアファイルを生成します。\
それからファームウェアファイルを`gzip`で圧縮して`uefi.img`に書き込みます。\
最後に`dipper.dtb`を`uefi.img`の末尾に追加したものが、最終的な起動イメージです。

ただし問題があって、`build_common.sh`がどこにも見つかりませんでした。\
EDK2の公式ドキュメントを調べたところ、このshファイルは`edk2/edksetup.sh`のことだと分かりました。\
このshファイルがEDK2の開発環境を設定します。ここから、このbuildコマンドは`edk2/BaseTools/Source/Python/build/build.py`だということも分かります。\
これで説明がつきました。

また、EDK2の公式ドキュメントを読んでいて、先に`BaseTools`をビルドする必要があることも分かりました。\
これは作者が用意した`firstrun.sh`とも一致します：

```bash title="firstrun.sh"
#!/bin/bash
# based on the instructions from edk2-platform
# do this first:
# https://github.com/tianocore/tianocore.github.io/wiki/Using-EDK-II-with-Native-GCC#Install_required_software_from_apt
set -e
. build_common.sh
make -C ../edk2/BaseTools
```

### `EDK2/BaseTools`のビルド

```bash
wxx9248@DELL-VM-Ubuntu ~/w/edk2> make -C BaseTools/
```

### `build.sh`の修正

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

### 一回目のビルド

```bash
wxx9248@DELL-VM-Ubuntu ~/w/edk2> chmod +x *.sh
wxx9248@DELL-VM-Ubuntu ~/w/edk2> ./build.sh
```

`build.py`がエラーを返しました：\
`edk2/IntelFrameworkModulePkg/Library/LzmaCustomDecompressLib/LzmaCustomDecompressLib.inf`が見つからないそうです：

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

EDK2のGitリポジトリを見てみましたが、stable releaseにも最新のコミットにも`IntelFrameworkModulePkg`の影も形もありません。\
そこで万能のGoogle先生に頼って検索したところ、[このコミット](https://github.com/tianocore/edk2/commit/aa7fc1c11c3d57d82842dbede50d064639671a98)にありました：

> Remove IntelFrameworkModulePkg

`IntelFrameworkModulePkg`はEDK2から削除されていたのです。

そこで、[Google Source](https://android.googlesource.com/device/linaro/bootloader/edk2/)でこのパッケージがまだ削除されていないEDK2のコピーを見つけてクローンし、そのまま一つのフォルダにマージしました：

```bash
wxx9248@DELL-VM-Ubuntu ~/workspace> mkdir google
wxx9248@DELL-VM-Ubuntu ~/workspace> cd google/
wxx9248@DELL-VM-Ubuntu ~/w/google> git clone https://android.googlesource.com/device/linaro/bootloader/edk2/
wxx9248@DELL-VM-Ubuntu ~/w/google> cp -rn edk2/ ../
```

### 二回目のビルド

`build.sh`を実行すると、`build.py`がまたエラーを返しました：\
`edk2/MdeModulePkg/Library/BaseUefiTianoCustomDecompressLib/BaseUefiTianoCustomDecompressLib.inf`が見つからないそうです。

同じ方法でGoogleで探し回ったところ、`BaseUefiTianoCustomDecompressLib`は`edk2/MdePkg/Library/BaseUefiDecompressLib`に統合されていました。

なので、`BaseUefiDecompressLib`を`MdeModulePkg`にコピーし直し、`BaseUefiTianoCustomDecompressLib`にリネームします：

```bash
wxx9248@DELL-VM-Ubuntu ~/w/edk2> cd MdePkg/Library/
wxx9248@DELL-VM-Ubuntu ~/w/e/M/Library> cp -r BaseUefiDecompressLib/ ../../MdeModulePkg/Library/
wxx9248@DELL-VM-Ubuntu ~/w/e/M/Library> cd ../../MdeModulePkg/Library/
wxx9248@DELL-VM-Ubuntu ~/w/e/M/Library> mv BaseUefiDecompressLib/ BaseUefiTianoCustomDecompressLib/
```

### 三回目のビルド

GCCがエラーを返しました：\
関数の暗黙的な宣言です：`implicit declaration of function ‘NetLibDetectMediaWaitTimeout’`

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

この関数は宣言されないまま呼び出されているようです。\
しかしソースコードと`Makefile`を読むと、この関数には実は明示的な宣言があります。\
追いかけてみましょう。

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

`UefiShellNetwork1CommandsLib.h`を追います：

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

コンパイルオプションを分析すると、ビルド時には各`Package`の下の`Include`フォルダが検索されることが分かります：

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

そこで`edk2/NetworkPkg/Include/Library/NetLib.h`を見つけました：

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

関数の宣言が見つかりました。\
理屈の上ではインクルード関係ははっきりしているのに、コンパイラは関数の宣言を見つけられません。

`NetworkPkg`の中で`NetLibDetectMediaWaitTimeout`という文字列を含むファイルを探します：

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

`Library/DxeNetLib/DxeNetLib.c`に関数の定義がありました。

どうすればその関数を認識させられるのかよく分からないので、ひとまずこの関数の呼び出しを無効にしておきます。

`edk2/Conf/tools_def.txt`で、すべての`-Werror `を探して空文字列に置き換えます。\
`edk2/ShellPkg/Library/UefiShellNetwork1CommandsLib/Ifconfig.c`には次の変更を加えます：

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

同様に、`edk2/ShellPkg/Library/UefiShellNetwork1CommandsLib/Ping.c`には次の変更を加えます：

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

かなり危ないやり方ですが、今のところほかの方法が思いつきません。

### 四回目のビルド

スクリプトがビルドの成功を報告しました：

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

最終的に、`7354028`バイト（≈7.0 MiB）の[UEFI.img](/assets/compile-edk2-for-dipper/UEFI.img)ができあがりました。

## 0x03 起動テスト

ファームウェアは本当の意味で「完全」ではありません（一つの関数の機能を無効にしています）が、少なくともビルドはできました。

fastbootコマンドで起動します：

```bash
wxx9248@DELL-VM-Ubuntu ~/w/edk2> fastboot boot UEFI.img
```

大量の出力が流れたあと、スマホはUEFI Shellに入りました。画面は元の作者がビルドしたイメージと同じです。\
![起動成功](/assets/compile-edk2-for-dipper/UEFI_Success_Self-compiled.jpg)\
<video width=100% controls>\
<source src="/storage/compile-edk2-for-dipper/UEFI_Success_Self-compiled.mp4" type="video/mp4">\
お使いのブラウザはHTML 5に対応していません :(\
</video>

このイメージは100%UEFI Shellまで起動できますが、元の作者が提供したイメージは起動に成功するときもあれば、エラーになるときもあります。

これでビルド作業はほぼ完了です。\
ただし、関数の宣言が見つからない問題はやはり解決しなければなりません。そうしないと、今後のシステムの安定性に影響するかもしれません。

自分で構成したビルド環境一式のダウンロード：[こちら](/storage/compile-edk2-for-dipper/env.tar.xz)
