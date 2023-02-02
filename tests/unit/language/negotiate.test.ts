import { describe, expect, it } from "vitest";
import {
  localeSettings,
  negotiateLocale,
  readCookie
} from "@/lib/language/negotiate";

describe("negotiateLocale", () => {
  it.each([
    [{ cookie: "zh", preferred: ["ja", "en"] }, "zh"],
    [{ cookie: "jp", preferred: ["ja", "en"] }, "ja"],
    [{ preferred: ["zh-Hant-TW", "en"] }, "zh"],
    [{ preferred: ["fr", "de", "zh-CN"] }, "zh"],
    [{ preferred: ["fr"] }, "en"],
    [{ preferred: [] }, "en"],
    [{ preferred: ["ZH-cn"] }, "zh"],
    [{ preferred: ["*", ""] }, "en"]
  ])("negotiates %o → %s", (input, expected) => {
    expect(negotiateLocale(input, localeSettings)).toBe(expected);
  });
});

describe("readCookie", () => {
  it("reads cookies from a document.cookie string", () => {
    expect(readCookie("theme=dark; lang=ja; x=1", "lang")).toBe("ja");
    expect(readCookie("xlang=zh; lang=en", "lang")).toBe("en");
    expect(readCookie("lang=%E4%B8%AD", "lang")).toBe("中");
  });

  it("returns nothing for missing or malformed cookies", () => {
    expect(readCookie("lang=%E4", "lang")).toBeNull();
    expect(readCookie("", "lang")).toBeNull();
  });
});
