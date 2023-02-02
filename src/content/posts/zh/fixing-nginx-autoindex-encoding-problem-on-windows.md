---
title: 彻底解决NGINX autoindex模块在Windows上的编码问题
date: 2021-08-17
tags: [NGINX, 编码, Windows, C, Bugfix]
---

## 0x00 前言

从接触服务器运维开始，我一直在用NGINX这款优秀的HTTP/反向代理/负载均衡服务器。因为熟悉NGINX配置的编写，我也想在Windows平台上继续使用它当作HTTP服务器。但是我在Windows上使用它的时候，发现NGINX对Windows的支持不是很好。暂且不说因为Windows内核不支持`epoll`等调用，NGINX的并发性能打了折扣，NGINX对Windows上的编码系统也支持的不是很好。

NGINX原本是为Linux上编写的，后来才被移植到Windows上。在移植时，为了代码兼容性，NGINX并没有采用Windows所使用的Unicode编码系统（部分UTF-16实现），因为UTF-16的一个字符最少使用2字节，和ASCII和UTF-8均不兼容。所以NGINX需要和Windows的遗留的ANSI代码页（Code Page）打交道，并在使用Win32 API的时候，调用后缀为`A`的API族。而微软表示，代码页这一套东西，只是为了命令行程序和老旧程序而存在的，在新程序中推荐使用Windows自身的Unicode编码系统，以摆脱代码页带来的编码困扰。但是，NGINX没有特别地针对Windows这套代码页系统进行特殊处理，导致了一些编码带来的问题。

## 0x01 问题描述

NGINX自带一个`autoindex`模块，这个模块可以自动为目录生成索引，供用户浏览目录中的文件，适合于搭建简易HTTP文件服务器。此模块在*nix系统中工作正常，而在不采用`437`（美国英语OEM代码页，兼容ASCII）或`65001`（UTF-8）代码页的Windows上会遇到编码问题。

使用的测试平台信息如下：

| 项目       | 值                                          |
| ---------- | ------------------------------------------- |
| CPU架构    | `x86`, `amd64`指令集扩展                    |
| 操作系统   | `Windows 10 21H1 [Version 10.0.19043.1165]` |
| 系统代码页 | `936`（简体中文，GBK）                      |

复现步骤如下：

1. 在NGINX配置文件中的`location`段打开`autoindex`：`autoindex on;`
1. 在被索引的目录下创建文件名中含有非ASCII字符的文件，例如`wxx9248的C++笔记.txt`；
1. 然后在浏览器中打开NGINX生成的索引页面，点击此文件，就会跳出`500 Internal Server Error`的错误页；

错误日志中显示类似以下的错误信息：

```plain
2021/08/15 02:08:31 [crit] 26400#8976: *1 CreateFile() "C:/wxx9248的C++笔记.txt" failed (1113: No mapping for the Unicode character exists in the target multi-byte code page), client: 127.0.0.1, server: _, request: "GET /wxx9248%B5%C4C%2B%2B%B1%CA%BC%C7.txt HTTP/1.1", host: "example.com", referrer: "http://example.com/"
```

其他信息：

- 错误日志内的汉字编码为GBK；
- 如果强制指定网页编码为UTF-8（`charset utf-8;`），那么页面的中文部分会出现乱码。

## 0x02 溯因过程

首先根据报错日志，可以确定这是一个由编码引起的问题。

在浏览器的调试页的“网络”选项卡中，发现服务器的响应头中，`Content-Type`项未指定`charset`参数。这说明的页面的编码格式是由浏览器自己识别的，需要自行判断页面编码。

查看`autoindex`生成的链接：转义过的URL可以给出编码信息。

```html
<a href="wxx9248%B5%C4C%2B%2B%B1%CA%BC%C7.txt">wxx9248的C++笔记.txt</a>
```

发现在转义后的URL中，一个汉字均由两个字节进行表示，猜测为GBK编码，后经实验验证确认。

随后在实验中发现一个规则[^1]：

