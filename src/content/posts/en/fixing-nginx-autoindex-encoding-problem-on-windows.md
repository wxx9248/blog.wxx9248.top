---
title: Fixing the NGINX autoindex Encoding Problem on Windows for Good
date: 2021-08-17
tags: [NGINX, encoding, Windows, C, Bugfix]
---

## 0x00 Preface

Ever since I got into server administration, I've been using NGINX, an excellent HTTP server, reverse proxy and load balancer. Because I'm familiar with writing NGINX configuration, I wanted to keep using it as my HTTP server on Windows too. But when I used it on Windows, I found that NGINX's Windows support isn't great. Leaving aside the hit to NGINX's concurrency because the Windows kernel doesn't support calls like `epoll`, NGINX doesn't handle the Windows encoding system very well either.

NGINX was originally written for Linux and only later ported to Windows. For code compatibility, the port didn't adopt the Unicode encoding system that Windows uses (a partial UTF-16 implementation), because a UTF-16 character takes at least 2 bytes and is compatible with neither ASCII nor UTF-8. So NGINX has to deal with Windows' legacy ANSI code pages and, when it uses the Win32 API, call the family of APIs with the `A` suffix. Microsoft says that code pages exist only for command-line programs and legacy programs, and recommends that new programs use Windows' own Unicode encoding system to get away from the encoding trouble code pages bring. But NGINX doesn't do anything special for the Windows code page system, which leads to some encoding problems.

## 0x01 The Problem

NGINX comes with an `autoindex` module, which generates directory indexes automatically so users can browse the files in a directory. It's handy for setting up a simple HTTP file server. The module works fine on *nix systems, but runs into encoding problems on Windows systems whose code page isn't `437` (the US English OEM code page, ASCII-compatible) or `65001` (UTF-8).

The test platform:

| Item             | Value                                       |
| ---------------- | ------------------------------------------- |
| CPU architecture | `x86`, `amd64` instruction set extension    |
| Operating system | `Windows 10 21H1 [Version 10.0.19043.1165]` |
| System code page | `936` (Simplified Chinese, GBK)             |

Steps to reproduce:

1. Turn on `autoindex` in a `location` block of the NGINX configuration: `autoindex on;`.
1. In the indexed directory, create a file whose name contains non-ASCII characters, such as `wxx9248的C++笔记.txt` ("wxx9248's C++ notes").
1. Open the index page NGINX generates in a browser and click the file, and you get a `500 Internal Server Error` page.

The error log shows something like this:

```plain
2021/08/15 02:08:31 [crit] 26400#8976: *1 CreateFile() "C:/wxx9248的C++笔记.txt" failed (1113: No mapping for the Unicode character exists in the target multi-byte code page), client: 127.0.0.1, server: _, request: "GET /wxx9248%B5%C4C%2B%2B%B1%CA%BC%C7.txt HTTP/1.1", host: "example.com", referrer: "http://example.com/"
```

Other information:

- The Chinese characters in the error log are GBK-encoded.
- If you force the page encoding to UTF-8 (`charset utf-8;`), the Chinese parts of the page become garbled.

## 0x02 Tracing the Cause

First, the error log makes it clear that this is an encoding problem.

In the Network tab of the browser's developer tools, the server's response header has no `charset` parameter in `Content-Type`. That means the page encoding is left to the browser, which has to work it out on its own.

Next, look at the links `autoindex` generates: the escaped URL gives away the encoding.

```html
<a href="wxx9248%B5%C4C%2B%2B%B1%CA%BC%C7.txt">wxx9248的C++笔记.txt</a>
```

In the escaped URL, each Chinese character is represented by two bytes. I guessed it was GBK, and an experiment later confirmed it.

Then an experiment turned up a rule[^1]:

- When the Unicode characters in a hyperlink's target (`href`) are not percent-encoded, the browser, once the user clicks the link, automatically encodes those characters in UTF-8, escapes them with percent-encoding, puts the escaped characters back into the link in their place, and then follows it.
- When the Unicode characters in a hyperlink's target are already percent-encoded, the browser leaves them alone and follows the link directly.

It turns out `autoindex` already GBK/percent-encodes the links when it generates the page. But NGINX only accepts UTF-8/percent-encoded links, so it assumes the percent-encoded string uses UTF-8 and decodes it with the UTF-8 rules, which causes the error.

The fix is fairly clear: make `autoindex` generate UTF-8 links internally instead of GBK ones.

---

Download the NGINX source code, find the source file of the `autoindex` module, `src/http/modules/ngx_http_autoindex_module.c`, and open it.

Go straight to the part that concatenates the link string: search for `<a href=`. Line 502 has the code that computes the length of each entry's name:

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

Nearby, the identifier `entry` looks valuable. The code indexes into it as an array and accesses structure members, so I guessed `entry` holds all the information about each entry in the directory, including its name (`entry[i].name`).

A search for the identifier `entry` finds its definition at line 443, in the `ngx_http_autoindex_html` function:

```c
ngx_http_autoindex_entry_t     *entry;
```

Next, the definition of the structure type, at line 37:

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

The `name` member has type `ngx_str_t`.

