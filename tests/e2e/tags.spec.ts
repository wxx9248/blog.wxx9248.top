import { expect, expectAccessible, samplePost, test } from "./helpers";
import { t } from "@/i18n/t";

test.describe("tag pages", () => {
  test("lists every tag with its post count", async ({ page }) => {
    await page.goto("/zh/tags/");
    for (const tag of ["Alpha", "Beta", samplePost.tag]) {
      const item = page.getByRole("listitem").filter({
        has: page.getByRole("link", { exact: true, name: `#${tag}` })
      });
      await expect(item).toContainText(t("zh", "tags.count", { count: 1 }));
    }
    await expectAccessible(page);
  });

  test("opens a CJK tag from a post", async ({ page }) => {
    await page.goto(samplePost.path);
    const [response] = await Promise.all([
      page.waitForResponse((candidate) =>
        candidate.url().includes("/zh/tags/")
      ),
      page
        .locator("article")
        .getByRole("link", { exact: true, name: `#${samplePost.tag}` })
        .click()
    ]);
    expect(response.status()).toBe(200);
    await expect(
      page.getByRole("link", { name: new RegExp(samplePost.title, "u") })
    ).toHaveAttribute("href", samplePost.path);
    await expectAccessible(page);
  });

  test("points other languages without the tag at their tag index", async ({
    page
  }) => {
    await page.goto("/zh/tags/alpha/");
    const english = page.locator("a[data-locale='en']").first();
    await expect(english).toHaveAttribute("href", "/en/tags/");
    await expect(english).toHaveClass(/unavailable/u);
  });
});