- 当超链接的目标（`href`）里的Unicode字符未使用百分比编码表示时，浏览器在用户点击此链接后，会自动使用UTF-8编码此字符，并使用百分比编码进行转义，然后将转义后的字符替换到链接中再跳转；
- 当超链接的目标里的Unicode字符已经使用百分比编码表示时，浏览器不进行处理，直接跳转到链接；

发现`autoindex`在生成网页的时候就对链接进行了GBK/百分比编码。而NGINX只接受UTF-8/百分比编码的链接，于是它假设这串百分比编码使用了UTF-8编码，直接用UTF-8标准对其进行解码，造成了错误。

解决思路也比较明确了：需要让`autoindex`在内部生成UTF-8编码的链接，而不是GBK的。

---

下载NGINX源代码，定位到`autoindex`模块的源文件位置：`src/http/modules/ngx_http_autoindex_module.c`，并打开。

直接查找进行链接字符串拼接的部分：搜索`<a href=`。在第502行找到了计算各个项目名称长度的代码：

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

发现在附近，`entry`这个标识符比较有价值。代码在使用`entry`时进行了数组索引和结构成员引用，猜测这个`entry`里面存放了此目录下各个项目的所有信息，包括其名字（`entry[i].name`）。

查找`entry`这个标识符，找到它在443行处的定义，位于`ngx_http_autoindex_html`函数中：

```c
ngx_http_autoindex_entry_t     *entry;
```

继续查找结构体类型的定义，在第37行：

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

发现`name`这个成员的类型是`ngx_str_t`。

