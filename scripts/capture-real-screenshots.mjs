#!/usr/bin/env node

/**
 * Real Product Screenshot Capturer
 * 
 * This script helps you capture REAL screenshots from your products by:
 * 1. Listing all projects that need screenshots
 * 2. Providing step-by-step instructions for each
 * 3. Offering automation options if you run them locally
 * 
 * Usage: bun run scripts/capture-real-screenshots.mjs
 */

import { readdirSync, statSync, existsSync } from "fs";
import { join } from "path";

const rootDir = ".";
const caseStudiesDir = join(rootDir, "registry", "case-studies");

console.log("=".repeat(80));
console.log("REAL PRODUCT SCREENSHOT CAPTURE GUIDE");
console.log("=".repeat(80));

// Get projects needing screenshots
const projectsNeedingScreenshots = [
  {
    slug: "arise",
    name: "Arise",
    description: "Offline-first training companion",
    repo: "https://github.com/henrygoldsmith07-wq/arise",
    expectedUrl: "http://localhost:5173" // Assuming Vite dev server
  },
  {
    slug: "daily-debate",
    name: "Daily Debate",
    description: "AI debate platform",
    repo: "https://github.com/henrygoldsmith07-wq/daily-debate",
    expectedUrl: "http://localhost:5173"
  },
  {
    slug: "forq",
    name: "Forq",
    description: "Focus timer app",
    repo: "https://github.com/henrygoldsmith07-wq/forq",
    expectedUrl: "http://localhost:5173"
  },
  {
    slug: "pulse",
    name: "Pulse",
    description: "Personal analytics tool",
    repo: "https://github.com/henrygoldsmith07-wq/pulse",
    expectedUrl: "http://localhost:5173"
  },
  {
    slug: "rapport",
    name: "Rapport",
    description: "Communication insights",
    repo: "https://github.com/henrygoldsmith07-wq/rapport",
    expectedUrl: "http://localhost:5173"
  },
  {
    slug: "reflect",
    name: "Reflect",
    description: "Journaling application",
    repo: "https://github.com/henrygoldsmith07-wq/reflect",
    expectedUrl: "http://localhost:5173"
  },
  {
    slug: "revise",
    name: "Revise",
    description: "Learning tool",
    repo: "https://github.com/henrygoldsmith07-wq/revise",
    expectedUrl: "http://localhost:5173"
  },
  {
    slug: "rtk",
    name: "RTK",
    description: "React Toolkit",
    repo: "https://github.com/henrygoldsmith07-wq/rtk",
    expectedUrl: "http://localhost:5173"
  },
  {
    slug: "habit-tracker",
    name: "Habit Tracker",
    description: "Mobile habit tracking app",
    repo: "https://github.com/henrygoldsmith07-wq/habit-tracker",
    expectedUrl: "http://localhost:5173",
    mobile: true,
    viewport: "375x812"
  },
  {
    slug: "dictation-typer",
    name: "Dictation Typer",
    description: "Voice typing utility",
    repo: "https://github.com/henrygoldsmith07-wq/dictation-typer",
    expectedUrl: "http://localhost:5173"
  },
  {
    slug: "meeting-recorder",
    name: "Meeting Recorder",
    description: "Meeting audio recorder",
    repo: "https://github.com/henrygoldsmith07-wq/meeting-recorder",
    expectedUrl: "http://localhost:5173"
  },
  {
    slug: "noticed",
    name: "Noticed",
    description: "Notification management",
    repo: "https://github.com/henrygoldsmith07-wq/noticed",
    expectedUrl: "http://localhost:5173"
  },
  {
    slug: "le-studio-french",
    name: "Le Studio French",
    description: "French language learning",
    repo: "https://github.com/henrygoldsmith07-wq/le-studio-french",
    expectedUrl: "http://localhost:5173"
  },
  {
    slug: "world-news",
    name: "World News",
    description: "News aggregator",
    repo: "https://github.com/henrygoldsmith07-wq/world-news",
    expectedUrl: "http://localhost:5173"
  },
  {
    slug: "agent-os-control-room",
    name: "Agent OS Control Room",
    description: "AI agent control interface",
    repo: "https://github.com/henrygoldsmith07-wq/agent-os-control-room",
    expectedUrl: "http://localhost:5173"
  }
];

console.log("\n📋 PROJECTS TO CAPTURE SCREENSHOTS FOR:");
console.log("-".repeat(80));

projectsNeedingScreenshots.forEach((project, index) => {
  console.log(`\n${index + 1}. ${project.name} (${project.slug})`);
  console.log(`   Description: ${project.description}`);
  console.log(`   Repository: ${project.repo}`);
  console.log(`   Expected URL: ${project.expectedUrl}`);
  if (project.mobile) {
    console.log(`   ⚠️  MOBILE VIEW required: ${project.viewport || "375x812"}`);
  }
});

