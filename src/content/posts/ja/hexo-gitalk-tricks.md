---
title: HexoでGitalkコメントシステムを構築する
date: 2020-02-20
tags: [Hexo, Gitalk]
---

## 0x00 はじめに

最近ふと思い立って、ブログをもう少しおしゃれにしたくなりました。ブログにはコメントシステムがなく、ちょうど使っているテーマが対応していたので、導入してみることにしました。

このテーマは[Gitment](https://github.com/imsun/gitment)と[Gitalk](https://github.com/gitalk/gitalk)の二つに対応しています。どちらもissueをコメント欄として使うもので、機能はほぼ同じです。\
GitHubで確認したところ、Gitmentは長い間更新されていなかったので、Gitalkを選びました。

## 0x01 手順

### 準備

Gitalkのドキュメントを読むと、設定はかなり簡単でした。さらにこのテーマのpugテンプレートが手間を大幅に省いてくれるので、最終的に設定が必要なのはテーマの`_config.yml`だけです：

```yaml title="_config.yml"
gitalk:
  enable: true
  client_id: xxx
  client_secret: xxx
  repo: Blog-comments
  owner: wxx9248
  admin: wxx9248
```

`enable`は`true`にします。\
`client_id`と`client_secret`はOAuthアプリを登録したときに生成されます。\
`repo`にはコメント用リポジトリの名前を入れます。\
`owner`はGitHubのアカウント名です。\
`admin`は配列にでき、この配列に含まれるGitHubアカウントは新しいissueを初期化できます。

### 実践

まず[OAuthアプリを登録](https://github.com/settings/applications/new)します：![OAuthアプリの登録フォーム](/assets/hexo-gitalk-tricks/OAuth-Application-Registry.png)

- Application name：好きな名前
- Homepage URL：ブログのトップページのURL
- Application description：任意、アプリの簡単な説明。
- **Authorization callback URL**：コールバックURL。通常はHomepage URLと同じです。

OAuthアプリを作成すると、GitHubから`client_id`と`client_secret`が割り当てられるので、`_config.yml`の該当するフィールドに入れます。\
あとはHexoのページを再生成してデプロイするだけです。

## 0x02 注意点

コメント欄のある各ページのURLには、スペースなどURLエンコードが必要な特殊文字を含めないでください。\
できるだけ英字、数字、ハイフン`-`だけを使ってください。\
そうしないと、GitHubのOAuthコールバックで訳の分からないエラーが出ます！\
これはF12を開いてデバッグし、いろいろなテストでパケットをキャプチャして得た教訓です。\
Gitalkは、トップページ、記事一覧、404ページなどを除くほぼすべてのページに表示されます。\
mdファイルから生成されていないページがある場合、それらのページのコメント欄はすべて一つのissueを指し、そのissueにはトップページのタイトルが名前として付けられます。下の図のとおりです：![GitHubのissueページ](/assets/hexo-gitalk-tricks/Universal-comment-section.png)![ある独立ページ](/assets/hexo-gitalk-tricks/Universal-comment-section-inpage.png)
