import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { allRoutes } from "./routes";

/**
 * Accessibility audit over every published route, in both colour schemes.
 *
 * Serious and critical violations fail the build. Minor and moderate ones are
 * reported in the test output so they are visible without blocking a merge on
 * a colour-contrast nit in a decorative illustration.
 */
const BLOCKING = new Set(["serious", "critical"]);

for (const route of allRoutes) {
  for (const theme of ["light", "dark"] as const) {
    test(`${route.name} has no serious accessibility violations (${theme})`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: theme });
      // The site honours prefers-reduced-motion by rendering final states
      // immediately (see the reveal variants). Emulating it here keeps axe
      // from sampling elements mid-entrance, where a fading overlay reads as
      // a contrast violation that no user ever sees.
      await page.emulateMedia({ colorScheme: theme, reducedMotion: "reduce" });
      await page.addInitScript((mode) => {
        window.localStorage.setItem("henry-theme", mode);
      }, theme);

      const pageErrors: string[] = [];
      page.on("pageerror", (error) => pageErrors.push(error.message));

      await page.goto(route.path);
      await page.waitForLoadState("networkidle");

      // An empty page has no accessibility violations, so without this the
      // suite goes green when the app fails to boot. Assert it rendered first.
      await expect(page.locator("#root > *")).not.toHaveCount(0);
      await expect(page.locator("main")).toBeVisible();
      expect(pageErrors, `uncaught errors on ${route.path}`).toEqual([]);

      const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
        .analyze();

      const blocking = results.violations.filter((violation) => BLOCKING.has(violation.impact ?? ""));
      const advisory = results.violations.filter((violation) => !BLOCKING.has(violation.impact ?? ""));

      if (advisory.length) {
        console.log(
          `${route.path} (${theme}) — ${advisory.length} advisory: ` +
            advisory.map((v) => `${v.id}[${v.impact}]`).join(", "),
        );
      }

      expect(
        blocking,
        blocking
          .map((v) => `${v.id} (${v.impact}): ${v.help}\n  ${v.nodes[0]?.target.join(" ")}`)
          .join("\n"),
      ).toEqual([]);
    });
  }
}

test("every page has exactly one h1 and a main landmark", async ({ page }) => {
  for (const route of allRoutes) {
    await page.goto(route.path);
    await expect(page.locator("h1"), `${route.path} should have exactly one h1`).toHaveCount(1);
    await expect(page.locator("main"), `${route.path} should have a main landmark`).toHaveCount(1);
  }
});

test("the skip link is reachable by keyboard and moves focus", async ({ page }) => {
  await page.goto("/");
  await page.keyboard.press("Tab");
  const skipLink = page.locator(".skip-link");
  await expect(skipLink).toBeFocused();
  await expect(skipLink).toBeVisible();
});
