import { expect, test } from "@playwright/test";
import { representativeCaseStudy, visualRoutes } from "./routes";

/**
 * Visual regression over the core pages in both colour schemes.
 *
 * Animation is disabled and the theme is set before first paint, so a diff
 * means the layout or styling actually changed rather than a motion frame
 * landing differently.
 */

/**
 * The landing and projects pages render day-relative copy ("captured 12d ago",
 * verified-age stems) computed from `new Date()`. With a real clock, the same
 * unchanged layout renders slightly wider lines on a later day, wraps
 * differently, and drifts out of tolerance — which is why this suite's history
 * is a chain of "refresh visual baselines" commits that never stayed green for
 * long.
 *
 * Freezing `Date` inside the page makes the copy a pure function of the
 * registry data: a diff now means the registry, the layout or the styling
 * changed — never that time passed. The stub subclasses `Date` so `parse`,
 * `UTC`, prototype methods and `instanceof` all keep working; only the
 * current-instant constructors (`new Date()` and `Date.now()`) are pinned.
 * Production renders are untouched — this runs in the test page only.
 */
const SNAPSHOT_NOW = "2026-01-15T12:00:00Z";

// Passed as a string so the browser-side freeze is not type-checked: `Date` in
// the page is a runtime global, and typing the subclass fight buys nothing.
const FREEZE_CLOCK_SCRIPT = `(() => {
  const fixed = new Date(${JSON.stringify(SNAPSHOT_NOW)}).valueOf();
  const RealDate = globalThis.Date;
  class FrozenDate extends RealDate {
    constructor(...args) {
      if (args.length === 0) super(fixed);
      else super(...args);
    }
    static now() { return fixed; }
  }
  Object.defineProperty(globalThis, "Date", {
    value: FrozenDate, writable: true, configurable: true,
  });
})();`;

async function freezeClock(page: import("@playwright/test").Page) {
  await page.addInitScript(FREEZE_CLOCK_SCRIPT);
}

for (const route of visualRoutes) {
  for (const theme of ["light", "dark"] as const) {
    test(`${route.name} looks unchanged (${theme})`, async ({ page }, testInfo) => {
      await page.addInitScript((mode) => {
        window.localStorage.setItem("henry-theme", mode);
      }, theme);
      await page.emulateMedia({ colorScheme: theme, reducedMotion: "reduce" });
      await freezeClock(page);

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

test("a case study renders its key layout surfaces", async ({ page }) => {
  await page.goto(representativeCaseStudy.path);
  await page.waitForLoadState("networkidle");

  await expect(page.locator("main h1")).toBeVisible();
  await expect(page.locator(".verification-row")).toBeVisible();
  expect(await page.locator(".case-section").count()).toBeGreaterThanOrEqual(4);
  await expect(
    page.getByRole("navigation", { name: "More projects" }),
  ).toBeVisible();
});

test("the stage badge renders its label and meaning", async ({ page }) => {
  await page.goto("/projects");
  const legend = page.getByRole("term").first();
  await expect(legend).toBeVisible();
  await expect(page.locator(".stage-badge").first()).toBeVisible();
});
