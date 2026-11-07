import { defaultLocale, localeInfo, locales } from "./src/i18n/locales";
import { rehypeHeadingIds, unified } from "@astrojs/markdown-remark";
import { defineConfig } from "astro/config";
import { devRedirects } from "./src/integrations/dev-redirects";
import expressiveCode from "astro-expressive-code";
import { giscusConfigCheck } from "./src/integrations/giscus-config-check";
import { giscusOrigin } from "./src/lib/giscus/client";
import mdx from "@astrojs/mdx";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import { rehypeFocusableMath } from "./src/lib/markdown/focusable-math";
import { rehypeHeadingMarkers } from "./src/lib/markdown/heading-markers";
import rehypeKatex from "rehype-katex";
import remarkMath from "remark-math";
import { site } from "./src/config/site";
import sitemap from "@astrojs/sitemap";
import vue from "@astrojs/vue";

export default defineConfig({
  compressHTML: true,
  integrations: [
    vue(),
    // Must come before mdx() so it also handles code blocks in .mdx files
    expressiveCode({
      styleOverrides: {
        borderColor: "var(--color-border-default)",
        codeFontFamily: "var(--font-mono)",
        uiFontFamily: "var(--font-mono)"
      },
      themeCssSelector: (theme) => `[data-theme='${theme.type}']`,
      themes: ["github-dark", "github-light"],
      useDarkModeMediaQuery: true
    }),
    mdx(),
    devRedirects(),
    giscusConfigCheck(),
    sitemap({
      /*
       * Leave out the 404 page, and "/", which only redirects. The
       * plugin would also list "/" as a second English alternate.
       */
      filter: (page) => {
        const { pathname } = new URL(page);
        return pathname !== "/" && !pathname.startsWith("/404");
      },
      i18n: {
        defaultLocale,
        locales: Object.fromEntries(
          locales.map((locale) => [locale, localeInfo[locale].htmlLang])
        )
      }
    })
  ],
  markdown: {
    // Unified rather than the default Sätteri, for remark/rehype plugins
    processor: unified({
      rehypePlugins: [
        rehypeKatex,
        rehypeFocusableMath,
        // Ids first, so the markers and links use Astro's heading ids
        rehypeHeadingIds,
        rehypeHeadingMarkers,
        [rehypeAutolinkHeadings, { behavior: "wrap" }]
      ],
      remarkPlugins: [remarkMath],
      // The default sr-only class isn't defined here, so the label would show
      remarkRehype: {
        // U+FE0E asks for the text arrow rather than the emoji
        footnoteBackContent: "↩\uFE0E",
        footnoteLabelProperties: { className: ["visually-hidden"] }
      }
    })
  },
  // Lets Giscus's frame load its theme from `astro dev`, which blocks other sites
  security: {
    allowedDomains: [
      { hostname: new URL(giscusOrigin).hostname, protocol: "https" }
    ]
  },
  site: site.url,
  vite: {
    css: {
      lightningcss: { drafts: { customMedia: true } },
      transformer: "lightningcss"
    }
  }
});
