import { expect, samplePost, test } from "./helpers";
import { giscusClientUrl, giscusOrigin } from "@/lib/giscus/client";
import { localeInfo } from "@/i18n/locales";
import { site } from "@/config/site";
import { t } from "@/i18n/t";

test("loads Giscus in the post's language and the reader's theme", async ({
  page
}, testInfo) => {
  await page.goto(samplePost.path);
  await expect(
    page.getByRole("heading", { name: t("zh", "post.comments") })
  ).toBeVisible();

  const script = page.locator(`script[src="${giscusClientUrl}"]`);
  await expect(script).toHaveAttribute("data-repo", site.giscus?.repo ?? "");
  await expect(script).toHaveAttribute("data-lang", localeInfo.zh.giscusLang);
  await expect(script).toHaveAttribute("data-mapping", "pathname");
  await expect(script).toHaveAttribute(
    "data-theme",
    new URL(`/giscus/${testInfo.project.use.colorScheme ?? ""}.css`, page.url())
      .href
  );
});

for (const theme of ["dark", "light"]) {
  test(`serves the ${theme} comment theme to Giscus`, async ({ request }) => {
    const response = await request.get(`/giscus/${theme}.css`);
    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toContain("text/css");
    // Giscus loads the file with crossorigin="anonymous"
    expect(response.headers()["access-control-allow-origin"]).toBe(
      giscusOrigin
    );
  });
}
