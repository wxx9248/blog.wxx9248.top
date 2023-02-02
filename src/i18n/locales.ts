export const locales = ["en", "zh", "ja"] as const;

export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "en";

export interface LocaleInfo {
  giscusLang: string;
  htmlLang: string;
  label: string;
  licenseDeed: string;
}

export const localeInfo: Record<Locale, LocaleInfo> = {
  en: {
    giscusLang: "en",
    htmlLang: "en",
    label: "English",
    licenseDeed: "en"
  },
  ja: {
    giscusLang: "ja",
    htmlLang: "ja",
    label: "日本語",
    licenseDeed: "ja"
  },
  zh: {
    giscusLang: "zh-CN",
    htmlLang: "zh-CN",
    label: "中文",
    licenseDeed: "zh"
  }
};

// Remembers the reader's language choice for the redirect at "/"
export const localeCookie = {
  maxAgeSeconds: 31_536_000,
  name: "lang"
} as const;

export function isLocale(value: unknown): value is Locale {
  return (
    typeof value === "string" && (locales as readonly string[]).includes(value)
  );
}

export function localeStaticPaths(): { params: { lang: Locale } }[] {
  return locales.map((lang) => ({ params: { lang } }));
}
