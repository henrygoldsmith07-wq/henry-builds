#!/usr/bin/env node
/**
 * Drafts case studies for upstream projects that don't have one yet, from the
 * repo's own README + collected facts. AI drafts are scaffolding, never
 * publishable: they land with `publish: false` and a publish gate that only a
 * human can clear, and every evidence path the model cites is verified against
 * the real repository before the draft is written.
 *
 *   NVIDIA_API_KEY=... node scripts/draft-case-study.mjs <upstreamId>
 *   node scripts/draft-case-study.mjs --list-missing
 *
 * Never overwrites an existing case study. The validator keeps drafts off the
 * site until a human authors them properly.
 */

import fs from "node:fs";
import path from "node:path";
import { chatJson } from "./lib/llm.mjs";
import { crossRepoReadable, pathExistsIn } from "./lib/github-paths.mjs";

const root = process.cwd();
const caseDir = path.join(root, "registry/case-studies");

const arg = process.argv[2];
const upstream = JSON.parse(fs.readFileSync(path.join(root, "registry/upstream.json"), "utf8"));
const statuses = JSON.parse(fs.readFileSync(path.join(root, "registry/source-status.json"), "utf8"));
const ciFacts = JSON.parse(fs.readFileSync(path.join(root, "registry/ci-facts.json"), "utf8"));
const factsFile = fs.existsSync(path.join(root, "registry/facts-history.json"))
  ? JSON.parse(fs.readFileSync(path.join(root, "registry/facts-history.json"), "utf8"))
  : { latest: {} };

const byId = new Map((upstream.entries ?? []).map((e) => [e.id, e]));

function existingSlugs() {
  return fs
    .readdirSync(caseDir)
    .filter((f) => f.endsWith(".json"))
    .map((f) => JSON.parse(fs.readFileSync(path.join(caseDir, f), "utf8")));
}

function missingIds() {
  const used = new Set(existingSlugs().map((s) => s.upstreamId));
  return (upstream.entries ?? [])
    .filter((e) => !used.has(e.id) && e.repo && e.kind === "product")
    .map((e) => e.id);
}

