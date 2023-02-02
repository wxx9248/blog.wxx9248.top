import type { UiKey } from "./en";

export const ja = {
  "demo.label": "▶ インタラクティブ",
  "footer.license":
    'もし特に断りがない限り、このウェブサイトのすべてのコンテンツは<a rel="license" href="{licenseUrl}">{licenseName}</a>ライセンスのもとで提供されています。',
  "nav.close": "閉じる",
  "nav.language": "言語",
  "nav.menu": "メニュー",
  "nav.posts": "記事",
  "nav.rss": "rss.xml",
  "nav.search": "検索",
  "nav.tags": "タグ",
  "notFound.message": "command not found",
  "post.also": "他の言語：",
  "post.back": "cd ..",
  "post.comments": "$ tail -f comments.log",
  "post.newer": "新しい記事",
  "post.noTranslation": "{lang}版はありません",
  "post.older": "古い記事",
  "post.readingTime": "{minutes} 分",
  "post.updated": "{date} 更新",
  "redirect.choose": "言語を選択",
  "search.devNotice": "検索はビルド後に使えます（pnpm build && pnpm preview）",
  "search.noResults": "一致する結果はありません",
  "search.placeholder": "grep -Fri …",
  "search.unavailable": "現在検索を利用できません",
  "tags.count": "{count} 件",
  "theme.toggle": "テーマを切り替え"
} satisfies Record<UiKey, string>;
