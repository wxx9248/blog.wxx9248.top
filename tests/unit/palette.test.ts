import { describe, expect, it } from "vitest";
import { globSync, readFileSync } from "node:fs";
import { resolve, semanticTokens } from "@wxx9248/colors";

const tokens = readFileSync("src/styles/tokens.css", "utf8");

const packageTokens = Object.keys(semanticTokens).map(
  (name) => `color-${name}`
);
// Colors the package lacks, which tokens.css binds to palette steps
const blogTokens = [...tokens.matchAll(/--(color-[a-z-]+):/gu)].map(
  ([, name = ""]) => name
);

describe("palette", () => {
  it("takes every color from @wxx9248/colors", () => {
    expect(tokens).not.toMatch(/#[0-9a-f]{3,8}\b|rgb\(|hsl\(|oklch\(/iu);
  });

  it("leaves the package's tokens to the package", () => {
    expect(blogTokens.filter((name) => packageTokens.includes(name))).toEqual(
      []
    );
  });

  it("keeps www.wxx9248.top's colors in the dark theme", () => {
    expect({
      accent: resolve(semanticTokens.accent.dark),
      code: resolve(semanticTokens["text-code"].dark),
      heading: resolve(semanticTokens["text-heading"].dark),
      highlight: resolve(semanticTokens["text-highlight"].dark)
    }).toEqual({
      accent: "#33b5e5",
      code: "#a3c6ff",
      heading: "#9be9f2",
      highlight: "#f7d02c"
    });
  });

  it("uses only color tokens that the package or tokens.css defines", () => {
    const defined = new Set([...packageTokens, ...blogTokens]);
    const sources = globSync([
      "src/**/*.{astro,css,ts,vue}",
      "astro.config.ts"
    ]);
    for (const file of sources) {
      for (const [, name] of readFileSync(file, "utf8").matchAll(
        /var\(--(color-[a-z-]+)/gu
      )) {
        expect(defined, `--${name} in ${file}`).toContain(name);
      }
    }
  });
});
