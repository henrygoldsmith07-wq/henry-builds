import fs from "node:fs";
import { defineConfig, devices } from "@playwright/test";

/**
 * Some sandboxes ship a pre-installed Chromium that does not match the build
 * this Playwright version would download. Use it when it is there; in CI, where
 * `playwright install` fetches the matching build, this is undefined and
 * Playwright resolves the browser itself.
 */
const SYSTEM_CHROMIUM = "/opt/pw-browsers/chromium";
const executablePath =
  process.env.PLAYWRIGHT_CHROMIUM_PATH ??
  (fs.existsSync(SYSTEM_CHROMIUM) ? SYSTEM_CHROMIUM : undefined);

/**
 * Tests run against the production build, not the dev server: the dev server
 * serves unminified CSS and different asset URLs, so a visual snapshot taken
 * there would not describe what actually ships.
 */
export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : [["list"]],

  use: {
    baseURL: process.env.BASE_URL ?? "http://127.0.0.1:4173",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },

  /**
   * Snapshots are compared with a small tolerance. Font rasterisation differs
   * between a local machine and CI, so a zero-tolerance comparison would fail
   * on text rendering rather than on a real visual change.
   */
  expect: {
    toHaveScreenshot: {
      maxDiffPixelRatio: 0.02,
      animations: "disabled",
      caret: "hide",
    },
  },

  projects: [
    {
      name: "desktop",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1280, height: 900 },
        launchOptions: { executablePath },
      },
    },
    {
      name: "mobile",
      use: { ...devices["Pixel 7"], launchOptions: { executablePath } },
    },
  ],

  webServer: process.env.BASE_URL
    ? undefined
    : {
        command: "bun run preview --port 4173 --strictPort",
        url: "http://127.0.0.1:4173",
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
});
