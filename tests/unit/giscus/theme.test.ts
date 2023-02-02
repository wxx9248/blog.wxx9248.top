import { describe, expect, it } from "vitest";
import { resolve, semanticTokens } from "@wxx9248/colors";
import { giscusOrigin } from "@/lib/giscus/client";
import { giscusThemeCss } from "@/lib/giscus/theme";

function property(css: string, name: string): string | null {
  return (
    new RegExp(`--color-${name}:(#[0-9a-f]{6});`, "u").exec(css)?.[1] ?? null
  );
}

for (const theme of ["dark", "light"] as const) {
  describe(`the ${theme} Giscus theme`, () => {
    const css = giscusThemeCss(theme);
    const token = (name: keyof typeof semanticTokens): string =>
      resolve(semanticTokens[name][theme]);

    it("builds on Giscus's own theme, which @import must come first in", () => {
      expect(
        css.startsWith(`@import url("${giscusOrigin}/themes/${theme}.css");`)
      ).toBe(true);
    });

    it("uses the site's page, text and link colors", () => {
      expect(property(css, "canvas-default")).toBe(token("bg-page"));
      expect(property(css, "fg-default")).toBe(token("text-primary"));
      expect(property(css, "accent-fg")).toBe(token("link"));
      expect(property(css, "danger-fg")).toBe(token("text-error"));
    });

    it("gives the comment input the page's background", () => {
      expect(property(css, "canvas-inset")).toBe(token("bg-page"));
    });

    it("replaces GitHub's green primary button with the site's action color", () => {
      expect(property(css, "btn-primary-bg")).toBe(token("action-primary"));
      expect(property(css, "btn-primary-text")).toBe(token("text-on-primary"));
      expect(property(css, "btn-primary-disabled-bg")).not.toBeNull();
    });
  });
}
