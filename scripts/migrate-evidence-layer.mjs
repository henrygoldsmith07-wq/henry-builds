#!/usr/bin/env node
/**
 * One-shot content migration for the evidence-layer rollout (2026-08-21).
 * Idempotent — safe to re-run.
 */
import fs from "node:fs";
import path from "node:path";

const dir = path.join(process.cwd(), "registry/case-studies");

const LIMITATIONS = {
  arise: [
    "Progression prescriptions are backtested internally; they have never been compared against coach-written programmes.",
    "No training-outcome data exists — 'works' currently means the tests pass and loads compute, not that users got stronger.",
    "The 1–20 attribute curve is authored judgement, not fitted to data.",
  ],
  "daily-debate": [
    "Judge-scoring invariance is validated on synthetic transcripts; there is no inter-rater agreement study against human judges yet.",
    "Rate limiting is process-local; running multiple instances would need shared state the current design does not have.",
    "PvP assumes small trusted cohorts; anti-abuse beyond rate limits is thin.",
  ],
  reflect: [
    "No user study and no clinician review of the hedged language the pipeline produces.",
    "Bias-flag thresholds (confidence ≥ 0.45) are engineering choices, not clinically validated cut-offs.",
    "Longitudinal calibration assumes follow-up answers are self-reported honestly.",
  ],
  forq: [
    "Pantry confidence is user-entered, so recommendations inherit guessing rather than correcting it.",
    "Cost and nutrition figures come from authored recipe data, not retailer APIs — prices drift from reality.",
    "Single-household model; local-first storage means no multi-user conflict handling.",
  ],
  "le-studio-french": [
    "No learner-progress study exists; fluency improvement is not measured and is graded 'insufficient-evidence' in the ecosystem's evidence registry.",
    "Groq STT/TTS correction accuracy has never been benchmarked.",
    "The API key lives in localStorage by design for a private tool — not hardened for public deployment.",
  ],
  noticed: [
    "No external pentest; RLS isolation is exercised by the integration suite only.",
    "Invitation tokens are hashed but brute-force resistance is not load-tested.",
    "Two-person scope is a product decision, not an enforced guarantee — any household member sees everything.",
  ],
  rapport: [
    "No longitudinal field study — transfer from simulator practice to real conversations is asserted by the design, never measured.",
    "The human-rated evaluation pipeline holds zero external ratings so far.",
    "The safety gate is deterministic pattern matching; no third-party adversarial red-team has audited it.",
  ],
  revise: [
    "No external examiner blind study — marking agreement is measured against an internal double-marked corpus only.",
    "Short-answer formats only; maths/LaTeX equivalence checking is internal.",
    "FSRS scheduling ships library defaults; retention has never been studied inside the product.",
  ],
  rtk: [
    "The benchmark corpus is internally curated tool output; no independent corpus exists.",
    "LLM task-success was measured on narrow rtk-specific fixtures, not general agentic workflows.",
    "Redaction covers common secret shapes by construction; novel formats pass through.",
  ],
  pulse: [
    "Discovery is validated on synthetic planted-effect data; real-user datasets do not exist yet.",
    "The validation ledger is empty by design until months of real use accrue.",
    "Confounder control is proven against synthetic ground truth only.",
  ],
  "world-news": [
    "Free-tier API quotas capped freshness — country pages could be six hours stale by design.",
    "A strict Content-Security-Policy was abandoned because three.js cannot run under one.",
    "The source was removed during the 2026-08 ecosystem migration; no further verification of these claims is possible.",
  ],
  "agent-os-control-room": [
    "Never progressed past a prototype; the source was removed from the ecosystem during the 2026-08 migration and this write-up survives as provenance.",
  ],
  "dictation-typer": [
    "A personal utility, never hardened for distribution; its source was removed during the 2026-08 ecosystem migration.",
  ],
  "meeting-recorder": [
    "Built for personal meetings and never operated at scale; its source was removed during the 2026-08 ecosystem migration.",
  ],
};

