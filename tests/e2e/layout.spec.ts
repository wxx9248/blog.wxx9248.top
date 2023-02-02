import {
  expect,
  expectAccessible,
  expectNoHorizontalOverflow,
  isPhone,
  test
} from "./helpers";
import { localeInfo, locales } from "@/i18n/locales";
import { t } from "@/i18n/t";

const missingPath = "/does-not-exist/";

test.describe("404 page", () => {
  test("responds with status 404", async ({ page }) => {
    const response = await page.goto(missingPath);
    expect(response?.status()).toBe(404);
  });

  test("fits the viewport and passes axe", async ({ page }) => {
    await page.goto(missingPath);
    await expectNoHorizontalOverflow(page);
    await expectAccessible(page);
  });

  test("shows the requested path in the prompt", async ({ page }) => {
    await page.goto(missingPath);
    await expect(page.getByText(missingPath).first()).toBeVisible();
    await expect(page.getByText(t("en", "notFound.message"))).toBeVisible();
  });
});

test.describe("status bar", () => {
  test("has four large buttons on phones", async ({ page }, testInfo) => {
    test.skip(!isPhone(testInfo), "phone layout only");
    await page.goto(missingPath);
    const controls = [
      page.getByRole("button", { name: t("en", "nav.menu") }),
      page.getByRole("link", { name: t("en", "nav.search") }),
      page.getByRole("button", { name: t("en", "nav.language") }),
      page.getByRole("button", { name: t("en", "theme.toggle") })
    ];
    for (const control of controls) {
      await expect(control).toBeVisible();
      const box = await control.boundingBox();
      expect(box?.width).toBeGreaterThanOrEqual(44);
      expect(box?.height).toBeGreaterThanOrEqual(44);
    }
  });

  test("opens and closes the menu on phones", async ({ page }, testInfo) => {
    test.skip(!isPhone(testInfo), "phone layout only");
    await page.goto(missingPath);
    await page.getByRole("button", { name: t("en", "nav.menu") }).click();
    const menu = page.locator("#site-menu");
    await expect(menu).toBeVisible();
    for (const locale of locales) {
      await expect(
        menu.getByRole("link", { name: localeInfo[locale].label })
      ).toBeVisible();
    }
    await page.keyboard.press("Escape");
    await expect(menu).toBeHidden();
  });

  test("toggles the theme and remembers it", async ({ page }) => {
    await page.goto(missingPath);
    const html = page.locator("html");
    const before = await html.getAttribute("data-theme");
    await page.getByRole("button", { name: t("en", "theme.toggle") }).click();
    const after = await html.getAttribute("data-theme");
    expect(after).not.toBe(before);
    await page.reload();
    await expect(html).toHaveAttribute("data-theme", after ?? "");
  });
});

test.describe("without JavaScript", () => {
  test.use({ javaScriptEnabled: false });

  /*
   * Axe needs JavaScript. The JS-enabled runs audit the same CSS state,
   * because data-theme stays unset until a reader picks a theme.
   */
  test("still renders a themed, readable page", async ({ page }) => {
    await page.goto(missingPath);
    const colors = await page.locator("body").evaluate((body) => {
      const style = getComputedStyle(body);
      return { background: style.backgroundColor, text: style.color };
    });
    expect(colors.background).not.toBe("rgba(0, 0, 0, 0)");
    expect(colors.text).not.toBe(colors.background);
  });

  test("opens the phone menu", async ({ page }, testInfo) => {
    test.skip(!isPhone(testInfo), "phone layout only");
    await page.goto(missingPath);
    await page.getByRole("button", { name: t("en", "nav.menu") }).click();
    await expect(page.locator("#site-menu")).toBeVisible();
  });
});

test.describe("translated status bar links", () => {
  const expected = [
    { lang: "zh", posts: "文章", tags: "标签" },
    { lang: "ja", posts: "記事", tags: "タグ" }
  ];

  for (const { lang, posts, tags } of expected) {
    test(`labels posts and tags in ${lang}`, async ({ page }, testInfo) => {
      test.skip(isPhone(testInfo), "the phone bar shows icons only");
      await page.goto(`/${lang}/`);
      const bar = page.locator(".status-bar");
      await expect(
        bar.getByRole("link", { exact: true, name: posts })
      ).toHaveAttribute("href", `/${lang}/`);
      await expect(
        bar.getByRole("link", { exact: true, name: tags })
      ).toHaveAttribute("href", `/${lang}/tags/`);
    });
  }
});

test("aligns the status bar language codes", async ({ page }, testInfo) => {
  test.skip(isPhone(testInfo), "the phone bar shows one language button");
  await page.goto("/en/");
  const boxes = await page
    .locator(".status-bar a[data-locale]")
    .evaluateAll((links) =>
      links.map((link) => {
        const { bottom, top } = link.getBoundingClientRect();
        return {
          bottom,
          lineHeight: getComputedStyle(link).lineHeight,
          top
        };
      })
    );
  expect(boxes).toHaveLength(locales.length);
  const [first] = boxes;
  for (const box of boxes) {
    expect(box.lineHeight).toBe(first?.lineHeight);
    expect(Math.abs(box.top - (first?.top ?? 0))).toBeLessThanOrEqual(1);
    expect(Math.abs(box.bottom - (first?.bottom ?? 0))).toBeLessThanOrEqual(1);
  }
});

test("loosens line height on Chinese and Japanese pages only", async ({
  page
}) => {
  const ratio = async (path: string): Promise<number> => {
    await page.goto(path);
    return page.locator("body").evaluate((body) => {
      const style = getComputedStyle(body);
      return parseFloat(style.lineHeight) / parseFloat(style.fontSize);
    });
  };
  expect(await ratio("/en/")).toBeCloseTo(1.7, 2);
  expect(await ratio("/zh/")).toBeCloseTo(1.85, 2);
  expect(await ratio("/ja/")).toBeCloseTo(1.85, 2);
});

test("reaches every site destination at every width", async ({
  page
}, testInfo) => {
  await page.goto("/zh/");
  if (isPhone(testInfo)) {
    await page.getByRole("button", { name: t("zh", "nav.menu") }).click();
  }
  const reachable = await page
    .locator(".status-bar a:visible, #site-menu a:visible")
    .evaluateAll((links) =>
      links.map((link) => new URL((link as HTMLAnchorElement).href).pathname)
    );
  for (const destination of [
    "/zh/",
    "/zh/tags/",
    "/zh/rss.xml",
    "/zh/search/",
    "/en/",
    "/ja/"
  ]) {
    expect(reachable, destination).toContain(destination);
  }
  await expect(
    page.getByRole("button", { name: t("zh", "theme.toggle") })
  ).toBeVisible();
});
