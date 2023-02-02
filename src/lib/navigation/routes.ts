import { type Locale, localeInfo } from "@/i18n/locales";
import type { Theme } from "@/scripts/theme";
import { site } from "@/config/site";
import { tagSlug } from "@/lib/posts/tags";

// Appended by the "/" shortcut so the search page focuses its input
export const searchFocusHash = "#q";

export function homeUrl(lang: Locale): string {
  return `/${lang}/`;
}

export function postUrl(lang: Locale, slug: string): string {
  return `${homeUrl(lang)}posts/${slug}/`;
}

export function tagsUrl(lang: Locale): string {
  return `${homeUrl(lang)}tags/`;
}

export function tagUrl(lang: Locale, tag: string): string {
  return `${tagsUrl(lang)}${encodeURIComponent(tagSlug(tag))}/`;
}

export function searchUrl(lang: Locale): string {
  return `${homeUrl(lang)}search/`;
}

export function giscusThemeUrl(theme: Theme): string {
  return `/giscus/${theme}.css`;
}

export function rssUrl(lang: Locale): string {
  return `${homeUrl(lang)}rss.xml`;
}

export function editUrl(repoRelativePath: string): string {
  return `${site.repo.url}/edit/${site.repo.branch}/${repoRelativePath}`;
}

export function absoluteUrl(path: string): string {
  return new URL(path, site.url).href;
}

export function licenseUrl(lang: Locale): string {
  return `${site.license.deedBaseUrl}${localeInfo[lang].licenseDeed}`;
}
