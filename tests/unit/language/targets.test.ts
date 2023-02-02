import { alternateLinks, languageTargets } from "@/lib/language/targets";
import { describe, expect, it } from "vitest";

describe("languageTargets", () => {
  it("links a post to its translations and other homes otherwise", () => {
    const targets = languageTargets({
      kind: "post",
      lang: "zh",
      slug: "modulo",
      translations: { en: "modulo" }
    });
    expect(targets.zh).toEqual({
      available: true,
      current: true,
      href: "/zh/posts/modulo/"
    });
    expect(targets.en).toEqual({
      available: true,
      current: false,
      href: "/en/posts/modulo/"
    });
    expect(targets.ja).toEqual({
      available: false,
      current: false,
      href: "/ja/"
    });
  });

  it("falls back to the tags index for a tag missing in a language", () => {
    const targets = languageTargets({
      kind: "tag",
      lang: "zh",
      localesWithTag: ["zh"],
      slug: "python"
    });
    expect(targets.zh.href).toBe("/zh/tags/python/");
    expect(targets.en).toEqual({
      available: false,
      current: false,
      href: "/en/tags/"
    });
  });

  it("maps home pages to every language's home", () => {
    const targets = languageTargets({ kind: "home", lang: "ja" });
    expect(targets).toEqual({
      en: { available: true, current: false, href: "/en/" },
      ja: { available: true, current: true, href: "/ja/" },
      zh: { available: true, current: false, href: "/zh/" }
    });
  });

  it("maps search and tags pages to the same page in each language", () => {
    expect(languageTargets({ kind: "search", lang: "en" }).zh.href).toBe(
      "/zh/search/"
    );
    expect(languageTargets({ kind: "tags", lang: "en" }).ja.href).toBe(
      "/ja/tags/"
    );
  });

  it("offers every home with none current on unlocalized pages", () => {
    const targets = languageTargets({ kind: "unlocalized" });
    expect(Object.values(targets).every((target) => target.available)).toBe(
      true
    );
    expect(Object.values(targets).some((target) => target.current)).toBe(false);
    expect(targets.zh.href).toBe("/zh/");
  });
});

describe("alternateLinks", () => {
  it("keeps only available targets", () => {
    const links = alternateLinks(
      languageTargets({
        kind: "post",
        lang: "zh",
        slug: "modulo",
        translations: {}
      })
    );
    expect(links).toEqual([{ href: "/zh/posts/modulo/", locale: "zh" }]);
  });
});
