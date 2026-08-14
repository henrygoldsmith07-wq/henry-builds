#!/usr/bin/env node
/**
 * Renders OpenGraph cards to public/og/*.png — one per published project plus a
 * default.
 *
 * PNG, not SVG, on purpose: most crawlers (including Facebook, LinkedIn and
 * Slack) will not render an SVG OG image, so the site previously had cards that
 * silently did nothing.
 *
 * Run: node scripts/generate-og.mjs
 */

import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const root = process.cwd();
const outDir = path.join(root, "public/og");
const caseStudyDir = path.join(root, "registry/case-studies");

const WIDTH = 1200;
const HEIGHT = 630;

const STAGE_COLOUR = {
  shipped: "#2f7d4f",
  beta: "#3a6ea8",
  prototype: "#a8722f",
  research: "#6b6b66",
  archived: "#6b6b66",
};

/** XML-escape, so a stray ampersand in a tagline cannot corrupt the SVG. */
function esc(text) {
  return String(text).replace(
    /[&<>"']/g,
    (char) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" })[char],
  );
}

/**
 * Greedy wrap at an approximate glyph width. Good enough for a card, and avoids
 * pulling in a text-measurement dependency.
 */
function wrap(text, maxChars, maxLines) {
  const words = String(text).split(/\s+/);
  const lines = [];
  let line = "";

  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (candidate.length > maxChars && line) {
      lines.push(line);
      line = word;
      if (lines.length === maxLines) break;
    } else {
      line = candidate;
    }
  }
  if (line && lines.length < maxLines) lines.push(line);
  if (lines.length === maxLines && words.join(" ").length > lines.join(" ").length) {
    lines[maxLines - 1] = `${lines[maxLines - 1].replace(/[.,;:]$/, "")}…`;
  }
  return lines;
}

function card({ eyebrow, title, subtitle, stage, footer }) {
  const titleLines = wrap(title, 22, 3);
  const subtitleLines = subtitle ? wrap(subtitle, 58, 2) : [];
  const titleSize = titleLines.length >= 3 ? 78 : 94;

  const stageColour = STAGE_COLOUR[stage] ?? "#6b6b66";

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">
  <rect width="${WIDTH}" height="${HEIGHT}" fill="#f7f6f2"/>
  <g stroke="#e3e1da" stroke-width="1">
    ${Array.from({ length: 11 }, (_, i) => `<line x1="${i * 120}" y1="0" x2="${i * 120}" y2="${HEIGHT}"/>`).join("")}
  </g>
  <rect x="0" y="0" width="${WIDTH}" height="8" fill="#171817"/>

  <text x="80" y="132" font-family="Helvetica, Arial, sans-serif" font-size="22" font-weight="700"
        letter-spacing="4" fill="#8a8880">${esc(eyebrow.toUpperCase())}</text>

  ${
    stage
      ? `<g transform="translate(80, 168)">
           <rect x="0" y="0" rx="16" ry="16" width="${18 + stage.length * 13}" height="34" fill="none" stroke="${stageColour}" stroke-width="2"/>
           <circle cx="18" cy="17" r="4" fill="${stageColour}"/>
           <text x="30" y="23" font-family="Helvetica, Arial, sans-serif" font-size="16" font-weight="700"
                 letter-spacing="2" fill="${stageColour}">${esc(stage.toUpperCase())}</text>
         </g>`
      : ""
  }

  ${titleLines
    .map(
      (line, i) =>
        `<text x="80" y="${(stage ? 300 : 266) + i * (titleSize + 8)}" font-family="Helvetica, Arial, sans-serif"
               font-size="${titleSize}" font-weight="700" letter-spacing="-4" fill="#171817">${esc(line)}</text>`,
    )
    .join("\n  ")}

  ${subtitleLines
    .map(
      (line, i) =>
        `<text x="80" y="${HEIGHT - 132 + i * 34}" font-family="Helvetica, Arial, sans-serif"
               font-size="26" fill="#6b6961">${esc(line)}</text>`,
    )
    .join("\n  ")}

  <line x1="80" y1="${HEIGHT - 76}" x2="${WIDTH - 80}" y2="${HEIGHT - 76}" stroke="#d9d7cf" stroke-width="1"/>
  <text x="80" y="${HEIGHT - 40}" font-family="Helvetica, Arial, sans-serif" font-size="20"
        letter-spacing="2" fill="#8a8880">${esc(footer)}</text>
</svg>`;
}

async function render(name, svg) {
  const file = path.join(outDir, `${name}.png`);
  await sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toFile(file);
  const { size } = fs.statSync(file);
  console.log(`  ${name}.png  ${(size / 1024).toFixed(1)} kB`);
}

async function main() {
  fs.mkdirSync(outDir, { recursive: true });

  const files = fs.existsSync(caseStudyDir)
    ? fs.readdirSync(caseStudyDir).filter((f) => f.endsWith(".json"))
    : [];

  console.log(`generate-og: rendering ${files.length + 2} cards`);

  await render(
    "default",
    card({
      eyebrow: "Henry Goldsmith",
      title: "Build it. Measure it. Say what it does.",
      subtitle:
        "Projects with a stage label, the numbers behind them, and a link to the source.",
      footer: "henry-builds",
    }),
  );

  await render(
    "projects",
    card({
      eyebrow: "All work",
      title: "Everything, including what isn't finished.",
      subtitle: "Every project in the registry, each with an honest stage label.",
      footer: "henry-builds/projects",
    }),
  );

  for (const file of files) {
    const project = JSON.parse(fs.readFileSync(path.join(caseStudyDir, file), "utf8"));
    if (project.publish === false) continue;

    await render(
      project.slug,
      card({
        eyebrow: project.category,
        title: project.name,
        subtitle: project.tagline,
        stage: project.stage,
        footer: `henry-builds/projects/${project.slug}`,
      }),
    );
  }
}

main().catch((error) => {
  console.error(`generate-og: ${error.message}`);
  process.exit(1);
});