async function fetchReadme(repo) {
  // The dedicated readme endpoint resolves whatever the README is called and
  // honours auth (raw.githubusercontent rejects the HEAD ref).
  const res = await fetch(`https://api.github.com/repos/${repo}/readme`, {
    headers: {
      "user-agent": "henry-builds-draft",
      accept: "application/vnd.github.raw+json",
      ...(process.env.GITHUB_TOKEN
        ? { authorization: `Bearer ${process.env.GITHUB_TOKEN.trim()}` }
        : {}),
    },
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) return "";
  const text = await res.text();
  return text.slice(0, 12_000);
}

async function verifyPaths(cited, repo) {
  const verified = [];
  const dropped = [];
  for (const c of cited) {
    if (!c?.path) continue;
    try {
      if (await pathExistsIn(repo, "HEAD", c.path)) verified.push(c);
      else dropped.push(c.path);
    } catch {
      dropped.push(c.path);
    }
  }
  return { verified, dropped };
}

async function draft(id) {
  const entry = byId.get(id);
  if (!entry?.repo) {
    console.error(`draft-case-study: '${id}' has no repo to read`);
    process.exit(1);
  }

  const slug = id;
  const outFile = path.join(caseDir, `${slug}.json`);
  if (fs.existsSync(outFile)) {
    console.error(`draft-case-study: ${slug}.json already exists — never overwriting human work`);
    process.exit(1);
  }

  console.log(`draft-case-study: reading ${entry.repo}`);
  const readme = await fetchReadme(entry.repo);
  const facts = factsFile.latest?.[id] ?? {};
  const ci = ciFacts.facts?.[id] ?? {};
  const status = statusBySlugFor(id);

  if (!readme) {
    console.error(`draft-case-study: no README at ${entry.repo} — nothing to draft from`);
    process.exit(1);
  }

  const prompt = [
    {
      role: "system",
      content:
        "You draft portfolio case studies for an evidence-first site. Absolute rules: " +
        "(1) NEVER invent numbers, metrics, test counts or benchmarks — omit them entirely; " +
        "(2) every evidence item must cite a path that plausibly exists in the repository " +
        "(README.md, src/..., tests/..., package.json) — the paths are verified afterwards and " +
        "claims whose evidence fails verification are dropped; " +
        "(3) be conservative about what the project does: describe what the README documents, " +
        "not what a portfolio would like to say; " +
        "(4) limitations must be honest engineering limits, not marketing hedges. " +
        'Respond with a single JSON object: {"tagline": string (<=80 chars), "summary": string ' +
        "(<=280 chars), \"category\": string, \"tags\": string[3-5], \"problem\": string, " +
        '"approach": string, "authorship": {"built": string[2-6] (specific things the README ' +
        "shows were built), \"notBuilt\": string[] (libraries/services the README says it uses)}, " +
        '"outcomes": [{"statement": string, "evidence": ' +
        '[{"kind": "doc"|"repo", "label": string, "path": string}]}], "tradeoffs": ' +
        '[{"choice": string, "gained": string, "gaveUp": string}], "failedApproaches": [], ' +
        '"lessons": string[], "limitations": string[], "citedPaths": string[]}. ' +
        "outcomes: 2-4 statements of what verifiably holds. tradeoffs: 1-3. lessons: 1-3. " +
        "limitations: 2-4.",
    },
    {
      role: "user",
      content:
        `Project: ${entry.name} (${entry.description})\n` +
        `Repo: ${entry.repo}\n` +
        `Stack: ${entry.stack ?? "unknown"}\n` +
        `CI: latest run ${ci.conclusion ?? "unknown"}${
          ci.tests ? `, ${ci.tests.total} tests passing` : ""
        }\n` +
        `Deployment: ${facts.deploy?.state ?? "unknown"}${
          facts.deploy?.upToDate ? ", current with HEAD" : ""
        }\n` +
        `Source verified: ${status?.derived ?? "unknown"}\n\n` +
        `README:\n${readme}`,
    },
  ];

  console.log(`draft-case-study: drafting with the free pool...`);
  const result = await chatJson(prompt, { temperature: 0.3 });
  const draft_ = result.data;
  console.log(`draft-case-study: drafted by ${result.model}; verifying cited paths...`);

  const allCited = [
    ...(draft_.outcomes ?? []).flatMap((o) => o.evidence ?? []),
  ];
  const { verified, dropped } = await verifyPaths(allCited, entry.repo);
  if (dropped.length) {
    console.log(`draft-case-study: dropped ${dropped.length} unverifiable evidence path(s):`);
    dropped.forEach((p) => console.log(`  ✗ ${p}`));
    // Keep only outcomes whose every evidence item survived.
    draft_.outcomes = (draft_.outcomes ?? []).filter(
      (o) => (o.evidence ?? []).every((e) => !dropped.includes(e.path)),
    );
  }

  const project = {
    slug,
    upstreamId: id,
    name: entry.name,
    tagline: String(draft_.tagline ?? entry.description).slice(0, 90),
    summary: String(draft_.summary ?? entry.description).slice(0, 300),
    stage: "research",
    category: String(draft_.category ?? "Software"),
    tags: (draft_.tags ?? []).slice(0, 5).map(String),
    accent: "#dce9ec",
    featured: false,
    publish: false,
    publishGate:
      "AI-drafted scaffold — a human must author the narrative, verify every claim against the code, and earn a stage label before this publishes.",
    aiDraft: {
      model: result.model,
      provider: result.provider,
      draftedAt: new Date().toISOString(),
      evidenceVerified: verified.length,
      evidenceDropped: dropped.length,
    },
    authorship: {
      role: "DRAFT — authorship statement must be written by a human.",
      built: (draft_.authorship?.built ?? []).map(String),
      notBuilt: (draft_.authorship?.notBuilt ?? []).map(String),
    },
    repo: { label: entry.repo.split("/")[1], href: `https://github.com/${entry.repo}`, path: "." },
    caseStudy: {
      problem: String(draft_.problem ?? ""),
      approach: String(draft_.approach ?? ""),
      visuals: [
        {
          kind: "illustration",
          preview: "generic",
          alt: "Placeholder illustration — replace with a real capture.",
          caption: "Placeholder illustration. Not a screenshot — no capture of the running app exists yet.",
        },
      ],
      metrics: [],
      outcomes: (draft_.outcomes ?? []).map((o) => ({
        statement: String(o.statement ?? ""),
        evidence: (o.evidence ?? []).map((e) => ({
          kind: e.kind === "repo" ? "repo" : "doc",
          label: String(e.label ?? e.path),
          path: String(e.path),
          href: `https://github.com/${entry.repo}/blob/main/${String(e.path).replace(/^\.\//, "")}`,
        })),
      })),
      tradeoffs: (draft_.tradeoffs ?? []).map((t) => ({
        choice: String(t.choice ?? ""),
        gained: String(t.gained ?? ""),
        gaveUp: String(t.gaveUp ?? ""),
      })),
      failedApproaches: [],
      lessons: (draft_.lessons ?? []).map(String),
      limitations: (draft_.limitations ?? []).map(String),
      lastVerifiedAt: new Date().toISOString().slice(0, 10),
    },
  };

  fs.writeFileSync(outFile, `${JSON.stringify(project, null, 2)}\n`);
  console.log(
    `draft-case-study: wrote ${slug}.json (publish:false, ${verified.length} evidence paths verified)`,
  );
}

function statusBySlugFor(id) {
  const study = existingSlugs().find((s) => s.upstreamId === id);
  return study ? statuses.projects?.[study.slug] : undefined;
}

if (arg === "--list-missing") {
  const missing = missingIds();
  console.log(missing.length ? missing.join("\n") : "(no missing product case studies)");
} else if (arg) {
  if (!(await crossRepoReadable())) {
    console.error("draft-case-study: cross-repo GitHub reads unavailable (no usable token)");
    process.exit(1);
  }
  await draft(arg);
} else {
  console.error("usage: node scripts/draft-case-study.mjs <upstreamId | --list-missing>");
  process.exit(1);
}
