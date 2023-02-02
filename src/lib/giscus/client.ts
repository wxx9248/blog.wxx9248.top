import { type Locale, localeInfo } from "@/i18n/locales";
import type { GiscusConfig } from "@/config/site";

export const giscusOrigin = "https://giscus.app";
export const giscusClientUrl = `${giscusOrigin}/client.js`;

/** Every Giscus setting, as the data attributes its client script reads. */
export function giscusAttributes(
  config: GiscusConfig,
  lang: Locale,
  themeUrl: string
): Record<`data-${string}`, string> {
  return {
    "data-category": config.category,
    "data-category-id": config.categoryId,
    "data-emit-metadata": "0",
    "data-input-position": "top",
    "data-lang": localeInfo[lang].giscusLang,
    "data-loading": "lazy",
    // One thread per URL, so each language version keeps its own comments
    "data-mapping": "pathname",
    "data-reactions-enabled": "1",
    "data-repo": config.repo,
    "data-repo-id": config.repoId,
    "data-strict": "1",
    "data-theme": themeUrl
  };
}