console.log("\n" + "=".repeat(80));
console.log("CAPTURE INSTRUCTIONS");
console.log("=".repeat(80));

console.log("\nOPTION 1: MANUAL CAPTURE (Recommended - Most Control)");
console.log("-".repeat(80));
console.log("For EACH project listed above:");
console.log();
console.log("Step 1: Clone repository");
console.log("   git clone https://github.com/henrygoldsmith07-wq/<PROJECT-SLUG>.git");
console.log();
console.log("Step 2: Install dependencies");
console.log("   cd <PROJECT-SLUG>");
console.log("   bun install");
console.log();
console.log("Step 3: Start development server");
console.log("   bun run dev");
console.log();
console.log("Step 4: Open browser and navigate to the app");
console.log("   Visit: http://localhost:5173");
console.log();
console.log("Step 5: Take desktop screenshot (1280x800 recommended)");
console.log("   Option A - Windows: Win+Shift+S → Select area → Save as PNG");
console.log("   Option B - Mac: Cmd+Shift+4 → Select area");
console.log("   Option C - Browser DevTools → Screenshot feature");
console.log();
console.log("Step 6: Save screenshot to portfolio media folder");
console.log("   Save as: henry-builds/public/media/<SLUG>/screenshot.png");
console.log();
console.log("Step 7: Verify file exists");
console.log("   ls -lh public/media/<SLUG>/screenshot.png");
console.log("   (Should be between 50KB - 500KB)");
console.log();
console.log("Repeat for ALL 15 projects above!");

console.log("\n\nOPTION 2: AUTOMATED WITH PUPPETEER (Requires Setup)");
console.log("-".repeat(80));
console.log("If you prefer automation, run after setting up Puppeteer:");
console.log();
console.log("1. Install dependencies:");
console.log("   bun add puppeteer --dev");
console.log();
console.log("2. Run automated capture:");
console.log("   bun run scripts/capture-real-screenshots.mjs --auto");
console.log();
console.log("⚠️  Note: Auto-mode will attempt to build and launch each project.");
console.log("        You must update scripts/capture-real-screenshots.mjs with:");
console.log("        - Actual URLs (not localhost placeholders)");
console.log("        - Correct viewport settings per project");

console.log("\n\nOPTION 3: FROM VERCEL DEPLOYMENTS (If deployed)");
console.log("-".repeat(80));
console.log("If any projects are deployed to Vercel:");
console.log();
console.log("1. Find deployment URL at:");
console.log("   https://vercel.com/henrygoldsmith07-wq/<PROJECT-SLUG>");
console.log();
console.log("2. Visit the deployed URL");
console.log();
console.log("3. Take screenshot using browser");
console.log();
console.log("4. Save to same location as manual capture");
console.log();
console.log("Check deployments first:");
projectsNeedingScreenshots.forEach(project => {
  console.log(`   ${project.name}: Check https://vercel.com/henrygoldsmith07-wq/${project.slug}`);
});

console.log("\n\nIMAGE REQUIREMENTS:");
console.log("-".repeat(80));
console.log("✅ GOOD:");
console.log("   • Shows actual UI elements of YOUR application");
console.log("   • Clear, readable text and controls");
console.log("   • Proper lighting/colors (no dark mode issues unless intended)");
console.log("   • Captured within last 90 days (per portfolio policy)");
console.log("   • File size: 50KB - 500KB (PNG format recommended)");
console.log("   • Resolution: 1280x800 (desktop) or 375x812 (mobile)");
console.log();
console.log("❌ BAD:");
console.log("   • Generic placeholder images");
console.log("   • Mockup illustrations (unless explicitly labeled as such)");
console.log("   • Screenshots from other apps/projects");
console.log("   • Blurry or pixelated images");
console.log("   • Over 1MB file size");
console.log();

console.log("\n\nVERIFY AFTER CAPTURING:");
console.log("-".repeat(80));
console.log("After capturing all screenshots, run:");
console.log("   bun run scripts/fix-media-assets.mjs");
console.log();
console.log("This will verify all screenshots exist and update case study metadata.");

console.log("\n" + "=".repeat(80));
console.log("QUICK START COMMANDS");
console.log("=".repeat(80));
console.log();
console.log("To start capturing screenshots now:");
console.log();

projectsNeedingScreenshots.forEach((project, index) => {
  console.log(`${index + 1}. Capture ${project.name}:`);
  console.log(`   git clone ${project.repo}`);
  console.log(`   cd ${project.slug}`);
  console.log(`   bun install && bun run dev`);
  console.log(`   # After dev starts, open http://localhost:5173 and take screenshot`);
  console.log(`   # Save as: ../henry-builds/public/media/${project.slug}/screenshot.png`);
  console.log();
});

console.log("Once complete, return to henry-builds directory and verify:");
console.log("   cd henry-builds");
console.log("   bun run scripts/fix-media-assets.mjs");
console.log();
