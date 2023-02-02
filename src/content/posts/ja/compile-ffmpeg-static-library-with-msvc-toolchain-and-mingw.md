---
title: MinGWとMSVCツールチェーンでFFmpegの静的ライブラリをビルドする
date: 2019-07-25
tags: [FFmpeg]
---

最近書いているプロジェクトで`FFmpeg`の静的ライブラリが必要になりましたが、\
`FFmpeg`は公式にはソースコードしか提供しておらず、見つかるWindows向けのビルド済みバイナリも動的ライブラリだけでした。

そこで、自分でやれば何とかなる、ついでに知識も増やそうという考えで、\
`FFmpeg`の静的ライブラリを自分でビルドし、その過程を参考としてここに記録します。

まず、なぜMinGW環境が必要なのかについて：

`FFmpeg`プロジェクトは、Linuxでよくある`configure` + `make`の方式で管理されていますが、\
`configure`はLinuxのシェルスクリプトなのでWindowsでは直接実行できず、MinGWが提供するshで解釈・実行する必要があります。

しかし、MSVCツールチェーンとMinGW環境を同時に使うと、かなり大きな矛盾が生じます：

1. `vcvarsall.bat`で初期化した普通のWindowsコマンドプロンプトを使うと、`configure`を実行して`make`を設定できません。
1. MinGWのMinTTYでビルドすると、`vcvarsall.bat`でMSVCツールチェーンの環境を初期化できず、`configure`がMSVC環境を見つけられません。

これに対して、`msys.bat`の先頭で`vcvarsall.bat`をCALLするという方法がネットで紹介されていますが、新しいバージョンのmsysはそれを受け付けないようです：先頭で`vcvarsall.bat`を呼び出すと、MinTTYがすぐに落ちてしまいます。

そこで、自分で方法を考えました：\
まず`vcvarsall.bat`でMSVCツールチェーンの環境を初期化し、それからMinGWのshを直接呼び出して`configure`を読み込みます。\
次のようにします（使いやすいように、これらは環境変数PATHに追加してあります）：

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

これで、この問題は解決です。

次に、`configure`のパラメータも非常に重要です。最初の数回はパラメータが合っておらず、かなり手間取りました……

```plain
E:\FFmpeg-n4.1.4> sh ./configure --target-os=win32 --disable-debug --enable-static --prefix=./vs2017_build_static --toolchain=msvc
```

`configure`が`./configure: cmp: command not found`と表示した場合は、**MSYS**で`diffutils`をインストールしてください。\
すべて順調なら、`configure`の実行が終わった後、ルートディレクトリの`config.h`をUTF-8に変換しておくとよいでしょう。そうしないと、CLがビルド中にずっと文字コードの問題を警告してきます。準備がすべて整ったら、待ちに待った`make`を実行できます。

```plain
E:\FFmpeg-n4.1.4> make
```

ビルドが終わると、対応する各フォルダに`.a`ファイルが生成され、この時点でもうリンクできます。\
気になる人は、先頭の`lib`を取り除いて拡張子を`.lib`に変えてもかまいません。

これで`FFmpeg`のビルドは完了です。

ビルドしたライブラリは以下に依存している場合があり、これらをリンクしないと`LNK2001`や`LNK2019`が出ます：

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
