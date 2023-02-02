import { type Locale, localeCookie, locales } from "@/i18n/locales";
import {
  type LocaleSettings,
  localeSettings,
  negotiateLocale,
  readCookie
} from "./negotiate";
import { homeUrl } from "@/lib/navigation/routes";

interface RedirectConfig {
  cookieName: string;
  homes: Record<Locale, string>;
  settings: LocaleSettings;
}

// Runs in the browser from source text, so it uses only its parameters
function redirect(
  config: RedirectConfig,
  read: typeof readCookie,
  negotiate: typeof negotiateLocale
): void {
  const locale = negotiate(
    {
      cookie: read(document.cookie, config.cookieName),
      preferred: navigator.languages
    },
    config.settings
  );
  // Replace rather than assign, so "/" doesn't stay in the back-button history
  location.replace(config.homes[locale]);
}

/**
 * The "/" redirect as an inline <head> script, so it runs before any
 * stylesheet or bundle loads. The tested functions are inlined as source.
 */
export function rootRedirectScript(): string {
  const config: RedirectConfig = {
    cookieName: localeCookie.name,
    homes: Object.fromEntries(
      locales.map((locale) => [locale, homeUrl(locale)])
    ) as Record<Locale, string>,
    settings: localeSettings
  };
  return `(${redirect.toString()})(${JSON.stringify(config)}, ${readCookie.toString()}, ${negotiateLocale.toString()});`;
}
