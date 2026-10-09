import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
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

test("cross-page hash links reach lazy-loaded landing sections", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name === "mobile", "Desktop header exposes the main navigation directly");

  await page.goto("/projects");
  await page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: "About" }).click();

  await expect(page).toHaveURL(/\/#about$/);
  await expect(page.locator("#about")).toBeVisible();
  await expect
    .poll(() =>
      page.locator("#about").evaluate((element) => {
        const rect = element.getBoundingClientRect();
        const header = document.querySelector<HTMLElement>(".site-nav");
        const headerBottom = header?.getBoundingClientRect().bottom ?? 0;
        return rect.top >= headerBottom && rect.top < window.innerHeight;
      }),
    )
    .toBe(true);
});

test("fragment navigation respects reduced-motion preference", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name === "mobile", "Desktop header exposes the main navigation directly");

  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/projects");
  await page.evaluate(() => {
    const original = Element.prototype.scrollIntoView;
    Element.prototype.scrollIntoView = function (options?: boolean | ScrollIntoViewOptions) {
      (window as typeof window & { __fragmentScrollBehavior?: ScrollBehavior }).__fragmentScrollBehavior =
        typeof options === "object" ? options.behavior : undefined;
      return original.call(this, options);
    };
  });

  await page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: "About" }).click();
  await expect(page.locator("#about")).toBeVisible();
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (window as typeof window & { __fragmentScrollBehavior?: ScrollBehavior })
            .__fragmentScrollBehavior,
      ),
    )
    .toBe("auto");
});

test("missing routes tell crawlers not to index them", async ({ page }) => {
  await page.goto("/__missing-page-for-test__");
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
    "content",
    "noindex, nofollow",
  );
});

test("crawler-visible .html URLs still resolve to their real route", async ({
  page,
}) => {
  // The build emits /projects.html and /projects/<slug>.html. A static host
  // (or Lighthouse CI's server) hands the browser that URL verbatim, and the
  // router used to fall through to NotFound — which then marked the portfolio's
  // own case studies noindex and failed the Lighthouse SEO budget.
  await page.goto("/projects.html");
  await expect(page.getByRole("heading", { name: "Revise" })).toBeVisible();
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
    "content",
    "index, follow",
  );
  // The clean path is what the visitor is left on, matching cleanUrls.
  await expect(page).toHaveURL(/\/projects$/);

  await page.goto("/projects/revise.html");
  await expect(page.locator("main h1")).toBeVisible();
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
    "content",
    "index, follow",
  );
  await expect(page).toHaveURL(/\/projects\/revise$/);
});

test("the generated 404 page stays noindex after the .html rewrite", async ({
  page,
}) => {
  // /404.html normalises to /404, which must still land on NotFound rather than
  // becoming indexable.
  await page.goto("/404.html");
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

/**
 * The JSON-LD a crawler-without-JavaScript reads must describe the same page as
 * the JSON-LD the hydrated app leaves behind.
 *
 * `generate-route-html.mjs` writes a CollectionPage per list route; SiteMetadata
 * used to overwrite it with the generic Person/WebSite graph on mount, so the
 * two classes of crawler disagreed about what `/projects` is. The builders are
 * now shared (structured-data.mjs), and this test is what keeps that true:
 * without it, the next person to touch either side has nothing telling them the
 * outputs must match.
 *
 * Origins are normalised because the static HTML is generated with the
 * production origin while a local preview serves it from localhost. Everything
 * else — graph type, wording, item order, per-project URLs' paths — must be
 * exactly equal. Production origin agreement is governed by SITE_URL being set
 * at build time, which `check-registry-freshness` and the sitemap already
 * depend on.
 *
 * The synthetic 404 route is skipped: `allRoutes` includes it so the
 * accessibility suite covers the error page, but it has no generated
 * counterpart to compare against — its own test asserts the noindex tag.
 */
test("the hydrated page's structured data agrees with the crawler-visible HTML", async ({
  page,
}) => {
  const staticScriptPattern =
    /<script\b[^>]*id=["']portfolio-structured-data["'][^>]*>([\s\S]*?)<\/script>/i;

  const staticPathFor = (routePath: string) =>
    routePath === "/" ? "index.html" : `${routePath.replace(/^\//, "")}.html`;

  const readStatic = (routePath: string) => {
    const relative = staticPathFor(routePath);
    const file = path.join(process.cwd(), "dist", relative);
    const html = fs.readFileSync(file, "utf8");
    const match = html.match(staticScriptPattern);
    if (!match) throw new Error(`${relative} has no portfolio-structured-data script`);
    return JSON.parse(match[1]) as Record<string, unknown>;
  };

  const originOf = (graph: Record<string, unknown>): string => {
    const url =
      (graph.url as string | undefined) ??
      ((graph["@graph"] as Array<{ url?: string }> | undefined)?.find(
        (node) => typeof node.url === "string",
      )?.url);
    if (!url) throw new Error("graph carries no URL to read an origin from");
    return new URL(url).origin;
  };

  // Replaces every occurrence of a graph's own origin so two graphs that agree
  // on everything but where they were served from still compare equal.
  const normalize = (graph: Record<string, unknown>) => {
    const origin = originOf(graph);
    return JSON.parse(
      JSON.stringify(graph).split(origin).join("ORIGIN"),
    ) as Record<string, unknown>;
  };

  for (const route of allRoutes) {
    // Routes without generated HTML (the synthetic 404) have no static side.
    if (!fs.existsSync(path.join(process.cwd(), "dist", staticPathFor(route.path)))) {
      continue;
    }

    const staticGraph = normalize(readStatic(route.path));

    await page.goto(route.path);
    await page.waitForLoadState("networkidle");
    const runtimeText = await page.evaluate(
      () =>
        document.getElementById("portfolio-structured-data")?.textContent ?? "",
    );
    expect(runtimeText, `${route.path} hydrated without structured data`).toBeTruthy();

    const runtimeGraph = normalize(JSON.parse(runtimeText));
    expect(runtimeGraph, `${route.path}: hydrated JSON-LD differs from the static HTML`).toEqual(
      staticGraph,
    );
  }
});
