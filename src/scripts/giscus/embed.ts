import {
  type Theme,
  type ThemeChangeDetail,
  currentTheme,
  themeChangeEvent
} from "@/scripts/theme";
import {
  giscusAttributes,
  giscusClientUrl,
  giscusOrigin
} from "@/lib/giscus/client";
import { giscusThemeUrl } from "@/lib/navigation/routes";
import { isLocale } from "@/i18n/locales";
import { site } from "@/config/site";

// Giscus runs on another origin, so it needs the whole URL
function themeUrl(theme: Theme): string {
  return new URL(giscusThemeUrl(theme), location.origin).href;
}

/*
 * The Giscus script reads its settings from its own attributes when it runs,
 * so it is created here with the reader's current theme already applied.
 */
function mount(container: HTMLElement): void {
  const { lang } = container.dataset;
  if (!site.giscus || !isLocale(lang)) {
    return;
  }
  const script = document.createElement("script");
  script.src = giscusClientUrl;
  script.async = true;
  script.crossOrigin = "anonymous";
  for (const [name, value] of Object.entries(
    giscusAttributes(site.giscus, lang, themeUrl(currentTheme()))
  )) {
    script.setAttribute(name, value);
  }
  container.append(script);
}

for (const container of document.querySelectorAll<HTMLElement>(
  "[data-giscus-mount]"
)) {
  mount(container);
}

// Keep an already-loaded comment box in step with the theme toggle
document.addEventListener(themeChangeEvent, (event) => {
  const { theme } = (event as CustomEvent<ThemeChangeDetail>).detail;
  document
    .querySelector<HTMLIFrameElement>("iframe.giscus-frame")
    ?.contentWindow?.postMessage(
      { giscus: { setConfig: { theme: themeUrl(theme) } } },
      giscusOrigin
    );
});
