import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { allRoutes, projectSlugs } from "./routes";

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
    test(`${route.name} has no serious accessibility violations (${theme})`, async ({
      page,
    }) => {
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

      const blocking = results.violations.filter((violation) =>
        BLOCKING.has(violation.impact ?? ""),
      );
      const advisory = results.violations.filter(
        (violation) => !BLOCKING.has(violation.impact ?? ""),
      );

      if (advisory.length) {
        console.log(
          `${route.path} (${theme}) — ${advisory.length} advisory: ` +
            advisory.map((v) => `${v.id}[${v.impact}]`).join(", "),
        );
      }

      expect(
        blocking,
        blocking
          .map(
            (v) =>
              `${v.id} (${v.impact}): ${v.help}\n  ${v.nodes[0]?.target.join(" ")}`,
          )
          .join("\n"),
      ).toEqual([]);
    });
  }
}

test("every page has exactly one h1 and a main landmark", async ({ page }) => {
  for (const route of allRoutes) {
    await page.goto(route.path);
    await expect(
      page.locator("h1"),
      `${route.path} should have exactly one h1`,
    ).toHaveCount(1);
    await expect(
      page.locator("main"),
      `${route.path} should have a main landmark`,
    ).toHaveCount(1);
  }
});

test("the skip link is reachable by keyboard and moves focus", async ({
  page,
}) => {
  await page.goto("/");
  const skipLink = page.locator(".skip-link");
  await expect(skipLink).toBeAttached();
  await page.keyboard.press("Tab");
  await expect(skipLink).toBeFocused();
  await expect(skipLink).toBeVisible();
});

test("project discovery filters are shareable and reset cleanly", async ({
  page,
}) => {
  await page.goto("/projects?q=revise");

  await expect(
    page.getByRole("searchbox", { name: "Search projects" }),
  ).toHaveValue("revise");
  await expect(page.getByRole("status")).toContainText("Showing 1 of");
  await expect(page.getByRole("heading", { name: "Revise" })).toBeVisible();

  await page.getByRole("button", { name: /^beta \(/i }).click();
  await expect(page).toHaveURL(/q=revise/);
  await expect(page).toHaveURL(/stage=beta/);

  await page.getByRole("button", { name: "Clear filters" }).click();
  await expect(page).toHaveURL(/\/projects$/);
  await expect(page.getByRole("status")).toContainText(
    `Showing ${projectSlugs.length} of ${projectSlugs.length} projects`,
  );
});

test("missing routes tell crawlers not to index them", async ({ page }) => {
  await page.goto("/__missing-page-for-test__");
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
    "content",
    "noindex, nofollow",
  );
});


test("saved theme preference is applied on navigation", async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem("henry-theme", "dark");
  });
  await page.goto("/");
  await expect(page.locator("html")).toHaveClass(/dark/);
});

test("mobile menu closes with Escape and returns focus", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile", "Mobile navigation only renders below md");

  await page.goto("/");
  const trigger = page.getByRole("button", { name: "Open menu" });
  await trigger.click();

  await expect(page.getByRole("navigation", { name: "Mobile" })).toBeVisible();
  await page.keyboard.press("Escape");

  await expect(page.getByRole("navigation", { name: "Mobile" })).toHaveCount(0);
  await expect(trigger).toBeFocused();
});