Look up the definition of the `ngx_str_t` structure in the [NGINX development guide](https://nginx.org/en/docs/dev/development_guide.html):

```c
typedef struct
{
    size_t len;
    unsigned char *data;
} ngx_str_t;
```

It's a structure describing an NGINX string, with the string's length and base address.

> Note that NGINX strings use `unsigned char`, not the usual `char`.

With the necessary definitions understood, we need to find out how this `name` member of `entry` gets assigned.

Analyzing the `ngx_http_autoindex_html` function, I found that `entry` comes out of the NGINX array `entries`, which is a parameter passed in by the caller. Searching further for the identifier `ngx_http_autoindex_html` showed that `ngx_http_autoindex_handler` calls this function.

Analyzing the `ngx_http_autoindex_handler` function[^2], I found the initialization of `entries` around lines 245 and 252:

```c
ngx_memzero(&entries, sizeof(ngx_array_t));
// Code omitted here...
if (ngx_array_init(&entries, pool, 40, sizeof(ngx_http_autoindex_entry_t)) != NGX_OK) {
    return ngx_http_autoindex_error(r, &dir, &path);
}
```

Reading further down, line 363 adds an element to `entries`:

```c
entry = ngx_array_push(&entries);
if (entry == NULL) {
    return ngx_http_autoindex_error(r, &dir, &path);
}
```

Looking at the enclosing scope, I found it's inside a `for` loop:

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

I guessed this `for` loop fills in all the elements of `entries`, so I focused on it. Line 375 is the breakthrough: the names of the elements in `entries` are copied in:

```c
ngx_cpystrn(entry->name.data, ngx_de_name(&dir), len + 1);
```

Checking the NGINX source, `ngx_de_name` is a macro with a `win32` version and a `unix` version. The `win32` version is:

```c
// In src/os/win32/ngx_files.h
#define ngx_de_name(dir)            ((u_char *) (dir)->finddata.cFileName)
```

Going back to the `dir` parameter: it's a structure of type `ngx_dir_t`, which also has the two versions above. Its `win32` definition:

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

The Win32 API documentation shows that `WIN32_FIND_DATA` has two versions, `WIN32_FIND_DATAA` and `WIN32_FIND_DATAW`. Experiments confirm that NGINX uses the former, the ANSI version. That fully explains why the links are encoded in the system code page, which is GBK in the test environment.

So the solution is clear: convert `entry->name` to UTF-8.

## 0x03 Patching It Up

1. Find the code at lines 368-375:
   ```c
   entry->name.len = len;

   entry->name.data = ngx_pnalloc(pool, len + 1);
   if (entry->name.data == NULL) {
       return ngx_http_autoindex_error(r, &dir, &path);
   }

   ngx_cpystrn(entry->name.data, ngx_de_name(&dir), len + 1);
   ```
1. Replace it with the code below[^3]:

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

1. Rebuild NGINX and test it.

## 0x04 Takeaways

This NGINX problem has bothered quite a few people. Before fixing it, I searched online, and the solutions come down to two:

1. Modify the source code to turn off URL escaping, and change the page encoding to GBK.
1. Change the system code page to `65001` (UTF-8).

Both have drawbacks:

1. The drawback of the first is obvious: file names that mix Chinese and English symbols still cause a 500 error.
1. The second is much better than the first, since all of NGINX then uses UTF-8. But it can cause compatibility problems in other programs, especially old programs or command-line programs that still use ANSI code pages. Command-line programs are easy to handle: run `chcp 936` before running them and they display correctly. But GUI programs show garbled text, and there's no real way around it (for example, UltraISO).

So I studied the NGINX source code myself and came up with this approach. I hadn't looked at the internals of NGINX before. Reading the source gave me a basic understanding of how NGINX works, but I still have a long way to go before I really understand it.

[^1]: Take this link as an example:

    ```html
    <a href="wxx9248%B5%C4C%2B%2B%B1%CA%BC%C7.txt">wxx9248的C++笔记.txt</a>
    ```

    If you click this link directly, the browser ends up at `http://example.com/wxx9248%B5%C4C%2B%2B%B1%CA%BC%C7.txt` and gets a 500 error. You can clearly see that the browser did nothing to the percent-encoded string.

    If you replace the value after `href` with `"wxx9248的C++笔记.txt"` directly, like this:

    ```html
    <a href="wxx9248的C++笔记.txt">wxx9248的C++笔记.txt</a>
    ```

    and click the link again, the browser ends up at `http://example.com/wxx9248%E7%9A%84C++%E7%AC%94%E8%AE%B0.txt` and shows the contents of the txt file normally. You can also clearly see that the browser encoded the Unicode characters in UTF-8 and then percent-encoded them.

[^2]: By the way, it was only after reading `ngx_http_autoindex_handler` that I learned the `autoindex` module can return directory indexes in `HTML`, `JSON`, `JSONP` or `XML` format, depending on the `autoindex_format` setting.

[^3]: How the code works:

    On other platforms, the code stays the same.

    On Windows (where `_WIN32` is defined):

    1. First we check the system code page. If it's `437` (the US English OEM code page, ASCII-compatible) or `65001` (UTF-8), the original code runs without any conversion. For any other code page, we need to convert the file name to UTF-8:
    1. Converting the string to UTF-8 takes two steps:
       1. From the `ANSI` code page encoding to the `Unicode` encoding Windows uses internally (a partial UTF-16 implementation by default): get the buffer size with `MultiByteToWideChar`; allocate memory from the memory pool managed by the `request` with `ngx_palloc`; convert the string with `MultiByteToWideChar`;
       1. From the internal `Unicode` encoding to UTF-8: the function is `WideCharToMultiByte`, and the other steps are the same as in the first part.

    Why the length is `n - 1` and not `n`: `WideCharToMultiByte` appends a `\0` terminator to the converted string, and NGINX doesn't need it, so we subtract one from the length to keep the terminator out of the link. Without that, the encoded link would end in `%00`, which browsers can't handle.
