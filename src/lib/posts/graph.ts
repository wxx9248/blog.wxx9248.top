import { type Locale, isLocale, locales } from "@/i18n/locales";

export interface PostLocation {
  lang: Locale;
  slug: string;
}

export interface Neighbors<T> {
  newer?: T;
  older?: T;
}

const neighborOffset = 1;
const firstIndex = 0;

/** Posts live at `<lang>/<slug>` inside the collection folder. */
export function parsePostId(id: string): PostLocation {
  const [lang, slug, ...rest] = id.split("/");
  if (!isLocale(lang) || !slug || rest.length) {
    throw new Error(
      `Post "${id}" must be at <lang>/<slug>, with <lang> one of: ${locales.join(", ")}`
    );
  }
  return { lang, slug };
}

export function findTranslations(
  all: readonly PostLocation[],
  post: PostLocation
): Partial<Record<Locale, string>> {
  return Object.fromEntries(
    all
      .filter((other) => other.slug === post.slug && other.lang !== post.lang)
      .map((other) => [other.lang, other.slug])
  );
}

export function adjacent<T>(
  sortedNewestFirst: readonly T[],
  index: number
): Neighbors<T> {
  const neighbors: Neighbors<T> = {};
  if (index > firstIndex) {
    neighbors.newer = sortedNewestFirst[index - neighborOffset];
  }
  if (index + neighborOffset < sortedNewestFirst.length) {
    neighbors.older = sortedNewestFirst[index + neighborOffset];
  }
  return neighbors;
}
