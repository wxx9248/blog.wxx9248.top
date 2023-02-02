// Path- and command-like strings stay identical in every language, as in a real shell
export const en = {
  "demo.label": "▶ interactive",
  "footer.license":
    'Except where otherwise noted, all contents served by the website are licensed under <a rel="license" href="{licenseUrl}">{licenseName}</a>.',
  "nav.close": "close",
  "nav.language": "language",
  "nav.menu": "menu",
  "nav.posts": "posts",
  "nav.rss": "rss.xml",
  "nav.search": "search",
  "nav.tags": "tags",
  "notFound.message": "command not found",
  "post.also": "also:",
  "post.back": "cd ..",
  "post.comments": "$ tail -f comments.log",
  "post.newer": "newer",
  "post.noTranslation": "no {lang} translation",
  "post.older": "older",
  "post.readingTime": "{minutes} min",
  "post.updated": "updated {date}",
  "redirect.choose": "choose a language",
  "search.devNotice": "search works after a build (pnpm build && pnpm preview)",
  "search.noResults": "no matches",
  "search.placeholder": "grep -Fri …",
  "search.unavailable": "search is unavailable right now",
  "tags.count": "{count} posts",
  "theme.toggle": "toggle theme"
} as const;

export type UiKey = keyof typeof en;
