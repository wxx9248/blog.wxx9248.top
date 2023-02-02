import { type UiKey, en } from "./ui/en";
import type { Locale } from "./locales";
import { ja } from "./ui/ja";
import { zh } from "./ui/zh";

const dictionaries: Record<Locale, Record<UiKey, string>> = { en, ja, zh };

const placeholderPattern = /\{(?<name>\w+)\}/gu;

export function t(
  lang: Locale,
  key: UiKey,
  params: Readonly<Record<string, string | number>> = {}
): string {
  return dictionaries[lang][key].replace(
    placeholderPattern,
    (_match: string, name: string) => {
      if (!Object.hasOwn(params, name)) {
        throw new Error(`UI string "${key}" needs a "${name}" param`);
      }
      return String(params[name]);
    }
  );
}
