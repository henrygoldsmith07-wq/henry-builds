import fs from "node:fs";
import { defineConfig, devices } from "@playwright/test";

/**
 * The contact endpoint is a build-time variable, so these tests use two dev
 * servers with different values: a valid same-origin path and a cross-origin
 * URL that must be rejected before any request is made.
 */

const bundledChromium = "/opt/pw-browsers/chromium";
const executablePath =
  process.env.PLAYWRIGHT_CHROMIUM_PATH ??
  (fs.existsSync(bundledChromium) ? bundledChromium : undefined);

const browser = {
  ...devices["Desktop Chrome"],
  viewport: { width: 1280, height: 900 },
  launchOptions: { executablePath },
};

export default defineConfig({
  testDir: "./tests",
  testMatch: "**/contact-endpoint.spec.ts",
  fullyParallel: false,
  reporter: [["list"]],
  webServer: [
    {
      command: "node node_modules/vite/bin/vite.js --port 4194 --strictPort --host 127.0.0.1",
      url: "http://127.0.0.1:4194",
      env: { VITE_CONTACT_ENDPOINT: "/api/contact" },
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
    {
      command: "node node_modules/vite/bin/vite.js --port 4195 --strictPort --host 127.0.0.1",
      url: "http://127.0.0.1:4195",
      env: { VITE_CONTACT_ENDPOINT: "https://evil.example/collect" },
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
  ],
  projects: [
    { name: "same-origin", use: { ...browser, baseURL: "http://127.0.0.1:4194" } },
    { name: "cross-origin", use: { ...browser, baseURL: "http://127.0.0.1:4195" } },
  ],
});
