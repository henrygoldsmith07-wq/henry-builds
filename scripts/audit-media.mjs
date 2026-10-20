/**
 * Media asset audit script.
 * 
 * This script audits all case study visual assets and reports:
 * - Which screenshots/videos actually exist
 * - Which are missing
 * - File sizes for existing assets
 * - Captured dates
 * 
 * Run with: bun run scripts/audit-media.mjs
 */

import { readdirSync, statSync, readFileSync } from "fs";
import { join } from "path";

const rootDir = ".";
const mediaDir = join(rootDir, "public", "media");
const caseStudiesDir = join(rootDir, "registry", "case-studies");

// Helper to read JSON
function readJSON(path) {
  try {
    const content = readdirSync(path).find(f => f.endsWith('.json'));
    if (!content) return null;
    return JSON.parse(readFileSync(join(path, content), 'utf-8'));
  } catch (error) {
    console.error(`Error reading ${path}:`, error.message);
    return null;
  }
}

function readFileSync(path, encoding = 'utf-8') {
  // Import fs at runtime
  const fs = await import('fs');
  return fs.readFileSync(path, encoding);
}

// Get all case studies
const caseStudyFiles = readdirSync(caseStudiesDir).filter(f => f.endsWith('.json'));
console.log("📁 Auditing", caseStudyFiles.length, "case studies...\n");

const results = {
  complete: [],
  partial: [],
  incomplete: [],
};

for (const file of caseStudyFiles) {
  const slug = file.replace('.json', '');
  const projectPath = join(mediaDir, slug);
  
  // Check if project media directory exists
  const dirExists = statSync(projectPath).isDirectory();
  
  // List all files in media directory
  let mediaFiles = [];
  if (dirExists) {
    try {
      mediaFiles = readdirSync(projectPath);
    } catch (e) {
      mediaFiles = [];
    }
  }
  
  // Read case study to get expected visuals
  const caseStudy = readJSON(join(caseStudiesDir, file));
  const visuals = caseStudy?.caseStudy?.visuals || [];
  
  const result = {
    slug,
    name: caseStudy?.name,
    stage: caseStudy?.stage,
    hasDirectory: dirExists,
    mediaFiles,
    visualsCount: visuals.length,
    screenshotsFound: 0,
    videosFound: 0,
    illustrationsFound: 0,
    missingVisuals: [],
  };
  
  // Analyze media files
  const screenshotFiles = mediaFiles.filter(f => f.includes('screenshot') && f.match(/\.(png|jpg|jpeg|webp)$/));
  const videoFiles = mediaFiles.filter(f => f.match(/\.(mp4|webm|mov)$/));
  const imageFiles = mediaFiles.filter(f => f.match(/\.png$/i) && !f.includes('screenshot'));
  
  result.screenshotsFound = screenshotFiles.length;
  result.videosFound = videoFiles.length;
  result.illustrationsFound = imageFiles.length;
  
  // Check each visual reference
  for (const visual of visuals) {
    if (visual.kind === 'screenshot' && visual.src) {
      // Extract filename from path like /media/project/screenshot.png
      const filename = visual.src.split('/').pop();
      const fullPath = join(mediaDir, slug, filename);
      
      try {
        statSync(fullPath);
        result.screenshotsFound++;
      } catch (e) {
        result.missingVisuals.push({
          type: 'screenshot',
          path: visual.src,
          caption: visual.caption
        });
      }
    }
    
    if (visual.kind === 'video' && visual.src) {
      const filename = visual.src.split('/').pop();
      const fullPath = join(mediaDir, slug, filename);
      
      try {
        statSync(fullPath);
        result.videosFound++;
      } catch (e) {
        result.missingVisuals.push({
          type: 'video',
          path: visual.src,
          caption: visual.caption
        });
      }
    }
  }
  
  // Categorize result
  if (result.missingVisuals.length === 0 && (result.screenshotsFound > 0 || result.videosFound > 0)) {
    results.complete.push(result);
  } else if (result.screenshotsFound > 0 || result.videosFound > 0) {
    results.partial.push(result);
  } else {
    results.incomplete.push(result);
  }
}

// Print report
console.log("=".repeat(80));
console.log("MEDIA ASSET AUDIT REPORT");
console.log("=".repeat(80));

console.log("\n✅ COMPLETE (All visuals present):");
console.log("-".repeat(80));
results.complete.forEach(r => {
  console.log(`\n📷 ${r.name} (${r.slug}) [${r.stage}]`);
  console.log(`   Screenshots: ${r.screenshotsFound}`);
  console.log(`   Videos: ${r.videosFound}`);
  console.log(`   Other Images: ${r.illustrationsFound}`);
  r.mediaFiles.slice(0, 5).forEach(f => {
    const size = statSync(join(mediaDir, r.slug, f)).size;
    console.log(`   - ${f} (${formatBytes(size)})`);
  });
});

if (results.partial.length > 0) {
  console.log("\n⚠️  PARTIAL (Some visuals missing):");
  console.log("-".repeat(80));
  results.partial.forEach(r => {
    console.log(`\n📷 ${r.name} (${r.slug}) [${r.stage}]`);
    console.log(`   Screenshots: ${r.screenshotsFound}, Videos: ${r.videosFound}`);
    if (r.missingVisuals.length > 0) {
      console.log(`   Missing:`);
      r.missingVisuals.forEach(m => {
        console.log(`     ❌ ${m.path}`);
        if (m.caption) console.log(`        Caption: ${m.caption}`);
      });
    }
  });
}

if (results.incomplete.length > 0) {
  console.log("\n❌ INCOMPLETE (No visuals found):");
  console.log("-".repeat(80));
  results.incomplete.forEach(r => {
    console.log(`\n📷 ${r.name} (${r.slug}) [${r.stage}]`);
    console.log(`   ⚠️  No media directory or no media files found`);
  });
}

// Summary
console.log("\n" + "=".repeat(80));
console.log("SUMMARY");
console.log("=".repeat(80));
console.log(`Total projects: ${caseStudyFiles.length}`);
console.log(`✅ Complete: ${results.complete.length}`);
console.log(`⚠️  Partial: ${results.partial.length}`);
console.log(`❌ Incomplete: ${results.incomplete.length}`);

function formatBytes(bytes, decimals = 2) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}
