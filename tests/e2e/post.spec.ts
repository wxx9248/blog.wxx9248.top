import {
  expect,
  expectAccessible,
  expectNoHorizontalOverflow,
  fixturePostsDir,
  isPhone,
  samplePost,
  test
} from "./helpers";
import { editUrl } from "@/lib/navigation/routes";
import { t } from "@/i18n/t";

test.describe("post page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(samplePost.path);
  });

  test("renders every formula with KaTeX", async ({ page }) => {
    const article = page.locator("article");
    await expect(article.locator(".katex")).toHaveCount(2);
    const strayDollars = await article.evaluate((element) => {
      const copy = element.cloneNode(true) as HTMLElement;
      for (const skipped of copy.querySelectorAll(
        "pre, code, script, style, .katex"
      )) {
        skipped.remove();
      }
      return copy.textContent?.includes("$") ?? false;
    });
    expect(strayDollars).toBe(false);
  });

  test("links every section heading to itself", async ({ page }) => {
    const headings = page.locator("article h2");
    expect(await headings.count()).toBeGreaterThan(0);
    for (const heading of await headings.all()) {
      const id = await heading.getAttribute("id");
      const link = heading.locator("a");
      await expect(link).toHaveAttribute("href", `#${id}`);
      await expect(link).toHaveText(/^## /u);
    }
  });

  test("frames code blocks with a copy button", async ({ page }) => {
    const frame = page.locator("article .expressive-code").first();
    await expect(frame).toBeVisible();
    await expect(frame.locator(".copy button")).toHaveCount(1);
  });

  test("runs the modulo widget", async ({ page }) => {
    const demo = page.locator("[data-demo]");
    await demo.scrollIntoViewIfNeeded();
    await expect(demo.locator("astro-island")).not.toHaveAttribute("ssr");
    await demo.getByRole("spinbutton").nth(0).fill("-8");
    await demo.getByRole("spinbutton").nth(1).fill("7");
    await expect(demo.locator("[data-result='truncated']")).toHaveText("-1");
    await expect(demo.locator("[data-result='floored']")).toHaveText("6");
  });

  test("links to editing, the listing and nothing else", async ({ page }) => {
    await expect(
      page.getByRole("link", { name: `vim ${samplePost.fileName}` })
    ).toHaveAttribute(
      "href",
      editUrl(`${fixturePostsDir}/zh/${samplePost.fileName}`)
    );
    await expect(
      page.getByRole("link", { exact: true, name: t("zh", "post.back") })
    ).toHaveAttribute("href", "/zh/");
    await expect(page.getByText(t("zh", "post.also"))).toHaveCount(0);
  });

  test("scrolls display math inside its own box", async ({
    page
  }, testInfo) => {
    test.skip(!isPhone(testInfo), "phone layout only");
    const overflowX = await page
      .locator(".katex-display")
      .first()
      .evaluate((element) => getComputedStyle(element).overflowX);
    expect(overflowX).toBe("auto");
    await expectNoHorizontalOverflow(page);
  });

  test("passes axe", async ({ page }) => {
    await expectAccessible(page);
  });
});
