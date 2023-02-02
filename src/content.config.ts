import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";

const posts = defineCollection({
  // The browser tests build the site from their own posts
  loader: glob({
    base: process.env.POSTS_DIR ?? "./src/content/posts",
    pattern: "**/*.{md,mdx}"
  }),
  schema: z.object({
    date: z.coerce.date(),
    description: z.string().optional(),
    draft: z.boolean().default(false),
    tags: z.array(z.string().trim().nonempty()).default([]),
    title: z.string(),
    updated: z.coerce.date().optional()
  })
});

export const collections = { posts };
