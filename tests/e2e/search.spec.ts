import { expect, expectAccessible, samplePost, test } from "./helpers";
import { t } from "@/i18n/t";

test.describe("search", () => {
  test("finds the Chinese post with highlighted matches", async ({ page }) => {
    await page.goto("/zh/search/");
    await page
      .getByRole("searchbox", { name: t("zh", "nav.search") })
      .fill(samplePost.tag);
    const result = page
      .locator("[data-search-results] li")
      .filter({ hasText: samplePost.title });
    await expect(result.getByRole("link")).toHaveAttribute(
      "href",
      new RegExp(`${samplePost.path}$`, "u")
    );
    await expect(result.locator("mark").first()).toBeVisible();
    await expectAccessible(page);
  });

  test("searches only the page's language", async ({ page }) => {
    await page.goto("/en/search/");
    await page
      .getByRole("searchbox", { name: t("en", "nav.search") })
      .fill(samplePost.tag);
    await expect(page.getByText(t("en", "search.noResults"))).toBeVisible();
    await expect(page.locator("[data-search-results] li")).toHaveCount(0);
  });

  test("opens with / and focuses the input", async ({ page }) => {
    await page.goto("/zh/");
    await page.keyboard.press("/");
    await expect(page).toHaveURL(/\/zh\/search\/#q$/u);
    await expect(
      page.getByRole("searchbox", { name: t("zh", "nav.search") })
    ).toBeFocused();
  });
});

test.describe("when the search index can't load", () => {
  test("tells readers search is unavailable, not how to build", async ({
    page
  }) => {
    await page.route("**/pagefind/pagefind.js", (route) => route.abort());
    const response = await page.goto("/zh/search/");
    const html = (await response?.text()) ?? "";
    expect(html).not.toContain("pnpm");
    await expect(page.getByText(t("zh", "search.unavailable"))).toBeVisible();
  });
});
