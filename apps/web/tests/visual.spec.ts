import { argosScreenshot } from "@argos-ci/playwright";
import { test } from "@playwright/test";

test.describe("Visual regression tests", () => {
  test("homepage", async ({ page }) => {
    await page.goto("/");
    await argosScreenshot(page, "homepage");
  });

  test("download page", async ({ page }) => {
    await page.goto("/download");
    await argosScreenshot(page, "download-page");
  });

  test("file transcription page", async ({ page }) => {
    await page.goto("/file-transcription");
    await argosScreenshot(page, "file-transcription-page");
  });
});
