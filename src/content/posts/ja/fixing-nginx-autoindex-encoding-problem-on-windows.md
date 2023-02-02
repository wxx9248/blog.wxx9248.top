---
title: NGINX autoindexモジュールのWindowsでの文字コード問題を根本的に解決する
date: 2021-08-17
tags: [NGINX, 文字コード, Windows, C, Bugfix]
---

## 0x00 はじめに

サーバーの運用に触れるようになってから、ずっとNGINXという優れたHTTPサーバー/リバースプロキシ/ロードバランサーを使ってきました。NGINXの設定の書き方に慣れているので、WindowsでもHTTPサーバーとして使い続けたいと思いました。しかしWindowsで使ってみると、NGINXのWindows対応はあまり良くないことが分かりました。Windowsのカーネルが`epoll`などの呼び出しに対応していないせいでNGINXの並行処理性能が落ちることはさておき、NGINXはWindowsの文字コードの仕組みにもあまりうまく対応していません。

NGINXはもともとLinux向けに書かれ、後からWindowsに移植されました。移植の際、コードの互換性のために、NGINXはWindowsが使っているUnicodeの文字コード体系（UTF-16の部分的な実装）を採用しませんでした。UTF-16は一文字に最低2バイトを使い、ASCIIともUTF-8とも互換性がないからです。そのためNGINXはWindowsのレガシーなANSIコードページとやり取りする必要があり、Win32 APIを使うときには接尾辞が`A`のAPI群を呼び出します。Microsoftによれば、コードページの仕組みはコマンドラインプログラムや古いプログラムのためだけに存在するもので、新しいプログラムではコードページによる文字コードの悩みから抜け出すために、Windows自身のUnicodeの文字コード体系を使うことが推奨されています。しかしNGINXはWindowsのコードページの仕組みに対して特別な処理をしていないため、文字コードに起因する問題がいくつか起きています。

## 0x01 問題の説明

NGINXには`autoindex`モジュールが付属しています。このモジュールはディレクトリのインデックスを自動生成し、ユーザーがディレクトリ内のファイルを閲覧できるようにするもので、簡易的なHTTPファイルサーバーを立てるのに向いています。このモジュールは*nixシステムでは正常に動きますが、コードページが`437`（米国英語のOEMコードページ、ASCII互換）や`65001`（UTF-8）でないWindowsでは文字コードの問題にぶつかります。

テストに使った環境は次のとおりです：

| 項目                 | 値                                          |
| -------------------- | ------------------------------------------- |
| CPUアーキテクチャ    | `x86`、`amd64`命令セット拡張                |
| OS                   | `Windows 10 21H1 [Version 10.0.19043.1165]` |
| システムコードページ | `936`（簡体字中国語、GBK）                  |

再現手順は次のとおりです：

1. NGINXの設定ファイルの`location`ブロックで`autoindex`を有効にします（`autoindex on;`）。
1. インデックス対象のディレクトリに、ファイル名に非ASCII文字を含むファイルを作成します。たとえば`wxx9248的C++笔记.txt`（「wxx9248のC++ノート」）です。
1. ブラウザでNGINXが生成したインデックスページを開き、このファイルをクリックすると、`500 Internal Server Error`のエラーページが表示されます。

エラーログには次のようなエラーメッセージが出ます：

```plain
2021/08/15 02:08:31 [crit] 26400#8976: *1 CreateFile() "C:/wxx9248的C++笔记.txt" failed (1113: No mapping for the Unicode character exists in the target multi-byte code page), client: 127.0.0.1, server: _, request: "GET /wxx9248%B5%C4C%2B%2B%B1%CA%BC%C7.txt HTTP/1.1", host: "example.com", referrer: "http://example.com/"
```

その他の情報：

- エラーログ内の漢字の文字コードはGBKです。
- ページの文字コードをUTF-8に強制する（`charset utf-8;`）と、ページの中国語の部分が文字化けします。

## 0x02 原因の追跡

まずエラーログから、文字コードに起因する問題であることが分かります。

ブラウザの開発者ツールの「ネットワーク」タブを見ると、サーバーのレスポンスヘッダの`Content-Type`に`charset`パラメータが指定されていません。つまりページの文字コードはブラウザが自分で判断していることになります。

`autoindex`が生成したリンクを見てみます：エスケープされたURLから文字コードが分かります。

