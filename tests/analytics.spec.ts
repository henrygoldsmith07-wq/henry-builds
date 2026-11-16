import { expect, test } from "@playwright/test";

/**
 * Behaviour coverage for the two journeys that the proof-first cleanup fixed:
 * every analytics tab must render, and the contact form must not claim to have
 * delivered a message when no endpoint is configured.
 */

const analyticsTabs = [
  "Overview",
  "Resume Matcher",
  "Skills Heatmap",
  "Complexity Matrix",
  "Evidence Timeline",
  "Capability Growth",
  "Challenge Simulator",
  "Risk signals",
  "Evidence review",
];

test("every analytics tab renders without a page error", async ({ page }) => {
  // Nine tabs on a page with heavy decorative animation can exceed the
  // default 30s on a busy runner; the behaviour, not the clock, is the point.
  test.setTimeout(90_000);
  const pageErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));

  await page.goto("/analytics");
  await expect(
    page.getByRole("navigation", { name: "Analytics sections" }),
  ).toBeVisible();

  for (const label of analyticsTabs) {
    await page.getByRole("button", { name: label }).click();
    await expect(page.getByText("This page could not render.")).toHaveCount(0);
    await expect(page.locator("main#main")).not.toBeEmpty();
  }

  expect(pageErrors).toEqual([]);
});

test("contact form reports an unconfigured endpoint instead of claiming success", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: /Smart contact options/i }).click();

  // The selectors are plain buttons with nested copy; filter by text so the
  // test does not depend on how their accessible name is computed.
  await page.locator("button").filter({ hasText: "Forq" }).first().click();
  await page.locator("button").filter({ hasText: "Backend Systems" }).click();
  await page
    .locator("#message")
    .fill("I would like to discuss a project with measurable evidence and limits.");
  await page
    .getByLabel(/I agree to receive a response via email/i)
    .check();
  await page.getByRole("button", { name: "Send inquiry" }).click();

  await expect(page.getByRole("alert")).toContainText(
    "Direct contact is not configured",
  );
  await expect(page.getByText("Message sent")).toHaveCount(0);
});
