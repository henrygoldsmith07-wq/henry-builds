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
  "Case-study shape",
  "Evidence Timeline",
  "Capability Coverage",
  "Challenge Simulator",
  "Risk signals",
  "Evidence review",
];

test("every analytics tab renders without a page error", async ({ page }) => {
  // Nine tabs, each with a lazily loaded chunk, can exceed the default 30s.
  test.setTimeout(120_000);
  const pageErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));

  await page.goto("/analytics");
  await expect(page.getByRole("tablist", { name: "Analytics sections" })).toBeVisible();

  for (const label of analyticsTabs) {
    const tab = page.getByRole("tab", { name: label });
    await tab.click();
    await expect(tab).toHaveAttribute("aria-selected", "true");
    await expect(page.getByRole("tabpanel")).toHaveAttribute(
      "aria-labelledby",
      await tab.getAttribute("id"),
    );
    await expect(page.getByText("This page could not render.")).toHaveCount(0);
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

test("contact form gates Send inquiry on explicit email consent", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /Smart contact options/i }).click();

  // Fill everything the form requires except the consent checkbox. The submit
  // button must stay disabled: a filled form is not permission to email someone.
  await page.locator("button").filter({ hasText: "Forq" }).first().click();
  await page.locator("button").filter({ hasText: "Backend Systems" }).click();
  await page
    .locator("#message")
    .fill("I would like to discuss a project with measurable evidence and limits.");

  const send = page.getByRole("button", { name: "Send inquiry" });
  await expect(send).toBeDisabled();

  const consent = page.getByLabel(/I agree to receive a response via email/i);
  await consent.check();
  await expect(send).toBeEnabled();

  // Withdrawing consent must immediately revoke the ability to submit.
  await consent.uncheck();
  await expect(send).toBeDisabled();
});

test("analytics tabs support arrow, Home and End keys with a roving tabindex", async ({
  page,
}) => {
  await page.goto("/analytics");

  const tab = (name: string) => page.getByRole("tab", { name });
  const overview = tab("Overview");
  const resume = tab("Resume Matcher");
  const review = tab("Evidence review");
  const risk = tab("Risk signals");

  await overview.focus();
  await expect(overview).toBeFocused();

  await page.keyboard.press("ArrowRight");
  await expect(resume).toHaveAttribute("aria-selected", "true");
  await expect(resume).toBeFocused();

  await page.keyboard.press("End");
  await expect(review).toHaveAttribute("aria-selected", "true");
  await expect(review).toBeFocused();

  await page.keyboard.press("Home");
  await expect(overview).toHaveAttribute("aria-selected", "true");
  await expect(overview).toBeFocused();

  // From the first tab, ArrowLeft wraps to the last rather than doing nothing.
  await page.keyboard.press("ArrowLeft");
  await expect(review).toHaveAttribute("aria-selected", "true");
  await expect(review).toBeFocused();

  // Only the selected tab is in the tab order; the rest are reachable by arrow.
  await expect(review).toHaveAttribute("tabindex", "0");
  await expect(overview).toHaveAttribute("tabindex", "-1");
  await expect(resume).toHaveAttribute("tabindex", "-1");
  await expect(risk).toHaveAttribute("tabindex", "-1");
});

test("analytics tab selection stays in sync with the URL hash", async ({ page }) => {
  await page.goto("/analytics#risk");
  const risk = page.getByRole("tab", { name: "Risk signals" });
  await expect(risk).toHaveAttribute("aria-selected", "true");

  const skills = page.getByRole("tab", { name: "Skills Heatmap" });
  // Dispatch on the element rather than clicking its coordinates: the hero's
  // animated, overlapping layers intercept pointer events on the narrow mobile
  // viewport, which would exercise the overlay rather than the tab.
  await skills.dispatchEvent("click");
  await expect(skills).toHaveAttribute("aria-selected", "true");
  await expect(page).toHaveURL(/#skills$/);

  // Selecting a tab writes a history entry, so Back must restore the section
  // that hash named rather than leaving the URL and the visible tab disagreeing.
  await page.goBack();
  await expect(risk).toHaveAttribute("aria-selected", "true");
});
