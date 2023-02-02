import { adjacent, findTranslations, parsePostId } from "@/lib/posts/graph";
import { describe, expect, it } from "vitest";

describe("parsePostId", () => {
  it("splits a collection id into language and slug", () => {
    expect(parsePostId("zh/sample-post")).toEqual({
      lang: "zh",
      slug: "sample-post"
    });
  });

  it("rejects an unknown language folder", () => {
    expect(() => parsePostId("jp/x")).toThrow(/jp/u);
  });

  it("rejects nested folders", () => {
    expect(() => parsePostId("zh/a/b")).toThrow(/zh\/a\/b/u);
  });
});

describe("findTranslations", () => {
  const all = [
    { lang: "zh", slug: "modulo" },
    { lang: "en", slug: "modulo" },
    { lang: "ja", slug: "other" }
  ] as const;

  it("finds other languages with the same slug", () => {
    expect(findTranslations(all, { lang: "zh", slug: "modulo" })).toEqual({
      en: "modulo"
    });
  });

  it("returns nothing for a post without translations", () => {
    expect(findTranslations(all, { lang: "ja", slug: "other" })).toEqual({});
  });
});

describe("adjacent", () => {
  const newestFirst = ["c", "b", "a"];

  it("has only an older post at the newest position", () => {
    expect(adjacent(newestFirst, 0)).toEqual({ older: "b" });
  });

  it("has both neighbors in the middle", () => {
    expect(adjacent(newestFirst, 1)).toEqual({ newer: "c", older: "a" });
  });

  it("has only a newer post at the oldest position", () => {
    expect(adjacent(newestFirst, 2)).toEqual({ newer: "b" });
  });
});
