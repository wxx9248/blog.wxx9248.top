# blog.wxx9248.top

## Requirements

- Node.js — the version in [`.node-version`](.node-version)
- pnpm — the version in `packageManager` in [`package.json`](package.json)

## Commands

| Command         | What it does                                                                                 |
| --------------- | -------------------------------------------------------------------------------------------- |
| `pnpm install`  | Install dependencies                                                                         |
| `pnpm dev`      | Start the dev server. Drafts are visible; search works only after a build                    |
| `pnpm build`    | Lint, type check, build to `dist/` and build the search index. Fails if any step fails       |
| `pnpm preview`  | Serve `dist/` exactly as Cloudflare will (`wrangler dev`), including search and 404 handling |
| `pnpm test`     | Unit tests (Vitest), then browser tests (Playwright) against a test build                    |
| `pnpm lint:fix` | Fix what ESLint can fix                                                                      |
| `pnpm format`   | Format everything with Prettier                                                              |

Browser tests need Chromium (`pnpm exec playwright install chromium`). They build their own site into `dist-test/` from the posts in `tests/fixtures/posts/`, so changing real posts can't break them.

## Writing a post

A post is one file: `src/content/posts/<lang>/<slug>.mdx` (or `.md`), where `<lang>` is `en`, `zh` or `ja`. The file name is the URL slug: `src/content/posts/<lang>/<slug>.mdx` is published at `/<lang>/posts/<slug>/`.

Frontmatter:

```yaml
---
title: Post title # required
date: YYYY-MM-DD # required
updated: YYYY-MM-DD # optional, shown on the post
description: One-line summary # optional; otherwise the first paragraph is used
tags: [tag-one, tag-two] # optional
draft: true # optional; drafts appear in `pnpm dev` only
---
```

The build checks every post against this schema, so a typo in a date or a missing title fails the build instead of breaking a page. Tags that differ only in case or spacing within one language (`Tag` and `tag`) also fail the build, because they would share one URL.

Inside a post:

- **Math:** `$…$` inline and fenced `$$` blocks for display formulas, rendered with KaTeX at build time:

  ```md
  $$
  a^2 + b^2 = c^2
  $$
  ```

- **Code:** fenced code blocks with a language get highlighting, a copy button and a frame. A `title="…"` after the language adds a file-tab title.
- **Headings:** start at `##`; the post title is the page's only `#`.
- **Line breaks:** a single newline doesn't break the line; end the line with `\` to force one.
- **Files:** images and downloads go in `public/assets/<slug>/`, with no subfolders, linked as `/assets/<slug>/<file>`. Audio, video and anything over 25 MiB go in the `blog` bucket in Oracle Object Storage as `storage/<slug>/<file>`, linked as `/storage/<slug>/<file>`, because Cloudflare rejects bigger files and ignores the `Range` requests that seeking needs. `public/_redirects` sends that path to the bucket, and `pnpm dev` follows it too.

## Adding a translation

Give the translation the same file name in another language folder, e.g. `src/content/posts/<other-lang>/<slug>.mdx`. The versions then link to each other automatically ("also: …" under the title, the language switcher, and `hreflang` for search engines). Untranslated posts simply don't appear in other languages.

## Writing a widget

Widgets live in `src/widgets/` as Vue 3 single-file components, shared by every language version of a post. Use one in a post like this:

```mdx
import MyWidget from "@/widgets/MyWidget.vue";

<Demo title="Widget title">
  <MyWidget client:visible lang="<lang>" />
</Demo>
```

- `Demo` is the bordered "▶ interactive" frame. It is available in every post without an import.
- `client:visible` loads the widget's JavaScript only when it scrolls into view; the rest of the page ships none. Without a `client:` directive the widget is rendered once to static HTML and is not interactive.
- Pass the post's language as a prop and keep the widget's own strings in a `Record<Locale, …>` inside the component.
- The `Demo` frame is a CSS container, so a widget can adapt to its own width with `@container (width >= …)` queries.
- Style with the design tokens in [`src/styles/tokens.css`](src/styles/tokens.css) (`var(--font-mono)`, `var(--tap-min)`, …) and the semantic colors from [`@wxx9248/colors`](https://www.npmjs.com/package/@wxx9248/colors) (`var(--color-accent)`, `var(--color-text-muted)`, `var(--color-link)`, …); colors follow light and dark mode automatically. A color the package lacks goes in `tokens.css`, bound to a `--palette-*` step.

## Project layout

```
src/
  config/site.ts         site-wide settings: URL, title, repo, license, Giscus
  content/posts/<lang>/  posts
  content.config.ts      post frontmatter schema
  i18n/                  locales and UI strings (ui/<lang>.ts), t() helper
  lib/                   logic by feature, unit-tested
    bilibili/            AV/BV id conversion
    giscus/              comment settings and theme files
    language/            language choice, the "/" redirect, language switch targets
    markdown/            rehype plugins
    navigation/          URLs and site links
    posts/               loading posts, translations, tags, excerpts, formatting
  components/, layouts/  rendering only
  pages/                 one route per page type, for every language
  scripts/               browser scripts, in the same groups as lib/, plus theme.ts
  styles/                tokens.css (design tokens), media.css (breakpoints), global.css
  widgets/               Vue demo widgets
tests/
  unit/                  Vitest
  e2e/                   Playwright, at phone/tablet/desktop widths in light and dark
  fixtures/posts/        the posts the browser tests build from
```
