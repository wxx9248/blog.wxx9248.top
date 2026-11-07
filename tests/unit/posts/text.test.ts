import { byteSize, excerpt, readingMinutes } from "@/lib/posts/text";
import { describe, expect, it } from "vitest";

const fence = "```";

const mdx = [
  'import ModDemo from "@/widgets/ModDemo.vue";',
  "",
  "# 示例文章",
  "",
  '<Demo title="x">',
  "</Demo>",
  "",
  "在讲[扩展欧几里得算法](https://example.com)的时候，发现**不一样**。",
  "",
  `${fence}c`,
  "int x;",
  fence
].join("\n");

describe("excerpt", () => {
  it("excerpts the first prose paragraph", () => {
    expect(excerpt(mdx)).toBe("在讲扩展欧几里得算法的时候，发现不一样。");
  });

  it("keeps the TeX source of inline math and drops HTML tags", () => {
    expect(excerpt("求$-8 \\bmod 7$，<del>真的</del>吗")).toBe(
      "求-8 \\bmod 7，真的吗"
    );
  });

  it("drops hard line breaks", () => {
    expect(excerpt("第一行\\\n第二行")).toBe("第一行 第二行");
  });

  it("truncates long excerpts", () => {
    expect(excerpt("word ".repeat(100), 20)).toMatch(/^.{19}…$/u);
  });
});

describe("readingMinutes", () => {
  it("estimates reading time from prose only", () => {
    expect(readingMinutes("字".repeat(800))).toBe(2);
    expect(readingMinutes("word ".repeat(460))).toBe(2);
    expect(readingMinutes(`${fence}\n${"x ".repeat(5000)}\n${fence}`)).toBe(1);
  });
});

describe("one-line display math", () => {
  it("does not swallow the paragraphs after it", () => {
    const body = `Intro.\n\n$$x = y$$\n\n${"word ".repeat(2000)}`;
    expect(readingMinutes(body)).toBe(9);
  });

  it("is not used as the excerpt", () => {
    expect(excerpt("$$x = y$$\n\nHello.")).toBe("Hello.");
  });
});

describe("byteSize", () => {
  it("counts UTF-8 bytes", () => {
    expect(byteSize("取")).toBe(3);
  });
});
