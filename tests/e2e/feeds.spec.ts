import { type APIRequestContext, type Page } from "@playwright/test";
import { expect, samplePost, test } from "./helpers";
import { absoluteUrl } from "@/lib/navigation/routes";

interface FeedItem {
  description: string;
  link: string;
}

async function readXml(
  page: Page,
  request: APIRequestContext,
  path: string
): Promise<{ items: FeedItem[]; locations: string[]; valid: boolean }> {
  const response = await request.get(path);
  expect(response.status()).toBe(200);
  const xml = await response.text();
  return page.evaluate((source) => {
    const document = new DOMParser().parseFromString(source, "application/xml");
    const text = (parent: Element, tag: string): string =>
      parent.querySelector(tag)?.textContent ?? "";
    return {
      items: [...document.querySelectorAll("item")].map((item) => ({
        description: text(item, "description"),
        link: text(item, "link")
      })),
      locations: [...document.querySelectorAll("loc")].map(
        (location) => location.textContent ?? ""
      ),
      valid: !document.querySelector("parsererror")
    };
  }, xml);
}

test.describe("feeds and sitemap", () => {
  test("publishes the Chinese post in the Chinese feed", async ({
    page,
    request
  }) => {
    const feed = await readXml(page, request, "/zh/rss.xml");
    expect(feed.valid).toBe(true);
    expect(feed.items).toEqual([
      {
        description: samplePost.excerpt,
        link: absoluteUrl(samplePost.path)
      }
    ]);
  });

  test("publishes an empty English feed", async ({ page, request }) => {
    const feed = await readXml(page, request, "/en/rss.xml");
    expect(feed.valid).toBe(true);
    expect(feed.items).toEqual([]);
  });

  test("lists the post in the sitemap", async ({ page, request }) => {
    const index = await readXml(page, request, "/sitemap-index.xml");
    expect(index.valid).toBe(true);
    const pages = await Promise.all(
      index.locations.map((location) =>
        readXml(page, request, new URL(location).pathname)
      )
    );
    const locations = pages.flatMap(({ locations: urls }) => urls);
    expect(locations).toContain(absoluteUrl(samplePost.path));
    expect(locations.some((url) => url.includes("404"))).toBe(false);
  });
});

test("gives every sitemap entry one alternate per language", async ({
  request
}) => {
  const sitemap = await (await request.get("/sitemap-0.xml")).text();
  expect(sitemap).not.toContain("<loc>https://blog.wxx9248.top/</loc>");
  for (const entry of sitemap.split("<url>").slice(1)) {
    const languages = [...entry.matchAll(/hreflang="(?<lang>[^"]+)"/gu)].map(
      (match) => match.groups?.lang
    );
    expect(new Set(languages).size, entry).toBe(languages.length);
  }
});
