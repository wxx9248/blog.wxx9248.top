import { type Theme, themes } from "@/scripts/theme";
import type { APIRoute } from "astro";
import { giscusOrigin } from "@/lib/giscus/client";
import { giscusThemeCss } from "@/lib/giscus/theme";

export function getStaticPaths(): { params: { theme: Theme } }[] {
  return themes.map((theme) => ({ params: { theme } }));
}

export const GET: APIRoute = ({ params }) =>
  // The static paths above only produce theme params
  new Response(giscusThemeCss(params.theme as Theme), {
    headers: {
      // For `astro dev`; public/_headers does this for the built site
      "Access-Control-Allow-Origin": giscusOrigin,
      "Content-Type": "text/css; charset=utf-8"
    }
  });
