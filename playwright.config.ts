import { fixturePostsDir, viewports } from "./tests/e2e/helpers";
import { defineConfig } from "@playwright/test";

const port = 4322;
const baseURL = `http://localhost:${port}`;
const outDir = "dist-test";
const colorSchemes = ["light", "dark"] as const;

export default defineConfig({
  forbidOnly: Boolean(process.env.CI),
  projects: Object.entries(viewports).flatMap(([name, viewport]) =>
    colorSchemes.map((colorScheme) => ({
      name: `${name}-${colorScheme}`,
      use: { colorScheme, viewport }
    }))
  ),
  reporter: [["list"], ["html", { open: "never" }]],
  testDir: "tests/e2e",
  use: { baseURL },
  webServer: {
    command: [
      `POSTS_DIR=${fixturePostsDir} pnpm exec astro build --outDir ${outDir}`,
      `pnpm exec pagefind --site ${outDir}`,
      // Points .astro/ back at the real posts, for any running dev server
      "pnpm exec astro sync",
      `pnpm preview --port ${port} --assets ${outDir}`
    ].join(" && "),
    env: { WRANGLER_SEND_METRICS: "false" },
    port,
    reuseExistingServer: !process.env.CI
  }
});
