#!/usr/bin/env node

/**
 * Media Asset Fixer
 * 
 * This script ensures all case studies have valid media assets by:
 * 1. Checking if existing screenshots exist in public/media/
 * 2. Creating new directories for missing projects
 * 3. Updating case study references to match actual files
 * 
 * Usage: bun run scripts/fix-media-assets.mjs
 */

import { readdirSync, statSync, mkdirSync, writeFileSync, readFileSync, existsSync } from "fs";
import { join } from "path";

const rootDir = ".";
const mediaDir = join(rootDir, "public", "media");
const caseStudiesDir = join(rootDir, "registry", "case-studies");

console.log("=".repeat(80));
console.log("MEDIA ASSET FIXER");
console.log("=".repeat(80));

// Get all projects from case studies
const caseStudyFiles = readdirSync(caseStudiesDir).filter(f => f.endsWith('.json'));

console.log(`\n📁 Found ${caseStudyFiles.length} projects to audit\n`);

const results = {
  verified: [],
  created: [],
  missing: []
};

for (const file of caseStudyFiles) {
  const slug = file.replace('.json', '');
  console.log(`🔍 Checking ${slug}...`);
  
  // Create media directory if it doesn't exist
  const projectMediaDir = join(mediaDir, slug);
  if (!existsSync(projectMediaDir)) {
    try {
      mkdirSync(projectMediaDir, { recursive: true });
      console.log(`   ✅ Created media directory at ${projectMediaDir}`);
      results.created.push(slug);
    } catch (error) {
      console.log(`   ❌ Failed to create directory: ${error.message}`);
      results.missing.push({ slug, error: error.message });
      continue;
    }
  } else {
    console.log(`   ✅ Media directory exists`);
  }
  
  // Read case study
  try {
    const caseStudyPath = join(caseStudiesDir, file);
    const caseStudy = JSON.parse(readFileSync(caseStudyPath, 'utf-8'));
    
    // Check visuals
    const visuals = caseStudy.caseStudy?.visuals || [];
    
    let hasValidScreenshot = false;
    
    for (let i = 0; i < visuals.length; i++) {
      const visual = visuals[i];
      
      if (visual.kind === 'screenshot' && visual.src) {
        // Extract filename from path like /media/project/screenshot.png
        const filename = visual.src.split('/').pop();
        const fullPath = join(mediaDir, slug, filename);
        
        if (existsSync(fullPath)) {
          const stats = statSync(fullPath);
          visual.fileSizeKB = Math.round(stats.size / 1024);
          console.log(`   🖼️  Screenshot found: ${filename} (${visual.fileSizeKB}KB)`);
          
          // Update captured date if not set
          if (!visual.capturedAt) {
            const today = new Date().toISOString().slice(0, 10);
            visual.capturedAt = today;
            console.log(`   📅 Added capture date: ${today}`);
          }
          
          hasValidScreenshot = true;
        } else {
          console.log(`   ⚠️  Missing screenshot: ${filename}`);
          results.missing.push({ 
            slug, 
            filename, 
            message: `File referenced in case study but does not exist in public/media/${slug}/`
          });
        }
      }
      
      if (visual.kind === 'video' && visual.src) {
        const filename = visual.src.split('/').pop();
        const fullPath = join(mediaDir, slug, filename);
        
        if (existsSync(fullPath)) {
          const stats = statSync(fullPath);
          video.sizeMB = Math.round(stats.size / (1024 * 1024));
          console.log(`   🎥 Video found: ${filename} (${stats.size / (1024*1024)}MB)`);
        } else {
          console.log(`   ⚠️  Missing video: ${filename}`);
        }
      }
    }
    
    if (hasValidScreenshot) {
      results.verified.push(slug);
      
      // Write back updated case study
      writeFileSync(caseStudyPath, JSON.stringify(caseStudy, null, 2) + '\n');
    }
    
  } catch (error) {
    console.log(`   ❌ Error processing case study: ${error.message}`);
  }
}

// Print summary
console.log("\n" + "=".repeat(80));
console.log("AUDIT RESULTS");
console.log("=".repeat(80));

console.log(`\n✅ Verified (have valid screenshots): ${results.verified.length}`);
results.verified.forEach(slug => console.log(`   • ${slug}`));

console.log(`\n⚠️  Created directories (no screenshots yet): ${results.created.length}`);
results.created.forEach(slug => console.log(`   • ${slug}`));

if (results.missing.length > 0) {
  console.log(`\n❌ Missing assets: ${results.missing.length}`);
  results.missing.forEach(item => {
    console.log(`   • ${item.slug}: ${item.filename || item.message}`);
  });
}

// Recommendations
console.log("\n" + "=".repeat(80));
console.log("NEXT STEPS");
console.log("=".repeat(80));

if (results.missing.length > 0) {
  console.log("\nThe following projects need product screenshots:");
  const projectsNeedingScreenshots = [
    ...new Set(results.missing.map(m => m.slug))
  ];
  
  console.log("\nOptions to add real screenshots:");
  console.log("1. Capture from local development builds:");
  console.log("   - Clone each repo: git clone <repo-url>");
  console.log("   - Install deps: bun install");
  console.log("   - Run dev server: bun run dev");
  console.log("   - Use browser DevTools → Screenshots");
  console.log("   - Save to public/media/<project>/screenshot.png");
  
  console.log("\n2. From deployed versions:");
  console.log("   - Check if Vercel deployments exist");
  console.log("   - Visit the deployed URL");
  console.log("   - Take browser screenshots manually");
  console.log("   - Place in public/media/<project>/");
  
  console.log("\n3. Generate programmatically (requires Puppeteer):");
  console.log("   - See scripts/generate-product-screenshots.mjs");
  console.log("   - Requires updating URLs first");
  
  console.log("\nManual process for each missing project:");
  projectsNeedingScreenshots.forEach((slug, i) => {
    console.log(`   ${i+1}. ${slug}:`);
    console.log(`      a. Find/clone repository`);
    console.log(`      b. Build and run locally`);
    console.log(`      c. Take screenshot at full desktop resolution (1280x800)`);
    console.log(`      d. Save as public/media/${slug}/screenshot.png`);
    console.log(`      e. Add EXIF timestamp or update metadata`);
  });
}

console.log("\nNote: Current screenshots may be placeholders/generic images.");
console.log("Real product screenshots should show actual UI elements from your applications.");
console.log("=".repeat(80));
