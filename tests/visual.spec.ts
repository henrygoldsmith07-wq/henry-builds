import { expect, test } from "@playwright/test";
import { visualRoutes } from "./routes";

/**
 * Visual regression over the core pages in both colour schemes.
 *
 * Animation is disabled and the theme is set before first paint, so a diff
 * means the layout or styling actually changed rather than a motion frame
 * landing differently.
 */
for (const route of visualRoutes) {
  for (const theme of ["light", "dark"] as const) {
    test(`${route.name} looks unchanged (${theme})`, async ({ page }, testInfo) => {
      await page.addInitScript((mode) => {
        window.localStorage.setItem("henry-theme", mode);
      }, theme);
      await page.emulateMedia({ colorScheme: theme, reducedMotion: "reduce" });

      await page.goto(route.path);
      await page.waitForLoadState("networkidle");

      // Fonts settle after load; without this the first snapshot bakes in a
      // fallback face and every later run diffs against it.
      await page.evaluate(() => document.fonts.ready);

      await expect(page).toHaveScreenshot(`${route.name}-${theme}-${testInfo.project.name}.png`, {
        fullPage: true,
      });
    });
  }
}

test("the stage badge renders its label and meaning", async ({ page }) => {
  await page.goto("/projects");
  const legend = page.getByRole("term").first();
  await expect(legend).toBeVisible();
  await expect(page.locator(".stage-badge").first()).toBeVisible();
});
