---
title: Setting Up Gitalk Comments on Hexo
date: 2020-02-20
tags: [Hexo, Gitalk]
---

## 0x00 Preface

On a whim, I recently wanted to make my blog a bit fancier. It was missing a comment system, and the theme I use happens to support one, so I decided to set it up.

The theme supports two options, [Gitment](https://github.com/imsun/gitment) and [Gitalk](https://github.com/gitalk/gitalk). Both use issues as the comment section and work about the same.\
I checked them on GitHub, and Gitment hadn't been updated in a long time, so I chose Gitalk.

## 0x01 Steps

### Preparation

I read through Gitalk's docs and found the configuration pretty easy, and the theme's pug templates save you a lot of work on top of that. In the end, all you need to configure is the theme's `_config.yml`:

```yaml title="_config.yml"
gitalk:
  enable: true
  client_id: xxx
  client_secret: xxx
  repo: Blog-comments
  owner: wxx9248
  admin: wxx9248
```

Set `enable` to `true`;\
`client_id` and `client_secret` are generated when you register the OAuth app;\
`repo` is the name of the comment repo;\
`owner` is the GitHub account name;\
`admin` can be an array, and the GitHub accounts in it can initialize a new issue.

### Putting It into Practice

First, [register an OAuth app](https://github.com/settings/applications/new): ![The OAuth app registration form](/assets/hexo-gitalk-tricks/OAuth-Application-Registry.png)

- Application name: any name you like;
- Homepage URL: the URL of the blog's home page;
- Application description: optional, a short description of the app.
- **Authorization callback URL**: the callback URL, usually the same as the Homepage URL.

Once the OAuth app is created, GitHub gives you a `client_id` and a `client_secret`. Put them in the matching fields in `_config.yml`.\
Then regenerate and redeploy the Hexo pages.

## 0x02 Caveats

Note that for every page with a comment section, the URL must not contain special characters that need URL encoding, such as spaces.\
Try to use only letters, digits and hyphens `-`,\
or GitHub will throw baffling errors during the OAuth callback!\
I learned that the hard way, with F12 open, debugging and capturing packets through all sorts of tests.\
Gitalk shows up on almost every page, except the home page, the post overview, the 404 page and so on.\
Pages that aren't generated from md files all point their comment sections to one issue, named after your home page title. As shown below: ![The GitHub issue page](/assets/hexo-gitalk-tricks/Universal-comment-section.png)![A standalone page](/assets/hexo-gitalk-tricks/Universal-comment-section-inpage.png)
