import { type Locale, localeInfo, localeStaticPaths } from "@/i18n/locales";
import { absoluteUrl, homeUrl, postUrl } from "@/lib/navigation/routes";
import type { APIRoute } from "astro";
import { getPosts } from "@/lib/posts/collection";
import rss from "@astrojs/rss";
import { site } from "@/config/site";

export const getStaticPaths = localeStaticPaths;

export const GET: APIRoute = async ({ params }) => {
  // The static paths above only produce locale params
  const lang = params.lang as Locale;
  const posts = await getPosts(lang);
  const { htmlLang, label } = localeInfo[lang];

  return rss({
    customData: `<language>${htmlLang}</language>`,
    description: site.title,
    // Summaries only: feed readers can't run widgets and render math poorly
    items: posts.map((post) => ({
      description: post.summary,
      link: absoluteUrl(postUrl(lang, post.slug)),
      pubDate: post.data.date,
      title: post.data.title
    })),
    site: absoluteUrl(homeUrl(lang)),
    title: `${site.title} (${label})`
  });
};