在[NGINX开发指南](https://nginx.org/en/docs/dev/development_guide.html)中，查找`ngx_str_t`结构的定义：

```c
typedef struct
{
    size_t len;
    unsigned char *data;
} ngx_str_t;
```

它是一个描述了NGINX字符串的结构体，包括字符串的长度和基地址。

> 注意，NGINX字符串使用了`unsigned char`类型，而非常见的`char`。

了解了必要的定义后，需要查找`entry`的这个`name`成员是怎么被赋值的。

分析`ngx_http_autoindex_html`这个函数，发现`entry`是从`entries`这个NGINX数组中取出来的，而`entries`是函数调用者传过来的参数。继续搜索`ngx_http_autoindex_html`这个标识符，发现`ngx_http_autoindex_handler`会调用这个函数。

分析`ngx_http_autoindex_handler`这个函数[^2]，在245行和252行附近找到了`entries`的初始化语句：

```c
ngx_memzero(&entries, sizeof(ngx_array_t));
// Code omitted here...
if (ngx_array_init(&entries, pool, 40, sizeof(ngx_http_autoindex_entry_t)) != NGX_OK) {
    return ngx_http_autoindex_error(r, &dir, &path);
}
```

向下进行分析，在363行发现`entries`中新增了元素：

```c
entry = ngx_array_push(&entries);
if (entry == NULL) {
    return ngx_http_autoindex_error(r, &dir, &path);
}
```

寻找此处的作用域，发现是在一个`for`循环里面：

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

猜测此`for`循环填充了`entries`所有的元素，着重分析此循环。在375行找到了突破口：`entries`里的元素名称被拷贝入数据：

```c
ngx_cpystrn(entry->name.data, ngx_de_name(&dir), len + 1);
```

检查NGINX的源代码，发现`ngx_de_name`是一个宏定义，它有`win32`和`unix`两个版本，`win32`版本如下：

```c
// In src/os/win32/ngx_files.h
#define ngx_de_name(dir)            ((u_char *) (dir)->finddata.cFileName)
```

回过头来看这个`dir`参数，发现它是一个`ngx_dir_t`类型的结构，同样有上述两个版本，查看其`win32`版本定义：

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

在Win32 API的文档中查找`WIN32_FIND_DATA`，发现其有`WIN32_FIND_DATAA`和`WIN32_FIND_DATAW`两个版本。经实验验证，NGINX使用的是前者，也就是ANSI版本。这也就彻底地解释了为什么链接的编码为系统代码页，在实验环境中，也就是GBK编码。

解决方法也就水落石出了，将`entry->name`转换成UTF-8编码即可。

## 0x03 修修补补

1. 找到368~375行代码段：
   ```c
   entry->name.len = len;

   entry->name.data = ngx_pnalloc(pool, len + 1);
   if (entry->name.data == NULL) {
       return ngx_http_autoindex_error(r, &dir, &path);
   }

   ngx_cpystrn(entry->name.data, ngx_de_name(&dir), len + 1);
   ```
1. 替换以上代码段为下面的代码段[^3]：

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

1. 重新编译NGINX，测试效果；

## 0x04 心得体会

NGINX这个问题困扰了不少人。在解决之前我在网上搜了一下，解决的方案无非有两种：

1. 修改源代码关掉了URL转义，修改网页编码为GBK；
1. 修改系统代码页为`65001`（UTF-8）；

两种方案都有它们的缺陷：

1. 第一种方法的缺陷很明显，在文件名为中英文符号混杂的时候，依然会报500错误出错；
1. 第二种方法比第一种方法好很多，NGINX整个程序都在使用UTF-8。但是第二种方法可能会造成其他程序的兼容性问题，尤其是一些还在使用ANSI代码页的老旧程序或命令行程序。如果是命令行程序还好办，在执行前执行`chcp 936`就能正常显示；但是如果是GUI程序的话，那就会造成乱码，且没有什么办法可以避开（代表程序：UltraISO）。

所以自己就研究了NGINX的源代码，写了这一套方法来解决这个问题。我在这之前没有了解过NGINX的内部。通过阅读源代码，我对NGINX的工作模式有了一个初步的认识，但是离真正理解NGINX还有很长的路要走。

[^1]: 就拿这个链接举例子吧：

    ```html
    <a href="wxx9248%B5%C4C%2B%2B%B1%CA%BC%C7.txt">wxx9248的C++笔记.txt</a>
    ```

    直接点击这个链接，发现浏览器最后跳转到的链接为`http://example.com/wxx9248%B5%C4C%2B%2B%B1%CA%BC%C7.txt`，并报500错误。在这里可以清楚地看到，浏览器未对这串百分比编码采取任何措施。

    如果将`href`后的值直接换成`"wxx9248的C++笔记.txt"`，即下面这个样子：

    ```html
    <a href="wxx9248的C++笔记.txt">wxx9248的C++笔记.txt</a>
    ```

    再次点击此链接，浏览器最后跳转到的链接为`http://example.com/wxx9248%E7%9A%84C++%E7%AC%94%E8%AE%B0.txt`，并正常显示了此txt的内容。也可以清楚地看到，浏览器对Unicode字符进行了UTF-8编码，再进行了百分比编码。

[^2]: 顺带一提，看了`ngx_http_autoindex_handler`这个函数，我才知道`autoindex`模块可以根据配置参数`autoindex_format`，返回`HTML`、`JSON`、`JSONP`或`XML`格式的目录索引。

[^3]: 代码段解释：

    对于其他平台，代码保持不变；

    对于Windows平台（有`_WIN32`宏定义）：

    1. 首先我们检测系统代码页，如果为`437`（美国英语OEM代码页，兼容ASCII）或者`65001`（UTF-8），则执行原来的代码，不进行转换。如果不是上述代码页，我们需要将文件名转换为UTF-8编码：
    1. 字符串转换为UTF-8，需要分两步：
       1. `ANSI`代码页编码转换为Windows内部采用的`Unicode`编码（默认是部分的UTF-16实现）：使用`MultiByteToWideChar`获取缓冲区大小；使用`ngx_palloc`在`request`管理的内存池中分配内存；使用`MultiByteToWideChar`转换字符串；
       1. 内部`Unicode`编码转换为UTF-8：使用的函数是`WideCharToMultiByte`，其他步骤类似第一部分；

    为什么长度是`n - 1`，而不是`n`：`WideCharToMultiByte`会在转换后的字符串后面追加一个`\0`终止符，而NGINX不需要这个终止符，所以我们需要将长度减一，避免终止符被编码到链接中。如果不这么做的话，编码的链接结尾就会有一个`%00`，而这样的链接浏览器是无法处理的。
