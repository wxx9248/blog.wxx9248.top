import { expect, it } from "vitest";
import { siteLinks } from "@/lib/navigation/site-links";

it("lists the site's sections once, for every navigation surface", () => {
  expect(siteLinks("zh")).toEqual([
    { href: "/zh/", label: "nav.posts" },
    { href: "/zh/tags/", label: "nav.tags" },
    { href: "/zh/rss.xml", label: "nav.rss" }
  ]);
});
