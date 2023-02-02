import {
  absoluteUrl,
  editUrl,
  giscusThemeUrl,
  homeUrl,
  licenseUrl,
  postUrl,
  rssUrl,
  searchUrl,
  tagUrl,
  tagsUrl
} from "@/lib/navigation/routes";
import { expect, it } from "vitest";

it("builds every URL shape", () => {
  expect(homeUrl("zh")).toBe("/zh/");
  expect(postUrl("zh", "sample-post")).toBe("/zh/posts/sample-post/");
  expect(tagUrl("zh", "示例")).toBe("/zh/tags/%E7%A4%BA%E4%BE%8B/");
  expect(tagUrl("en", "Machine Learning")).toBe("/en/tags/machine-learning/");
  expect(tagsUrl("ja")).toBe("/ja/tags/");
  expect(searchUrl("en")).toBe("/en/search/");
  expect(rssUrl("en")).toBe("/en/rss.xml");
  expect(editUrl("src/content/posts/zh/x.mdx")).toBe(
    "https://github.com/wxx9248/blog.wxx9248.top/edit/master/src/content/posts/zh/x.mdx"
  );
  expect(absoluteUrl("/zh/")).toBe("https://blog.wxx9248.top/zh/");
  expect(licenseUrl("ja")).toBe(
    "https://creativecommons.org/licenses/by-nc-sa/4.0/deed.ja"
  );
});

it("gives each theme its own Giscus stylesheet", () => {
  expect(giscusThemeUrl("dark")).toBe("/giscus/dark.css");
});
