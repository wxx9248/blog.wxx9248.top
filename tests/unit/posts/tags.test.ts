import { collectTags, tagSlug } from "@/lib/posts/tags";
import { describe, expect, it } from "vitest";

describe("tagSlug", () => {
  it("slugs tags", () => {
    expect(tagSlug("Python")).toBe("python");
    expect(tagSlug("  Machine   Learning ")).toBe("machine-learning");
    expect(tagSlug("示例")).toBe("示例");
  });
});

describe("collectTags", () => {
  it("rejects colliding spellings and names both posts", () => {
    expect(() =>
      collectTags([
        { item: 1, label: "zh/a", tags: ["Python"] },
        { item: 2, label: "zh/b", tags: ["python"] }
      ])
    ).toThrow(/Python.*python.*zh\/a.*zh\/b/su);
  });

  it("groups items under one tag", () => {
    const tags = collectTags([
      { item: 1, label: "a", tags: ["C", "示例"] },
      { item: 2, label: "b", tags: ["C"] }
    ]);
    expect(tags.get("c")).toEqual({ items: [1, 2], name: "C" });
    expect([...tags.keys()]).toEqual(["c", "示例"]);
  });
});

describe("tagSlug with URL-unsafe characters", () => {
  it("spells out common symbols", () => {
    expect(tagSlug("C#")).toBe("csharp");
    expect(tagSlug("C++")).toBe("cplusplus");
    expect(tagSlug("100%")).toBe("100percent");
    expect(tagSlug("R&D")).toBe("randd");
  });

  it("turns other unsafe characters into hyphens", () => {
    expect(tagSlug("I/O")).toBe("i-o");
    expect(tagSlug("Node.js")).toBe("node-js");
    expect(tagSlug("a?b\\c:d")).toBe("a-b-c-d");
  });

  it("only produces characters safe in URLs and file names", () => {
    for (const tag of ["C#", "I/O", "a..b", "a|b", "<t>", "示例", "テスト"]) {
      expect(tagSlug(tag)).toMatch(/^[\p{L}\p{N}\p{M}_-]+$/u);
    }
  });

  it("rejects tags with nothing usable", () => {
    expect(() => tagSlug(" ")).toThrow(/" "/u);
    expect(() => tagSlug("///")).toThrow(/"\/\/\/"/u);
  });
});
