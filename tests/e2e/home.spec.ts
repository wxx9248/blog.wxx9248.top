import {
  expect,
  expectAccessible,
  expectNoHorizontalOverflow,
  isPhone,
  samplePost,
  test,
  viewports
} from "./helpers";

test.describe("home page", () => {
  test("lists posts with the stacked ls -1 layout on phones", async ({
    page
  }, testInfo) => {
    test.skip(!isPhone(testInfo), "phone layout only");
    await page.goto("/zh/");
    await expect(
      page.getByRole("link", { name: new RegExp(samplePost.title, "u") })
    ).toHaveAttribute("href", samplePost.path);
    await expect(page.getByText("ls -1t posts/")).toBeVisible();
    await expect(page.getByText("ls -lt posts/")).toBeHidden();
  });

  test("lists posts with the ls -l columns on desktops", async ({
    page
  }, testInfo) => {
    test.skip(
      testInfo.project.use.viewport?.width !== viewports.desktop.width,
      "desktop layout only"
    );
    await page.goto("/zh/");
    await expect(page.getByText("ls -lt posts/")).toBeVisible();
    await expect(page.getByText("ls -1t posts/")).toBeHidden();
    const row = page.getByRole("link", {
      name: new RegExp(samplePost.title, "u")
    });
    await expect(row).toContainText("2021-02-15");
    await expect(row).toContainText(`#Alpha #Beta #${samplePost.tag}`);
    await expect(row).toContainText(/\d+(?:\.\d)?K?\s+2021-02-15/u);
  });

  test("sets the ls -l title in the row's size, line and baseline", async ({
    page
  }, testInfo) => {
    test.skip(
      testInfo.project.use.viewport?.width !== viewports.desktop.width,
      "desktop layout only"
    );
    await page.goto("/zh/");
    const metrics = await page
      .locator(".entry")
      .first()
      .evaluate((entry) => {
        const read = (selector: string) => {
          const element = entry.querySelector(selector) as HTMLElement;
          const style = getComputedStyle(element);
          return {
            bottom: element.getBoundingClientRect().bottom,
            fontSize: style.fontSize,
            lineHeight: style.lineHeight
          };
        };
        return { date: read(".date"), title: read(".title") };
      });
    expect(metrics.title.fontSize).toBe(metrics.date.fontSize);
    expect(metrics.title.lineHeight).toBe(metrics.date.lineHeight);
    expect(
      Math.abs(metrics.title.bottom - metrics.date.bottom)
    ).toBeLessThanOrEqual(1);
  });

  test("renders an empty listing for a language without posts", async ({
    page
  }) => {
    const response = await page.goto("/en/");
    expect(response?.status()).toBe(200);
    await expect(page.getByText("total 0")).toBeVisible();
  });

  test("fits the viewport and passes axe", async ({ page }) => {
    await page.goto("/zh/");
    await expectNoHorizontalOverflow(page);
    await expectAccessible(page);
  });
});

test("shows no input prompt or cursor", async ({ page }) => {
  await page.goto("/zh/");
  // Every prompt line carries a command; an empty one reads as "type here"
  for (const command of await page.locator(".prompt .command").all()) {
    await expect(command).not.toBeEmpty();
  }
  await expect(page.locator(".cursor")).toHaveCount(0);
});
