import type { UiKey } from "./en";

export const zh = {
  "demo.label": "▶ 交互演示",
  "footer.license":
    '除非另外声明，本网站的全部内容均采用<a rel="license" href="{licenseUrl}">{licenseName}</a>协议。',
  "nav.close": "关闭",
  "nav.language": "语言",
  "nav.menu": "菜单",
  "nav.posts": "文章",
  "nav.rss": "rss.xml",
  "nav.search": "搜索",
  "nav.tags": "标签",
  "notFound.message": "command not found",
  "post.also": "其他语言：",
  "post.back": "cd ..",
  "post.comments": "$ tail -f comments.log",
  "post.newer": "更新的文章",
  "post.noTranslation": "暂无{lang}版本",
  "post.older": "更早的文章",
  "post.readingTime": "{minutes} 分钟",
  "post.updated": "更新于 {date}",
  "redirect.choose": "选择语言",
  "search.devNotice": "构建后才能搜索（pnpm build && pnpm preview）",
  "search.noResults": "无匹配结果",
  "search.placeholder": "grep -Fri …",
  "search.unavailable": "搜索暂时不可用",
  "tags.count": "{count} 篇",
  "theme.toggle": "切换主题"
} satisfies Record<UiKey, string>;
