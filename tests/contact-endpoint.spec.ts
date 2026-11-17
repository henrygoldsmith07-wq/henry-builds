import { expect, test, type Page } from "@playwright/test";

/**
 * Exercise the configured-endpoint branches of the contact form. Run with
 * `npm run test:contact`; the config starts two dev servers, one with a valid
 * same-origin endpoint and one with a hostile cross-origin value.
 */

async function fillContactForm(page: Page) {
  await page.goto("/");
  await page.getByRole("button", { name: /Smart contact options/i }).click();
  await page.locator("button").filter({ hasText: "Forq" }).first().click();
  await page.locator("button").filter({ hasText: "Backend Systems" }).click();
  await page
    .locator("#message")
    .fill("I would like to discuss a project with measurable evidence and limits.");
  await page.getByLabel(/I agree to receive a response via email/i).check();
}

test("a configured same-origin endpoint receives a valid POST and shows success", async ({
  page,
}) => {
  test.skip(test.info().project.name !== "same-origin");

  let method = "";
  let payload: Record<string, unknown> = {};
  await page.route("**/api/contact", async (route) => {
    method = route.request().method();
    payload = JSON.parse(route.request().postData() ?? "{}");
    await route.fulfill({ status: 200, body: "ok" });
  });

  await fillContactForm(page);
  await page.getByRole("button", { name: "Send inquiry" }).click();

  await expect(page.getByRole("heading", { name: "Message sent" })).toBeVisible();
  expect(method).toBe("POST");
  expect(payload.consent).toMatchObject({ emailConsent: true });
  expect(payload.interestAreas).toContain("backend");
  expect(payload.interestedProjects).toEqual([
    expect.objectContaining({ slug: "forq" }),
  ]);
});

test("a failing endpoint reports the failure and never claims success", async ({
  page,
}) => {
  test.skip(test.info().project.name !== "same-origin");

  await page.route("**/api/contact", (route) =>
    route.fulfill({ status: 500, body: "no" }),
  );

  await fillContactForm(page);
  await page.getByRole("button", { name: "Send inquiry" }).click();

  await expect(page.getByRole("alert")).toContainText("could not be sent");
  await expect(page.getByText("Message sent")).toHaveCount(0);
});

test("a cross-origin endpoint is rejected without sending a request", async ({
  page,
}) => {
  test.skip(test.info().project.name !== "cross-origin");

  let requests = 0;
  page.on("request", (request) => {
    if (request.url().includes("evil.example")) requests += 1;
  });

  await fillContactForm(page);
  await page.getByRole("button", { name: "Send inquiry" }).click();

  await expect(page.getByRole("alert")).toContainText(
    "not on this site's origin",
  );
  expect(requests).toBe(0);
  await expect(page.getByText("Message sent")).toHaveCount(0);
});
