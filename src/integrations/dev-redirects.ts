import type { AstroIntegration } from "astro";
import { findRedirect } from "@/lib/navigation/redirects";
import { join } from "node:path";
import { readFile } from "node:fs/promises";

/** Follows public/_redirects in `astro dev`, which only Cloudflare reads. */
export function devRedirects(): AstroIntegration {
  return {
    hooks: {
      "astro:server:setup": ({ server }) => {
        const file = join(server.config.publicDir, "_redirects");
        server.middlewares.use((request, response, next) => {
          const { pathname } = new URL(request.url ?? "/", "http://localhost");
          readFile(file, "utf8")
            .then((rules) => {
              const redirect = findRedirect(rules, pathname);
              if (redirect) {
                response.writeHead(redirect.status, {
                  Location: redirect.location
                });
                response.end();
              } else {
                next();
              }
            })
            .catch(next);
        });
      }
    },
    name: "dev-redirects"
  };
}
