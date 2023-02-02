import { type CollectionEntry, getCollection } from "astro:content";
import { type PostLocation, findTranslations, parsePostId } from "./graph";
import { type TagGroup, collectTags } from "./tags";
import { byteSize, excerpt, readingMinutes } from "./text";
import type { Locale } from "@/i18n/locales";

const pathSeparatorLength = "/".length;

export type Post = CollectionEntry<"posts"> &
  PostLocation & {
    // Source file name and repo-relative path, e.g. for "edit on GitHub"
    fileName: string;
    filePath: string;
    readingMinutes: number;
    sizeBytes: number;
    summary: string;
  };

function toPost(entry: CollectionEntry<"posts">): Post {
  const body = entry.body ?? "";
  const { filePath } = entry;
  if (!filePath) {
    throw new Error(`Post "${entry.id}" has no source file`);
  }
  return {
    ...entry,
    ...parsePostId(entry.id),
    fileName: filePath.slice(filePath.lastIndexOf("/") + pathSeparatorLength),
    filePath,
    readingMinutes: readingMinutes(body),
    sizeBytes: byteSize(body),
    summary: entry.data.description ?? excerpt(body)
  };
}

/** All published posts, newest first. Drafts appear only in `astro dev`. */
export async function getAllPosts(): Promise<Post[]> {
  const entries = await getCollection(
    "posts",
    ({ data }) => !(import.meta.env.PROD && data.draft)
  );
  return entries
    .map(toPost)
    .sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());
}

export async function getPosts(lang: Locale): Promise<Post[]> {
  const posts = await getAllPosts();
  return posts.filter((post) => post.lang === lang);
}

export async function getTranslations(
  post: Post
): Promise<Partial<Record<Locale, string>>> {
  return findTranslations(await getAllPosts(), post);
}

export async function getTagIndex(
  lang: Locale
): Promise<Map<string, TagGroup<Post>>> {
  const posts = await getPosts(lang);
  return collectTags(
    posts.map((post) => ({
      item: post,
      label: post.id,
      tags: post.data.tags
    }))
  );
}

export async function postStaticPaths(): Promise<
  { params: { lang: Locale; slug: string }; props: { post: Post } }[]
> {
  const posts = await getAllPosts();
  return posts.map((post) => ({
    params: { lang: post.lang, slug: post.slug },
    props: { post }
  }));
}
