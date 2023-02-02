import { type Locale, defaultLocale, locales } from "@/i18n/locales";

export interface NegotiationInput {
  // The remembered choice, from the language switcher's cookie
  cookie?: string | null;
  // BCP 47 tags in preference order, e.g. navigator.languages
  preferred: readonly string[];
}

export interface LocaleSettings {
  defaultLocale: Locale;
  locales: readonly Locale[];
}

export const localeSettings: LocaleSettings = { defaultLocale, locales };

/*
 * Both functions below are also inlined into the "/" page as source text, so
 * they must use nothing but their parameters and language built-ins.
 */

/** Returns the decoded cookie value, or null when it is absent or malformed. */
export function readCookie(cookieString: string, name: string): string | null {
  const prefix = `${name}=`;
  const pair = cookieString
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(prefix));
  if (!pair) {
    return null;
  }
  try {
    return decodeURIComponent(pair.slice(prefix.length));
  } catch {
    return null;
  }
}

export function negotiateLocale(
  { cookie, preferred }: NegotiationInput,
  settings: LocaleSettings
): Locale {
  const known = (value: unknown): value is Locale =>
    typeof value === "string" &&
    (settings.locales as readonly string[]).includes(value);

  if (known(cookie)) {
    return cookie;
  }
  for (const tag of preferred) {
    const [primarySubtag = ""] = tag.toLowerCase().split("-");
    if (known(primarySubtag)) {
      return primarySubtag;
    }
  }
  return settings.defaultLocale;
}
