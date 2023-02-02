import { type Locale, locales } from "@/i18n/locales";
import {
  homeUrl,
  postUrl,
  searchUrl,
  tagUrl,
  tagsUrl
} from "@/lib/navigation/routes";

/** What a page is, as far as switching its language is concerned. */
export type PageContext =
  | { kind: "home" | "search" | "tags"; lang: Locale }
  | {
      kind: "post";
      lang: Locale;
      slug: string;
      translations: Partial<Record<Locale, string>>;
    }
  | {
      kind: "tag";
      lang: Locale;
      localesWithTag: readonly Locale[];
      slug: string;
    }
  // Pages that belong to no language: the 404 page and the "/" redirect
  | { kind: "unlocalized" };

export interface LanguageTarget {
  available: boolean;
  current: boolean;
  href: string;
}

export type LanguageTargets = Record<Locale, LanguageTarget>;

type Destination = Omit<LanguageTarget, "current">;

function destination(context: PageContext, locale: Locale): Destination {
  switch (context.kind) {
    case "home":
    case "unlocalized":
      return { available: true, href: homeUrl(locale) };
    case "search":
      return { available: true, href: searchUrl(locale) };
    case "tags":
      return { available: true, href: tagsUrl(locale) };
    case "post": {
      const slug =
        locale === context.lang ? context.slug : context.translations[locale];
      return slug
        ? { available: true, href: postUrl(locale, slug) }
        : { available: false, href: homeUrl(locale) };
    }
  }

  // Only tag pages remain; TypeScript has narrowed `context` to them
  return locale === context.lang || context.localesWithTag.includes(locale)
    ? { available: true, href: tagUrl(locale, context.slug) }
    : { available: false, href: tagsUrl(locale) };
}

export function languageTargets(context: PageContext): LanguageTargets {
  return Object.fromEntries(
    locales.map((locale) => [
      locale,
      {
        ...destination(context, locale),
        current: "lang" in context && context.lang === locale
      }
    ])
  ) as LanguageTargets;
}

/** Versions of the page that exist, for `<link rel="alternate" hreflang>`. */
export function alternateLinks(
  targets: LanguageTargets
): { href: string; locale: Locale }[] {
  return locales
    .filter((locale) => targets[locale].available)
    .map((locale) => ({ href: targets[locale].href, locale }));
}
