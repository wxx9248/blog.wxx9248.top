import { describe, expect, it } from "vitest";
import { findRedirect } from "@/lib/navigation/redirects";

const rules = `# A comment
/old /new 301
/storage/* https://example.com/o/storage/:splat 302
/plain/* https://example.com/plain/:splat
/old-too /first
/old-too /second
`;

describe("findRedirect", () => {
  it("matches an exact path", () => {
    expect(findRedirect(rules, "/old")).toStrictEqual({
      location: "/new",
      status: 301
    });
  });

  it("fills in the splat, keeping the path's encoding", () => {
    expect(findRedirect(rules, "/storage/a/b%20c.mp3")).toStrictEqual({
      location: "https://example.com/o/storage/a/b%20c.mp3",
      status: 302
    });
  });

  it("defaults to a 302", () => {
    expect(findRedirect(rules, "/plain/a")?.status).toBe(302);
  });

  it("uses the first matching rule", () => {
    expect(findRedirect(rules, "/old-too")?.location).toBe("/first");
  });

  it("ignores other paths and comments", () => {
    expect(findRedirect(rules, "/old/more")).toBeNull();
    expect(findRedirect(rules, "/assets/a.png")).toBeNull();
    expect(findRedirect(rules, "#")).toBeNull();
  });
});
