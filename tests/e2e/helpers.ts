import {
  type Page,
  type TestInfo,
  test as base,
  expect
} from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { giscusClientUrl } from "@/lib/giscus/client";

export { expect };

/** The tests' own site: tests/fixtures/posts has this one post, in Chinese. */
export const fixturePostsDir = "tests/fixtures/posts";
export const samplePost = {
  excerpt: "这是示例文章的第一段。",
  fileName: "sample.mdx",
  path: "/zh/posts/sample/",
  tag: "示例",
  title: "示例文章"
} as const;

/**
 * Every page gets an empty Giscus script: the tests check what the site asks of
 * Giscus, so they must not depend on giscus.app. It also keeps axe to the
 * blog's own pages: it can't see the page behind Giscus's transparent frame,
 * so it reports the frame's text in the dark theme as light on white.
 */
export const test = base.extend({
  page: async ({ page }, use) => {
    await page.route(giscusClientUrl, (route) =>
      route.fulfill({ body: "", contentType: "text/javascript" })
    );
    await use(page);
  }
});

// Real device widths, deliberately independent of the CSS breakpoints
export const viewports = {
  desktop: { height: 800, width: 1280 },
  phone: { height: 780, width: 360 },
  tablet: { height: 1024, width: 768 }
} as const;

export function isPhone(testInfo: TestInfo): boolean {
  return testInfo.project.use.viewport?.width === viewports.phone.width;
}

export async function expectNoHorizontalOverflow(page: Page): Promise<void> {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth
  );
  expect(overflow, "page is wider than the viewport").toBeLessThanOrEqual(0);
}

export async function expectAccessible(page: Page): Promise<void> {
  const { violations } = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  const summary = violations.map(({ id, nodes }) => ({
    id,
    targets: nodes.map(({ target }) => target.join(" "))
  }));
  expect(summary).toEqual([]);
}
