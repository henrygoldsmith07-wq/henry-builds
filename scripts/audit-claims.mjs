#!/usr/bin/env node
/**
 * Fails the build on public copy that cannot be backed up.
 *
 * Deleting a "10/10" once is not a fix — it comes back the next time someone
 * writes copy. This is the fix: the patterns are banned in CI, so the site
 * cannot regress into self-rating or unqualified superlatives.
 *
 * Scans user-facing copy only: registry case studies, the profile, and the
 * portfolio components/pages. Not source comments, not this file.
 */

import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const TARGETS = [
  "registry/case-studies",
  "src/data/profile.ts",
  "src/pages/Landing.tsx",
  "src/pages/Projects.tsx",
  "src/pages/CaseStudy.tsx",
  "src/components/portfolio",
  "index.html",
];

const RULES = [
  {
    id: "self-rating",
    // "10/10", "9.5/10", "8 out of 10", "rated 10/10".
    // The lookahead spares genuine progress counters ("6 / 10 complete"),
    // which are a count of things done, not a score awarded to the work.
    pattern:
      /\b\d{1,2}(?:\.\d)?\s*(?:\/|out of)\s*10\b(?!\s*(?:complete|completed|done|correct|lessons?|units?|questions?|steps?|tasks?|topics?|cards?|marks?))/gi,
    message: "self-rating — a score you gave yourself is not evidence",
  },
  {
    id: "star-rating",
    pattern: /\b\d(?:\.\d)?\s*(?:\/|out of)\s*5\s*stars?\b/gi,
    message: "self-awarded star rating",
  },
  {
    id: "superlative",
    pattern:
      /\b(?:world[- ]class|best[- ]in[- ]class|state[- ]of[- ]the[- ]art|cutting[- ]edge|industry[- ]leading|revolutionary|game[- ]chang(?:er|ing)|unparalleled|flawless|perfect(?:ly)? (?:built|engineered|designed))\b/gi,
    message: "unfalsifiable superlative",
  },
  {
    id: "production-ready",
    pattern: /\b(?:production[- ]ready|enterprise[- ]grade|battle[- ]tested|bulletproof)\b/gi,
    message: "maturity claim that the stage label should be making instead",
  },
  {
    id: "vague-scale",
    pattern: /\b(?:thousands|millions|countless|numerous) of (?:users|people|customers|downloads)\b/gi,
    message: "usage claim with no measurement behind it",
  },
];

/** Copy that is quoting a banned phrase in order to reject it. */
const ALLOW = [/never (?:a|an)? ?"/i, /\brejected\b/i, /\bbanned\b/i];

let violations = 0;
let filesScanned = 0;

function scanFile(file) {
  const text = fs.readFileSync(file, "utf8");
  const relative = path.relative(root, file);
  filesScanned++;

  const lines = text.split("\n");

  for (const rule of RULES) {
    rule.pattern.lastIndex = 0;
    let match;
    while ((match = rule.pattern.exec(text)) !== null) {
      const upto = text.slice(0, match.index);
      const lineNumber = upto.split("\n").length;
      const line = lines[lineNumber - 1] ?? "";

      if (ALLOW.some((allowed) => allowed.test(line))) continue;

      console.error(
        `✗ ${relative}:${lineNumber}  [${rule.id}] ${rule.message}\n` +
          `    "${match[0]}"  in: ${line.trim().slice(0, 120)}`,
      );
      violations++;
    }
  }
}

function walk(target) {
  const full = path.join(root, target);
  if (!fs.existsSync(full)) return;

  const stat = fs.statSync(full);
  if (stat.isFile()) {
    scanFile(full);
    return;
  }

  for (const entry of fs.readdirSync(full)) {
    walk(path.join(target, entry));
  }
}

TARGETS.forEach(walk);

console.log(
  `audit-claims: scanned ${filesScanned} files, ${violations} violation(s) across ${RULES.length} rules`,
);

if (violations > 0) {
  console.error(
    "\nRewrite the copy so the claim is either measurable or dropped. " +
      "Stage labels and evidence links carry this weight instead.",
  );
  process.exit(1);
}