const LAST_VERIFIED = {
  // CI ran green today against these codebases (see registry/ci-facts.json).
  arise: "2026-08-21",
  "daily-debate": "2026-08-21",
  reflect: "2026-08-21",
  habit: undefined,
  // Documented deep audits on 2026-08-09 (monorepo IMPROVEMENT_LOG runs 13–28).
  forq: "2026-08-09",
  "le-studio-french": "2026-08-09",
  noticed: "2026-08-09",
  rapport: "2026-08-09",
  revise: "2026-08-09",
  rtk: "2026-08-09",
  pulse: "2026-08-09",
  world_news: undefined,
};

const LEDGER_LINKS = {
  reflect: { outcomeIndex: 0, claimId: "emotion-tracker-reflection-quality" },
  rtk: { outcomeIndex: 0, claimId: "rtk-token-saving" },
};

// The four studies whose upstream vanished: archive them honestly.
const ARCHIVE = new Set(["world-news", "agent-os-control-room", "dictation-typer", "meeting-recorder"]);

for (const file of fs.readdirSync(dir).filter((f) => f.endsWith(".json")).sort()) {
  const full = path.join(dir, file);
  const project = JSON.parse(fs.readFileSync(full, "utf8"));
  const slug = project.slug;
  let changed = [];

  if (ARCHIVE.has(slug)) {
    if (project.stage !== "archived") {
      project.stage = "archived";
      changed.push("stage→archived");
    }
    if (project.featured) {
      project.featured = false;
      changed.push("unfeatured");
    }
    if (!project.caseStudy.limitations) {
      project.caseStudy.limitations = LIMITATIONS[slug];
      changed.push("limitations");
    }
    if (!project.caseStudy.lastVerifiedAt) {
      // No verification date is stated deliberately: the source is gone, so
      // nobody can check these claims anymore. The warning stays honest.
      changed.push("no lastVerifiedAt (source gone)");
    }
  } else {
    if (!project.caseStudy.limitations) {
      project.caseStudy.limitations = LIMITATIONS[slug];
      changed.push("limitations");
    }
    const verified = LAST_VERIFIED[slug];
    if (verified && !project.caseStudy.lastVerifiedAt) {
      project.caseStudy.lastVerifiedAt = verified;
      changed.push(`lastVerifiedAt=${verified}`);
    }
    const link = LEDGER_LINKS[slug];
    if (link && !project.caseStudy.outcomes[link.outcomeIndex].ledgerClaimId) {
      project.caseStudy.outcomes[link.outcomeIndex].ledgerClaimId = link.claimId;
      changed.push(`outcomes[${link.outcomeIndex}]→${link.claimId}`);
    }
    if (slug === "rtk") {
      for (const metric of project.caseStudy.metrics) {
        for (const ev of metric.evidence) {
          if (ev.kind === "benchmark" && !ev.capturedAt) {
            ev.capturedAt = "2026-08-09";
            changed.push(`capturedAt:${metric.label}`);
          }
        }
      }
      for (const [i, outcome] of project.caseStudy.outcomes.entries()) {
        for (const ev of outcome.evidence) {
          if (ev.kind === "benchmark" && !ev.capturedAt) {
            ev.capturedAt = "2026-08-09";
            changed.push(`capturedAt:outcome[${i}]`);
          }
        }
      }
      const archEv = project.caseStudy.architecture?.evidence ?? [];
      for (const ev of archEv) {
        if (ev.kind === "benchmark" && !ev.capturedAt) {
          ev.capturedAt = "2026-08-09";
          changed.push("capturedAt:architecture");
        }
      }
    }
  }

  if (changed.length) {
    fs.writeFileSync(full, `${JSON.stringify(project, null, 2)}\n`);
    console.log(`${slug}: ${changed.join(", ")}`);
  } else {
    console.log(`${slug}: no change`);
  }
}