```html
<a href="wxx9248%B5%C4C%2B%2B%B1%CA%BC%C7.txt">wxx9248的C++笔记.txt</a>
```

エスケープされたURLでは、漢字一文字がそれぞれ2バイトで表されています。GBKではないかと推測し、後に実験で確かめました。

続いて、実験で次の規則が分かりました[^1]：

- ハイパーリンクのリンク先（`href`）にあるUnicode文字がパーセントエンコーディングされていない場合、ユーザーがリンクをクリックすると、ブラウザはその文字を自動的にUTF-8でエンコードしてパーセントエンコーディングでエスケープし、リンク内の元の文字をエスケープ後の文字列に置き換えてから遷移します。
- ハイパーリンクのリンク先にあるUnicode文字がすでにパーセントエンコーディングされている場合、ブラウザは何もせず、そのままリンク先に遷移します。

`autoindex`はページを生成する時点で、リンクをGBK/パーセントエンコーディングしていたのです。一方NGINXはUTF-8/パーセントエンコーディングのリンクしか受け付けないので、このパーセントエンコーディングされた文字列はUTF-8だと仮定してUTF-8の規則でデコードし、エラーになります。

解決の方針もはっきりしました：`autoindex`が内部でGBKではなくUTF-8のリンクを生成するようにすればよいのです。

---

NGINXのソースコードをダウンロードし、`autoindex`モジュールのソースファイル`src/http/modules/ngx_http_autoindex_module.c`を開きます。

リンクの文字列を連結している部分を直接探します：`<a href=`で検索します。502行目に、各項目の名前の長さを計算するコードがありました：

```c
len = sizeof(title) - 1
    + r->uri.len + escape_html
    + sizeof(header) - 1
    + r->uri.len + escape_html
    + sizeof("</h1>") - 1
    + sizeof("<hr><pre><a href=\"../\">../</a>" CRLF) - 1
    + sizeof("</pre><hr>") - 1
    + sizeof(tail) - 1;
```

その近くの`entry`という識別子が手がかりになりそうです。コードは`entry`を使うときに配列の添字と構造体のメンバ参照を行っているので、この`entry`にはディレクトリ内の各項目のすべての情報が入っていて、その名前（`entry[i].name`）も含まれていると推測しました。

`entry`という識別子を検索すると、443行目、`ngx_http_autoindex_html`関数の中に定義がありました：

```c
ngx_http_autoindex_entry_t     *entry;
```

さらに構造体の型の定義を探すと、37行目にありました：

```c
typedef struct {
    ngx_str_t      name;
    size_t         utf_len;
    size_t         escape;
    size_t         escape_html;

    unsigned       dir:1;
    unsigned       file:1;

    time_t         mtime;
    off_t          size;
} ngx_http_autoindex_entry_t;
```

`name`メンバの型は`ngx_str_t`です。

