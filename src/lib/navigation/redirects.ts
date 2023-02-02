export interface Redirect {
  location: string;
  status: number;
}

const defaultStatus = 302;

/**
 * Applies the text of a _redirects file to a path as Cloudflare would: the
 * first matching rule wins, and a trailing * fills in :splat. Placeholders
 * aren't supported, as no rule here needs them.
 */
export function findRedirect(rules: string, path: string): Redirect | null {
  for (const line of rules.split("\n")) {
    const [from, to, status] = line.trim().split(/\s+/u);
    if (from && to && !from.startsWith("#")) {
      const prefix = from.replace(/\*$/u, "");
      const matches = prefix === from ? path === from : path.startsWith(prefix);
      if (matches) {
        return {
          location: to.replace(":splat", () => path.slice(prefix.length)),
          status: status ? Number(status) : defaultStatus
        };
      }
    }
  }
  return null;
}
