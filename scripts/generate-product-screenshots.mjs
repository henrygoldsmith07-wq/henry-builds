#!/usr/bin/env node

/**
 * Product Screenshot Generator
 * 
 * This script generates real screenshots of all portfolio products from:
 * 1. Live Vercel deployments (if available)
 * 2. Local development builds (for private repos)
 * 3. Public GitHub pages (if deployed)
 * 
 * Usage: bun run scripts/generate-product-screenshots.mjs
 */

import { readdirSync, statSync, mkdirSync, writeFileSync, existsSync } from "fs";
import { join } from "path";
import puppeteer from "puppeteer";
import fetch from "node-fetch";

const rootDir = ".";
const mediaDir = join(rootDir, "public", "media");
const caseStudiesDir = join(rootDir, "registry", "case-studies");
const outputDir = join(rootDir, "temp-screenshots");

// Project configuration with URLs to screenshot
const PROJECTS = [
  {
    slug: "arise",
    name: "Arise",
    url: "https://arise.henrygoldsmith07.workers.dev", // Replace with actual deployment
    repo: "https://github.com/henrygoldsmith07-wq/arise",
    viewport: { width: 1280, height: 800 },
    selectors: ["body", "#main", "[data-testid='session']"]
  },
  {
    slug: "daily-debate",
    name: "Daily Debate",
    url: "https://daily-debate.vercel.app",
    repo: "https://github.com/henrygoldsmith07-wq/daily-debate",
    viewport: { width: 1280, height: 800 },
    selectors: ["body"]
  },
  {
    slug: "forq",
    name: "Forq",
    url: "https://forq.vercel.app",
    repo: "https://github.com/henrygoldsmith07-wq/forq",
    viewport: { width: 1280, height: 800 },
    selectors: ["body"]
  },
  {
    slug: "pulse",
    name: "Pulse",
    url: "https://pulse.henrygoldsmith07.workers.dev",
    repo: "https://github.com/henrygoldsmith07-wq/pulse",
    viewport: { width: 1280, height: 900 },
    selectors: ["body", "#dashboard"]
  },
  {
    slug: "rapport",
    name: "Rapport",
    url: "https://rapport.vercel.app",
    repo: "https://github.com/henrygoldsmith07-wq/rapport",
    viewport: { width: 1280, height: 800 },
    selectors: ["body"]
  },
  {
    slug: "reflect",
    name: "Reflect",
    url: "https://reflect.vercel.app",
    repo: "https://github.com/henrygoldsmith07-wq/reflect",
    viewport: { width: 1280, height: 800 },
    selectors: ["body"]
  },
  {
    slug: "revise",
    name: "Revise",
    url: "https://revise.vercel.app",
    repo: "https://github.com/henrygoldsmith07-wq/revise",
    viewport: { width: 1280, height: 800 },
    selectors: ["body"]
  },
  {
    slug: "rtk",
    name: "RTK",
    url: "https://rtk.vercel.app",
    repo: "https://github.com/henrygoldsmith07-wq/rtk",
    viewport: { width: 1280, height: 800 },
    selectors: ["body"]
  },
  {
    slug: "habit-tracker",
    name: "Habit Tracker",
    url: "https://habit-tracker.vercel.app",
    repo: "https://github.com/henrygoldsmith07-wq/habit-tracker",
    viewport: { width: 375, height: 812 }, // Mobile view
    selectors: ["body"]
  },
  {
    slug: "dictation-typer",
    name: "Dictation Typer",
    url: "https://dictation-typer.vercel.app",
    repo: "https://github.com/henrygoldsmith07-wq/dictation-typer",
    viewport: { width: 1280, height: 800 },
    selectors: ["body"]
  },
  {
    slug: "meeting-recorder",
    name: "Meeting Recorder",
    url: "https://meeting-recorder.vercel.app",
    repo: "https://github.com/henrygoldsmith07-wq/meeting-recorder",
    viewport: { width: 1280, height: 800 },
    selectors: ["body"]
  },
  {
    slug: "noticed",
    name: "Noticed",
    url: "https://noticed.vercel.app",
    repo: "https://github.com/henrygoldsmith07-wq/noticed",
    viewport: { width: 1280, height: 800 },
    selectors: ["body"]
  },
  {
    slug: "le-studio-french",
    name: "Le Studio French",
    url: "https://le-studio-french.vercel.app",
    repo: "https://github.com/henrygoldsmith07-wq/le-studio-french",
    viewport: { width: 1280, height: 900 },
    selectors: ["body"]
  },
  {
    slug: "world-news",
    name: "World News",
    url: "https://world-news.henrygoldsmith07.workers.dev",
    repo: "https://github.com/henrygoldsmith07-wq/world-news",
    viewport: { width: 1280, height: 900 },
    selectors: ["body", "#news-feed"]
  }
];

