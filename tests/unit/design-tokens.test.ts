import { expect, it } from "vitest";
import { globSync, readFileSync } from "node:fs";

const tokensFile = "src/styles/tokens.css";
// A token, or a CSS-wide keyword that takes the size from elsewhere, is fine
const literalFontSize =
  /font-size:(?!\s*(?:var\(|inherit;|initial;|unset;|revert;))[^;]+;/gu;

it("takes every font size from a design token", () => {
  const offenders = globSync("src/**/*.{astro,css,vue}")
    .filter((file) => file !== tokensFile)
    .flatMap((file) =>
      [...readFileSync(file, "utf8").matchAll(literalFontSize)].map(
        ([declaration]) => `${file}: ${declaration}`
      )
    );
  expect(offenders).toEqual([]);
});
