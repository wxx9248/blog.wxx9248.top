// Symbols common in tech tags get words, so "C#" and "C" don't share a URL
const spelledSymbols: Readonly<Record<string, string>> = {
  "#": "sharp",
  "%": "percent",
  "&": "and",
  "+": "plus"
};
const spelledSymbolPattern = /[#%&+]/gu;
/*
 * Anything but letters, digits, marks and "_" is unsafe in a URL path segment
 * or a file name ("." included, so ".." can't escape the tags folder).
 */
const unsafeRun = /[^\p{L}\p{N}\p{M}_]+/gu;
const edgeHyphens = /^-+|-+$/gu;

export class TagCollisionError extends Error {
  override name = "TagCollisionError";
}

export class InvalidTagError extends Error {
  override name = "InvalidTagError";
}

export interface TagGroup<T> {
  items: T[];
  name: string;
}

export interface TaggedItem<T> {
  item: T;
  // Identifies the item in error messages, e.g. a post id
  label: string;
  tags: readonly string[];
}

/** The tag's URL segment and output folder name: lowercase and path-safe. */
export function tagSlug(tag: string): string {
  const slug = tag
    .toLowerCase()
    .replace(spelledSymbolPattern, (symbol) => spelledSymbols[symbol] ?? "")
    .replace(unsafeRun, "-")
    .replace(edgeHyphens, "");
  if (!slug) {
    throw new InvalidTagError(
      `Tag "${tag}" has no letters or digits to use in its URL`
    );
  }
  return slug;
}

/**
 * Groups items by tag slug, sorted by slug. Two spellings that map to the
 * same slug would silently share a URL, so they are rejected instead.
 */
export function collectTags<T>(
  entries: readonly TaggedItem<T>[]
): Map<string, TagGroup<T>> {
  const groups = new Map<string, TagGroup<T> & { firstLabel: string }>();

  for (const { item, label, tags } of entries) {
    for (const tag of tags) {
      const slug = tagSlug(tag);
      const group = groups.get(slug);

      if (!group) {
        groups.set(slug, {
          firstLabel: label,
          items: [item],
          name: tag
        });
      } else if (group.name !== tag) {
        throw new TagCollisionError(
          `Tags "${group.name}" and "${tag}" share the URL slug "${slug}" (${group.firstLabel}, ${label}); use one spelling`
        );
      } else if (!group.items.includes(item)) {
        group.items.push(item);
      }
    }
  }

  const sortedSlugs = [...groups.keys()].sort();
  return new Map(
    sortedSlugs.map((slug) => {
      const { items, name } = groups.get(slug)!;
      return [slug, { items, name }];
    })
  );
}
