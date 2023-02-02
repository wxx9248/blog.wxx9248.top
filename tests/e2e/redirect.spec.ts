import { expect, isPhone, test } from "./helpers";
import { locales } from "@/i18n/locales";
import { t } from "@/i18n/t";

test.describe("root redirect", () => {
  test.describe("with a Japanese browser", () => {
    test.use({ locale: "ja-JP" });

    test("goes to the browser's language", async ({ page }) => {
      await page.goto("/");
      await expect(page).toHaveURL(/\/ja\/$/u);
    });

    test("prefers the remembered choice", async ({
      baseURL,
      context,
      page
    }) => {
      await context.addCookies([
        { name: "lang", url: baseURL ?? "", value: "zh" }
      ]);
      await page.goto("/");
      await expect(page).toHaveURL(/\/zh\/$/u);
    });

    test("leaves no history entry for /", async ({ baseURL, page }) => {
      await page.goto("/");
      await expect(page).toHaveURL(/\/ja\/$/u);
      await page.goBack();
      // With location.replace, only the starting blank page is left behind
      expect(page.url()).toBe("about:blank");
      expect(baseURL).toBeTruthy();
    });
  });

  test("redirects before stylesheets and scripts load", async ({ browser }) => {
    const context = await browser.newContext({ locale: "ja-JP" });
    const page = await context.newPage();
    await page.route("**/_astro/**", async (route) => {
      await new Promise((resolve) => {
        setTimeout(resolve, 5000);
      });
      await route.continue();
    });
    await page.goto("/", { waitUntil: "commit" });
    await expect(page).toHaveURL(/\/ja\/$/u, { timeout: 2000 });
    await context.close();
  });

  test.describe("without JavaScript", () => {
    test.use({ javaScriptEnabled: false });

    test("falls back to English", async ({ page }) => {
      await page.goto("/");
      await expect(page).toHaveURL(/\/en\/$/u);
    });
  });

  test("remembers a language picked in the menu", async ({
    page
  }, testInfo) => {
    await page.goto("/zh/");
    if (isPhone(testInfo)) {
      await page.getByRole("button", { name: t("zh", "nav.menu") }).click();
    }
    await page.locator("a[data-locale='ja']:visible").first().click();
    await expect(page).toHaveURL(/\/ja\/$/u);
    await page.goto("/");
    await expect(page).toHaveURL(/\/ja\/$/u);
  });

  test("is a static page linking every language", async ({ request }) => {
    const response = await request.get("/", { maxRedirects: 0 });
    expect(response.status()).toBe(200);
    const html = await response.text();
    for (const locale of locales) {
      expect(html).toContain(`href="/${locale}/"`);
    }
    expect(
      html.match(/hreflang="(?:en|zh-CN|ja)"/gu)?.length
    ).toBeGreaterThanOrEqual(locales.length);
  });
});
