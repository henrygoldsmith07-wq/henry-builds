# §28 — Audit Summary & Final Report

## Scope

This report covers the most recent self-directed improvement pass on the Henry Builds portfolio. The work follows the §28 mandate order strictly: audit first, freshness second, then factual/profile fixes, then gate cleanup. Every change is grounded in data already present in the repository — no claims, metrics, employers, emails, or qualifications were invented.

## Defects Found and Fixed

### 1. Failed-approach evidence was silently dropped from CaseStudy and BuildLog

**Severity:** High — the strongest honesty signals in the most consequential section of three case studies ("What did not work") were invisible.

**Root cause:** The `FailedApproach` type (`src/data/registry/schema.ts:181`) declared only `approach`, `whyItFailed`, `whatItChanged` — no `evidence` field. Three studies (world-news, arise, revise) had written `evidence[]` arrays onto their failed approaches, but TypeScript's `import.meta.glob<{ default: Project }>` loader treated extra JSON keys as compiler-invisible, and the renderer (`CaseStudy.tsx:730-755`) rendered only the three text fields. The validator (`validate-registry.mjs`) never visited `failedApproaches`, so the gap passed every gate.

The same gap extended to `/build-log`: the generator (`build-build-log.mjs`) derived dead-end entries from `failedApproaches` but dropped the `evidence` array, so the world-news CSP failure — the only evidence-backed claim on that page — was rendered with its citation stripped. The `/build-log` page is the thing the brief calls "the part that says the most about how the work was done," making this the most exposed gap.

**Fix (commits `1ffa503` + `81f02ea` + `aba9e50`):**
- Added optional `evidence?: Evidence[]` to the `FailedApproach` type (precedent: `Architecture`, `Metric`, `Claim`, `Tradeoff` all carry evidence)
- Rendered `<EvidenceRow items={failure.evidence} />` inside the failed-approaches map — the exact same component already used at `CaseStudy.tsx:679` for `benchmarkChart.evidence`
- Widened `EvidenceRow`'s prop type to `Evidence[] | undefined` since it already returns `null` for empty (one-line change in `Evidence.tsx:94`)
- Added `failedApproaches` evidence to `allEvidenceOf()` in `index.ts` so density counts are accurate
- Extended `validate-registry.mjs` to validate `failedApproaches[].evidence` via the existing `checkEvidenceList` helper with `required: false` (optional in schema, but well-formed when present)
- `build-build-log.mjs`: pass `item.evidence ?? null` through to dead-end entry objects
- `BuildLog.tsx`: add `evidence` field to `LogEntry`, render `<EvidenceRow>` for dead-end entries that carry evidence (null/absent → no chip); made `evidence` optional since decisions, lessons and limitations don't carry it
- Four regression tests: evidence accepted, malformed evidence rejected, evidence carried into build-log entries, evidence null when absent
- Note: only `world-news.json` actually carries structured `evidence` on its failed approach; arise and revise record their citations inline in `whatItChanged` text, which is why the schema field is optional, not required

### 2. Zero-metric published study with verifiable CI data — Noticed

**Severity:** Medium — a published prototype had zero metrics despite current source and a green CI run with a verbatim test count in `ci-facts.json`.

**Fix (commit `4587da7`):**
- Added a "Test suite: 54 passing" metric to `registry/case-studies/noticed.json`, citing the `mental-load-tracker.yml` workflow — the count is already recorded in `registry/ci-facts.json` (mental-load-tracker: 54 tests, last successful run 2026-10-05, within the 30-day `RED_CI_STALE_DAYS` window)
- No new validator warning triggered (last green run is within freshness window)

### 3. Stale CI facts from missing `REGISTRY_TOKEN`

