import { expect, it } from "vitest";
import type { GiscusConfig } from "@/config/site";
import { giscusAttributes } from "@/lib/giscus/client";

const config: GiscusConfig = {
  category: "Comments",
  categoryId: "DIC_test",
  repo: "wxx9248/blog.wxx9248.top",
  repoId: "R_test"
};

const themeUrl = "https://blog.wxx9248.top/giscus/light.css";

it("maps the config, language and theme to Giscus attributes", () => {
  expect(giscusAttributes(config, "zh", themeUrl)).toEqual({
    "data-category": "Comments",
    "data-category-id": "DIC_test",
    "data-emit-metadata": "0",
    "data-input-position": "top",
    "data-lang": "zh-CN",
    "data-loading": "lazy",
    "data-mapping": "pathname",
    "data-reactions-enabled": "1",
    "data-repo": "wxx9248/blog.wxx9248.top",
    "data-repo-id": "R_test",
    "data-strict": "1",
    "data-theme": themeUrl
  });
});
