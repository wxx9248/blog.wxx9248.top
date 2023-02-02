---
title: 在Hexo引擎上搭建Gitalk评论系统
date: 2020-02-20
tags: [Hexo, Gitalk]
---

## 0x00 前言

最近心血来潮，想把自己的博客搞的再fancy一点。自己博客缺一个评论系统，刚好自己用的这个主题也支持，就想着实装一个。

这个主题支持[Gitment](https://github.com/imsun/gitment)和[Gitalk](https://github.com/gitalk/gitalk)两种方案，都是拿issue当评论区的，实际功能差不多。\
去Github上看了一下，Gitment已经很长时间没有更新了，就选了Gitalk当评论系统。

## 0x01 流程

### 准备工作

阅读Gitalk的docs，发现配置起来还是蛮容易的，再加上这个主题的pug模板又为你省了一堆事，最后你只需要配置主题`_config.yml`：

```yaml title="_config.yml"
gitalk:
  enable: true
  client_id: xxx
  client_secret: xxx
  repo: Blog-comments
  owner: wxx9248
  admin: wxx9248
```

`enable`设为`true`；\
`client_id`和`client_secret`会在申请OAuth的时候生成；\
`repo`填评论区repo名称；\
`owner`是Github账户名；\
`admin`可以是一个数组，在这个数组里的Github帐户可以初始化一个新issue。

### 开始实践

首先去[申请一个OAuth应用](https://github.com/settings/applications/new)：![OAuth应用申请表单](/assets/hexo-gitalk-tricks/OAuth-Application-Registry.png)

- Application name：你喜欢的名称；
- Homepage URL：博客主页的URL；
- Application description：可选，填应用简介。
- **Authorization callback URL**：回调URL，一般跟Homepage URL相同。

OAuth应用创建完之后，Github会分配给你`client_id`和`client_secret`，将它们填入`_config.yml`相应字段里面。\
再重新生成、部署Hexo页面即可。

## 0x02 注意事项

请注意，对于你的每一个含有评论系统的页面，它们的URL不能包含需要URL编码的特殊字符，如空格。\
请尽量只使用字母、数字和连字符`-`\
否则Github在OAuth回调的时候会出现莫名其妙的错误！\
这是我开了F12调试各种抓包测试换来的教训。\
Gitalk会显示于基本上每一个页面，除了主页、文章概览和404页面等。\
如果有非md文件生成的页面，这些页面的评论区都会指向一个issue，而这个issue是用你的主页标题命名的。如下图：![Github issue页面](/assets/hexo-gitalk-tricks/Universal-comment-section.png)![某游离页面](/assets/hexo-gitalk-tricks/Universal-comment-section-inpage.png)