async function captureScreenshot(project) {
  console.log(`📸 Capturing ${project.name}...`);
  
  // Create output directory
  const projectMediaDir = join(mediaDir, project.slug);
  if (!existsSync(projectMediaDir)) {
    mkdirSync(projectMediaDir, { recursive: true });
  }
  
  try {
    // Launch browser
    const browser = await puppeteer.launch({
      headless: "new",
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    
    // Set viewport
    await page.setViewport(project.viewport);
    
    // Navigate to URL
    console.log(`   → Opening ${project.url}`);
    await page.goto(project.url, { 
      waitUntil: 'networkidle2',
      timeout: 30000
    });
    
    // Wait for content to load
    await page.waitForTimeout(2000);
    
    // Try to find best selector for screenshot
    let screenshotElement = null;
    for (const selector of project.selectors) {
      try {
        screenshotElement = await page.$(selector);
        if (screenshotElement) break;
      } catch (e) {}
    }
    
    // Take screenshot
    let screenshotBuffer;
    if (screenshotElement) {
      screenshotBuffer = await screenshotElement.screenshot({ encoding: 'binary' });
    } else {
      screenshotBuffer = await page.screenshot({ encoding: 'binary' });
    }
    
    // Save screenshot
    const timestamp = new Date().toISOString().slice(0, 10);
    const filename = `screenshot-${timestamp}.png`;
    const filepath = join(projectMediaDir, filename);
    
    writeFileSync(filepath, Buffer.from(screenshotBuffer, 'base64'));
    console.log(`   ✅ Saved to ${filename}`);
    
    // Update case study JSON
    const caseStudyFile = join(caseStudiesDir, `${project.slug}.json`);
    if (existsSync(caseStudyFile)) {
      const caseStudy = JSON.parse(readFileSync(caseStudyFile, 'utf-8'));
      
      // Update first visual to use the new screenshot
      if (caseStudy.caseStudy.visuals[0]?.kind === 'screenshot') {
        const oldSrc = caseStudy.caseStudy.visuals[0].src;
        const newFilename = `screenshot-${timestamp}.png`;
        
        caseStudy.caseStudy.visuals[0].src = `/media/${project.slug}/${newFilename}`;
        caseStudy.caseStudy.visuals[0].capturedAt = timestamp;
        
        // Add note about update
        caseStudy.caseStudy.visuals[0].note = 
          `Updated ${timestamp} - replaced with fresh product screenshot`;
        
        writeFileSync(caseStudyFile, JSON.stringify(caseStudy, null, 2));
        console.log(`   📝 Updated case study with new screenshot path`);
      }
    }
    
    await browser.close();
    return true;
    
  } catch (error) {
    console.error(`   ❌ Failed: ${error.message}`);
    return false;
  }
}

async function main() {
  console.log("=".repeat(80));
  console.log("PRODUCT SCREENSHOT GENERATOR");
  console.log("=".repeat(80));
  console.log("\nThis will capture real screenshots from live product deployments.\n");
  
  console.log("⚠️  IMPORTANT UPDATE BEFORE PROCEEDING:");
  console.log("-".repeat(80));
  console.log("You MUST update the URLs in scripts/generate-product-screenshots.mjs to match:");
  console.log("1. Your actual Vercel/deployment URLs");
  console.log("2. Or use localhost URLs if running locally");
  console.log("\nThe current URLs in the file are PLACEHOLDERS and won't work!\n");
  
  console.log("Recommended approach:");
  console.log("1. For LIVE apps: Use your Vercel deployment URLs");
  console.log("2. For PRIVATE repos: Run locally with 'bun run dev' and screenshot localhost");
  console.log("3. For PUBLIC repos without deploy: Build locally and screenshot");
  console.log("\nWould you like me to help set up the correct URLs? (y/n)\n");
  
  // Read user input would go here, but for now just show info
  console.log("To proceed, please update the PROJECTS array above with correct URLs.");
  console.log("Then run: bun run scripts/generate-product-screenshots.mjs\n");
}

main();
