import { describe, expect, it, vi } from "vitest";
import { rootRedirectScript } from "@/lib/language/root-redirect";

// Runs the generated inline script with stand-ins for the browser globals
function runInline(cookie: string, languages: string[]): unknown {
  const replace = vi.fn();
  new Function("location", "document", "navigator", rootRedirectScript())(
    { replace },
    { cookie },
    { languages }
  );
  return replace.mock.calls;
}

describe("rootRedirectScript", () => {
  it("redirects to the browser's language without outside references", () => {
    expect(runInline("", ["ja-JP", "en"])).toEqual([["/ja/"]]);
  });

  it("prefers the remembered language", () => {
    expect(runInline("theme=dark; lang=zh", ["ja-JP"])).toEqual([["/zh/"]]);
  });

  it("falls back to English", () => {
    expect(runInline("lang=%E4", [])).toEqual([["/en/"]]);
  });
});