[NGINX開発ガイド](https://nginx.org/en/docs/dev/development_guide.html)で`ngx_str_t`構造体の定義を探します：

```c
typedef struct
{
    size_t len;
    unsigned char *data;
} ngx_str_t;
```

NGINXの文字列を表す構造体で、文字列の長さとベースアドレスを持っています。

> NGINXの文字列は、よくある`char`ではなく`unsigned char`を使っていることに注意してください。

必要な定義が分かったところで、`entry`の`name`メンバにどのように値が代入されるのかを調べる必要があります。

`ngx_http_autoindex_html`関数を分析すると、`entry`は`entries`というNGINXの配列から取り出されていて、`entries`は呼び出し元から渡される引数です。さらに`ngx_http_autoindex_html`という識別子を検索すると、`ngx_http_autoindex_handler`がこの関数を呼び出していることが分かります。

`ngx_http_autoindex_handler`関数を分析すると[^2]、245行目と252行目のあたりに`entries`の初期化文がありました：

```c
ngx_memzero(&entries, sizeof(ngx_array_t));
// Code omitted here...
if (ngx_array_init(&entries, pool, 40, sizeof(ngx_http_autoindex_entry_t)) != NGX_OK) {
    return ngx_http_autoindex_error(r, &dir, &path);
}
```

さらに下を見ていくと、363行目で`entries`に要素が追加されています：

```c
entry = ngx_array_push(&entries);
if (entry == NULL) {
    return ngx_http_autoindex_error(r, &dir, &path);
}
```

ここのスコープを探すと、`for`ループの中でした：

```c
for ( ;; ) {
    ngx_set_errno(0);

    if (ngx_read_dir(&dir) == NGX_ERROR) {
        err = ngx_errno;

        if (err != NGX_ENOMOREFILES) {
            ngx_log_error(NGX_LOG_CRIT, r->connection->log, err,
                        ngx_read_dir_n " \"%V\" failed", &path);
            return ngx_http_autoindex_error(r, &dir, &path);
        }

        break;
    }
    // Code omitted here...
    entry->dir = ngx_de_is_dir(&dir);
    entry->file = ngx_de_is_file(&dir);
    entry->mtime = ngx_de_mtime(&dir);
    entry->size = ngx_de_size(&dir);
}
```

この`for`ループが`entries`のすべての要素を埋めていると推測し、このループを重点的に分析しました。375行目に突破口がありました：`entries`の要素の名前がデータにコピーされています：

```c
ngx_cpystrn(entry->name.data, ngx_de_name(&dir), len + 1);
```

NGINXのソースコードを確認すると、`ngx_de_name`はマクロで、`win32`版と`unix`版の二つがあります。`win32`版は次のとおりです：

```c
// In src/os/win32/ngx_files.h
#define ngx_de_name(dir)            ((u_char *) (dir)->finddata.cFileName)
```

この`dir`引数に戻ると、これは`ngx_dir_t`型の構造体で、やはり上の二つの版があります。その`win32`版の定義を見ます：

```c
typedef struct {
    // In src/os/win32/ngx_files.h
    HANDLE                          dir;
    WIN32_FIND_DATA                 finddata;

    unsigned                        valid_info:1;
    unsigned                        type:1;
    unsigned                        ready:1;
} ngx_dir_t;
```

Win32 APIのドキュメントで`WIN32_FIND_DATA`を調べると、`WIN32_FIND_DATAA`と`WIN32_FIND_DATAW`の二つの版があります。実験で確かめたところ、NGINXが使っているのは前者、つまりANSI版でした。これで、リンクの文字コードがシステムのコードページ、実験環境ではGBKになる理由が完全に説明できます。

解決方法も明らかになりました。`entry->name`をUTF-8に変換すればよいのです。

## 0x03 修正

1. 368～375行目のコードを見つけます：
   ```c
   entry->name.len = len;

   entry->name.data = ngx_pnalloc(pool, len + 1);
   if (entry->name.data == NULL) {
       return ngx_http_autoindex_error(r, &dir, &path);
   }

   ngx_cpystrn(entry->name.data, ngx_de_name(&dir), len + 1);
   ```
1. 上のコードを次のコードに置き換えます[^3]：

   ```c
   #ifdef _WIN32
   UINT codePage = GetACP();
   if (codePage == 437 || codePage == 65001)
   {
   #endif
       entry->name.len = len;

       entry->name.data = ngx_pnalloc(pool, len + 1);
       if (entry->name.data == NULL) {
           return ngx_http_autoindex_error(r, &dir, &path);
       }

       ngx_cpystrn(entry->name.data, ngx_de_name(&dir), len + 1);
   #ifdef _WIN32
   }
   else
   {
       // Converting encoding from ANSI to the default Unicode encoding scheme on Windows platform,
       // a.k.a. UTF-16LE
       int n = MultiByteToWideChar(CP_ACP, 0, (LPCCH) ngx_de_name(&dir), -1, NULL, 0);
       WCHAR *wideCharString = ngx_palloc(r->pool, n * sizeof(WCHAR));
       if (wideCharString == NULL) {
           return ngx_http_autoindex_error(r, &dir, &path);
       }
       MultiByteToWideChar(CP_ACP, 0, (LPCCH) ngx_de_name(&dir), -1, wideCharString, n);

       // Converting encoding from UTF-16LE to UTF-8
       n = WideCharToMultiByte(CP_UTF8, 0, wideCharString, -1, NULL, 0, NULL, NULL);
       u_char *utf8String = ngx_palloc(r->pool, n * sizeof(char));
       if (utf8String == NULL) {
           return ngx_http_autoindex_error(r, &dir, &path);
       }
       WideCharToMultiByte(CP_UTF8, 0, wideCharString, -1, (LPSTR) utf8String, n, NULL, NULL);

       ngx_pfree(r->pool, wideCharString);

       // Since WideCharToMultiByte() will create a NULL terminator at the end of the UTF-8 string,
       // we are specifying the length to be n - 1 to exclude the NULL terminator.
       // Otherwise, it will cause problem in the escaped URL.
       entry->name.len = n - 1;
       entry->name.data = utf8String;
   }
   #endif
   ```

1. NGINXをビルドし直して、動作を確認します。

## 0x04 感想

このNGINXの問題に悩まされている人は少なくありません。解決する前にネットで調べてみましたが、解決策は次の二つしかありませんでした：

1. ソースコードを修正してURLのエスケープを無効にし、ページの文字コードをGBKにする
1. システムのコードページを`65001`（UTF-8）に変更する

どちらの方法にも欠点があります：

1. 一つ目の方法の欠点は明らかで、ファイル名に中国語と英語の記号が混ざっていると、やはり500エラーになります。
1. 二つ目の方法は一つ目よりずっと良く、NGINX全体がUTF-8を使うようになります。しかしほかのプログラム、特にまだANSIコードページを使っている古いプログラムやコマンドラインプログラムで互換性の問題が起きることがあります。コマンドラインプログラムならまだ対処しやすく、実行前に`chcp 936`を実行すれば正しく表示されます。しかしGUIプログラムだと文字化けしてしまい、避ける方法はほとんどありません（代表例：UltraISO）。

そこで自分でNGINXのソースコードを調べて、この問題を解決する方法を作りました。それまでNGINXの内部を知りませんでした。ソースコードを読んで、NGINXの動作の仕組みを大まかに理解できましたが、本当に理解するまでにはまだ長い道のりがあります。

[^1]: このリンクを例にしましょう：

    ```html
    <a href="wxx9248%B5%C4C%2B%2B%B1%CA%BC%C7.txt">wxx9248的C++笔记.txt</a>
    ```

    このリンクを直接クリックすると、ブラウザは最終的に`http://example.com/wxx9248%B5%C4C%2B%2B%B1%CA%BC%C7.txt`に遷移し、500エラーになります。ここから、ブラウザがこのパーセントエンコーディングされた文字列に何もしていないことがはっきり分かります。

    `href`の値をそのまま`"wxx9248的C++笔记.txt"`に置き換えて、次のようにします：

    ```html
    <a href="wxx9248的C++笔记.txt">wxx9248的C++笔记.txt</a>
    ```

    もう一度このリンクをクリックすると、ブラウザは最終的に`http://example.com/wxx9248%E7%9A%84C++%E7%AC%94%E8%AE%B0.txt`に遷移し、このtxtの内容が正しく表示されます。ブラウザがUnicode文字をUTF-8でエンコードしてから、パーセントエンコーディングしていることもはっきり分かります。

[^2]: ついでに言うと、`ngx_http_autoindex_handler`関数を読んで初めて、`autoindex`モジュールが設定パラメータ`autoindex_format`に応じて`HTML`、`JSON`、`JSONP`、`XML`形式のディレクトリインデックスを返せることを知りました。

[^3]: コードの説明：

    ほかのプラットフォームでは、コードはそのままです。

    Windows（`_WIN32`が定義されている）では：

    1. まずシステムのコードページを調べます。`437`（米国英語のOEMコードページ、ASCII互換）か`65001`（UTF-8）であれば、変換せずに元のコードを実行します。それ以外のコードページなら、ファイル名をUTF-8に変換する必要があります：
    1. 文字列をUTF-8に変換するには、二つの段階が必要です：
       1. `ANSI`コードページの文字コードから、Windowsが内部で使っている`Unicode`の文字コード（デフォルトではUTF-16の部分的な実装）に変換します：`MultiByteToWideChar`でバッファのサイズを取得し、`ngx_palloc`で`request`が管理するメモリプールからメモリを確保し、`MultiByteToWideChar`で文字列を変換します。
       1. 内部の`Unicode`の文字コードからUTF-8に変換します：使う関数は`WideCharToMultiByte`で、ほかの手順は一つ目と同様です。

    長さが`n`ではなく`n - 1`なのはなぜか：`WideCharToMultiByte`は変換後の文字列の末尾に終端文字`\0`を追加しますが、NGINXにはこの終端文字は不要なので、長さを一つ減らして終端文字がリンクにエンコードされないようにします。そうしないと、エンコードされたリンクの末尾に`%00`が付いてしまい、ブラウザはそのようなリンクを処理できません。
