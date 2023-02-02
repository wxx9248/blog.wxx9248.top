import type { AstroIntegration } from "astro";
import { site } from "@/config/site";

/** Warns at build time while comments are switched off. */
export function giscusConfigCheck(): AstroIntegration {
  return {
    hooks: {
      "astro:build:start": ({ logger }) => {
        if (!site.giscus) {
          logger.warn(
            "Comments are hidden: fill in site.giscus in src/config/site.ts (see README)"
          );
        }
      }
    },
    name: "giscus-config-check"
  };
}
