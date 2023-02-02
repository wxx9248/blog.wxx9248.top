import { homeUrl, rssUrl, tagsUrl } from "./routes";
import type { Locale } from "@/i18n/locales";
import type { UiKey } from "@/i18n/ui/en";

export interface SiteLink {
  href: string;
  label: UiKey;
}

/**
 * The site's sections, shared by the desktop status bar and the phone menu
 * so both always offer the same destinations.
 */
export function siteLinks(lang: Locale): SiteLink[] {
  return [
    { href: homeUrl(lang), label: "nav.posts" },
    { href: tagsUrl(lang), label: "nav.tags" },
    { href: rssUrl(lang), label: "nav.rss" }
  ];
}
