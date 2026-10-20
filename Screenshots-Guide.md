# 📸 Real Product Screenshots Guide

## Current Status

**Your portfolio now has:**
- ✅ Comprehensive media audit tools
- ✅ Clear guidelines for screenshot requirements  
- ✅ 8 projects with placeholder/generic screenshots
- ⚠️ **7 projects MISSING screenshots entirely**

## What Needs to Be Done

You need to capture **REAL screenshots from your actual running products**. The current `screenshot.png` files in most projects are likely placeholders or generic images, not actual product captures.

### Projects That Need REAL Screenshots Captured:

1. **arise** - Offline-first training companion
2. **daily-debate** - AI debate platform
3. **forq** - Focus timer app
4. **pulse** - Personal analytics tool
5. **rapport** - Communication insights
6. **reflect** - Journaling application
7. **revise** - Learning tool
8. **rtk** - React Toolkit
9. **habit-tracker** - Mobile habit tracking (⚠️ needs MOBILE view)
10. **dictation-typer** - Voice typing utility
11. **meeting-recorder** - Meeting audio recorder
12. **noticed** - Notification management
13. **le-studio-french** - French language learning
14. **world-news** - News aggregator
15. **agent-os-control-room** - AI agent control interface

## How to Capture REAL Screenshots

### Option A: Manual Capture (Recommended - Most Control)

For **EACH project** above, follow these steps:

#### Step 1: Build the Project
```bash
git clone https://github.com/henrygoldsmith07-wq/<PROJECT-SLUG>.git
cd <PROJECT-SLUG>
bun install
bun run dev
```

The dev server will start at `http://localhost:5173`

#### Step 2: Take Screenshot
Open your browser and go to `http://localhost:5173`, then take a screenshot showing actual UI:

**Windows:**
- Press `Win + Shift + S`
- Select the entire browser window
- Save as PNG

**Mac:**
- Press `Cmd + Shift + 4`
- Select the entire browser window
- Saves to Desktop automatically

**Browser DevTools Method:**
- Open DevTools (`F12`)
- Click the three dots menu → More tools → Screenshot
- Choose "Capture full size screenshot"

#### Step 3: Save to Portfolio
Rename/Save the file as:
```
henry-builds/public/media/<SLUG>/screenshot.png
```

Replace `<SLUG>` with the project folder name (e.g., `arise`, `pulse`, etc.)

#### Step 4: Verify
Check the file exists and has reasonable size:
```bash
ls -lh henry-builds/public/media/<SLUG>/screenshot.png
```

Should be between **50KB - 500KB** for PNG format.

### Option B: From Live Deployments

If any projects are deployed to Vercel:

1. Visit the deployment URL
   - Check: `https://vercel.com/henrygoldsmith07-wq/<PROJECT-SLUG>`
   
2. Take screenshot using browser DevTools method above

3. Save to same location as manual capture

## Image Requirements

✅ **GOOD screenshots show:**
- Your actual application's UI elements
- Clear, readable text and controls
- Proper colors (ensure good contrast)
- Fresh captures (within last 90 days per portfolio policy)
- File size: 50KB - 500KB (PNG format)
- Resolution: 1280x800 (desktop) or 375x812 (mobile for habit-tracker)

❌ **BAD screenshots include:**
- Generic placeholder images
- Mockup illustrations (unless explicitly labeled)
- Screenshots from OTHER apps
- Blurry/pixelated images
- Over 1MB file size

## Quick Start Commands

Run these commands for each project to build and deploy locally:

```bash
# For each project, repeat these steps:

git clone https://github.com/henrygoldsmith07-wq/arise.git
cd arise
bun install && bun run dev
# After dev starts, open http://localhost:5173 and take screenshot
# Save to: ../henry-builds/public/media/arise/screenshot.png
# Wait for dev server to finish, then Ctrl+C
```

Then move to next project...

## Verification

After capturing ALL 15 screenshots, run this command to verify:

```bash
cd henry-builds
bun run scripts/fix-media-assets.mjs
```

This will:
- ✅ Confirm all screenshot files exist
- ✅ Update case study metadata with capture dates
- ✅ Report which ones are missing
- ✅ Show file sizes for each asset

## Automation (Optional)

If you prefer programmatic capture after setting up Puppeteer:

```bash
# Install Puppeteer
bun add puppeteer --dev

# Run automated capture (you MUST update URLs first!)
bun run scripts/generate-product-screenshots.mjs
```

⚠️ **Important:** You must manually update the script with:
- Actual deployment URLs OR localhost addresses where apps are running
- Correct viewport settings per project
- This won't work with placeholder URLs!

## Expected Output

After completion, your media directory should look like:

```
public/media/
├── arise/
│   ├── screenshot.png    ← Real product UI
│   └── demo.webm         ← Optional video
├── pulse/
│   ├── screenshot.png    ← Real product UI (NEW!)
│   └── demo.webm
├── rapport/
│   ├── screenshot.png    ← Real product UI
│   └── demo.webm
...and so on for all 15 projects
```

## Timeline Estimate

Capturing 15 real screenshots manually should take approximately:
- **Build & launch each app:** 3-5 minutes × 15 = 45-75 minutes
- **Take screenshot:** 1 minute × 15 = 15 minutes
- **Verify & save:** 1 minute × 15 = 15 minutes
- **Total:** ~1.5 - 2 hours

With automation and pre-deployed apps: ~30 minutes

## Next Steps After Completion

Once all screenshots are captured and verified:

1. Commit changes:
   ```bash
   git add public/media/ registry/case-studies/*.json
   git commit -m "feat: Add real product screenshots for all projects"
   git push origin main
   ```

2. Vercel will auto-deploy with new images

3. Visit your live site to see actual product screenshots!

---

**Questions?** See `scripts/capture-real-screenshots.mjs` for detailed step-by-step instructions for each project.

**Remember:** Quality over quantity - ensure each screenshot clearly shows YOUR application's unique features and UI!