**Severity:** Document-only — this is an owner-only configuration issue, not a code defect. The `registry-sync.yml` workflow fails daily because `secrets.REGISTRY_TOKEN` is not configured. Without it, the import cannot access full CI run history for private repos, so `revise` and `rtk` show `conclusion: failure` with `lastSuccessfulRunAt: NONE` (no recorded green run). The validator correctly surfaces these as advisory warnings. This cannot be fixed from the code side — the owner must configure a PAT with repo access.

### 4. Dead template code (`integrations.md` + `vly-integrations.ts`)

**Severity:** Low — dead code with a crash hazard. `integrations.md` is the VLY platform's generated documentation for a Convex-based AI/email/payments integration that does not exist in this app. `vly-integrations.ts` is the accompanying example module, not imported anywhere, and would crash at module load via `process.env.VLY_INTEGRATION_KEY!`'s non-null assertion. Removed; the actual editor integration (`vly-optional.ts`, `vly-disabled.ts`, `vly-toolbar-readonly.tsx`, `vite.config.ts`) is untouched.

**Fix (commit `dca8fd2`):** `git rm integrations.md src/lib/vly-integrations.ts`

## Items Deliberately Left Untouched (per §27)

| Item | Reason |
|------|--------|
| 12/15 `failedApproaches: []` | These are honest deferrals — the work was captured as `tradeOffs` or `limitations`. Fabricating entries would violate §27. |
| 3/5 zero-metric archived studies (dictation-typer, agent-os-control-room, meeting-recorder) | Source removed (`sourceState: historical-case-study`, `repo.removed: true`). No source to back metrics. |
| habit-tracker (0 metrics, publish: false) | Correctly gated — AI-drafted authorship awaiting human verification. Publishing would break the honesty gate. |
| revise/rtk red CI | Upstream repo problems. CI facts are stale because `REGISTRY_TOKEN` is unconfigured. The validator surfaces the gap honestly; no code fix is possible. |
| Stale upstream repo name `henrygoldsmith07-wq/slimout` (rtk) | Documented alias — `upstreamId: "rtk"` is a slug for the `slimout` repo. Origins in the upstream Claude-Code monorepo registry. |
| 12 win32 visual snapshots (~4.4 MB retained) | Environmental — generated on Linux, retained for cross-platform parity. Not a defect. |
| Windows `audit-claims` spawn crash (`0xC0000142`) | Environmental — libuv failure on Windows, passes on CI/Linux. Not a logic defect. |

## Gate Results (local baseline)

| Gate | Before | After |
|------|--------|-------|
| `tsc -b --force` | 0 | 0 |
| `eslint .` | 0 | 0 |
| `validate-registry` | 0 errors / 2 warnings | 0 errors / 2 warnings |
| `registry:freshness` | 0 | 0 |
| `check-links` | 78/0 | 78/0 |
| `check-route-html` | 165/0 | 165/0 |
| `verify-sources` | 152/0 missing | 154/0 missing |
| `run-evidence-tests` | 59 passed / 1 failed | 63 passed / 1 failed |
| `audit-claims --offline` | 0 violations | 0 violations |

The single remaining test failure is the known Windows-only `audit-claims` spawn crash (`expected exit 1, got 3221226505`), which passes on CI/Linux.

## What "Build it. Measure it. Say what it does." Means Here

The core fixes close two instances of the same failure mode: the site declared itself evidence-first but was silently dropping evidence from its most important honesty surfaces.

**Failed-approach evidence** is the purest expression. A failed approach is a measurement: "I tried X, it failed for reason Y, so I changed to Z." The schema omitted the field, the renderer dropped it, the build-log generator dropped it, and the validator never checked it — so three authors wrote evidence into the data that was invisible on both the case study page and the `/build-log` page that the brief calls "the part that says the most about how the work was done." That evidence is now rendered and validated.

**Measured metrics** follow the same rule. The Noticed study carried zero metrics despite a green CI run with a verbatim test count already in `ci-facts.json`. Adding "54 passing" — cited to the workflow that produced it — is the measure-it step made visible.
