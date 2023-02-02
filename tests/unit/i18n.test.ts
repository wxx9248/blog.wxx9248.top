import { describe, expect, it } from "vitest";
import { isLocale, localeStaticPaths } from "@/i18n/locales";
import { t } from "@/i18n/t";

describe("t", () => {
  it("returns the string for the locale", () => {
    expect(t("en", "nav.posts")).toBe("posts");
  });

  it("fills placeholders", () => {
    expect(t("en", "post.readingTime", { minutes: 4 })).toBe("4 min");
  });

  it("throws when a placeholder has no param", () => {
    expect(() => t("en", "post.readingTime")).toThrow(/minutes/u);
  });
});

describe("locales", () => {
  it("recognizes only configured locales", () => {
    expect(isLocale("zh")).toBe(true);
    expect(isLocale("jp")).toBe(false);
    expect(isLocale(null)).toBe(false);
  });

  it("builds one static path per locale", () => {
    expect(localeStaticPaths()).toEqual([
      { params: { lang: "en" } },
      { params: { lang: "zh" } },
      { params: { lang: "ja" } }
    ]);
  });
});
