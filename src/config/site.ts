export interface GiscusConfig {
  category: string;
  categoryId: string;
  repo: `${string}/${string}`;
  repoId: string;
}

export const site = {
  author: "wxx9248",
  copyrightStartYear: 2018,
  // Comments stay hidden until the Giscus IDs are filled in (see README)
  giscus: {
    category: "Comments",
    categoryId: "DIC_kwDOI4x-ns4DKW1q",
    repo: "wxx9248/blog.wxx9248.top",
    repoId: "R_kgDOI4x-ng"
  } as GiscusConfig | null,
  license: {
    deedBaseUrl: "https://creativecommons.org/licenses/by-nc-sa/4.0/deed.",
    name: "CC BY-NC-SA 4.0"
  },
  prompt: { host: "blog", user: "wxx9248" },
  repo: {
    branch: "master",
    url: "https://github.com/wxx9248/blog.wxx9248.top"
  },
  title: "wxx9248's blog",
  url: "https://blog.wxx9248.top"
} as const;
