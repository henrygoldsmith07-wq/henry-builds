# henry-builds

Portfolio site for Henry Goldsmith. Vite + React 19 + React Router 7 + Tailwind 4.

The organising idea: **nothing appears on this site unless it points at something
checkable.** Project data is imported from a registry rather than hand-maintained,
every number states how it was measured, every claim carries an evidence link,
and the rules are enforced in CI rather than by discipline.

## How project data gets here

Five layers, four of them generated:

| Path | Written by | Contents |
|---|---|---|
| `registry/upstream.json` | `registry:import` | Snapshot of `henrygoldsmith07-wq/Claude-Code:apps/registry.json` |
| `registry/evidence-ledger.json` | `registry:import` | Graded claims from the monorepo's `evidence/registry.json` — status, sample size, last-validated date and limitations per capability |
| `registry/source-status.json` | `registry:import` | Per project: current vs archived-source, why, and the commit SHA the source sits at right now |
| `registry/ci-facts.json` | `registry:import:ci` | Latest workflow conclusion per app, the last green run, and test counts pulled from Actions artifacts or job logs |
| `registry/facts-history.json` | `registry:facts` | Per project: deployment state and deployed SHA vs HEAD, latest release/tag, Dependabot alerts — plus a dated history powering trend charts |
| `registry/bundle-history.json` | `record:bundle` | This site's own dist weight over time; warns past 10% growth |
| `registry/case-studies/*.json` | a human | Narrative, architecture, trade-offs, evidence |

`src/data/registry/index.ts` merges all five and exports typed projects. Adding a
project is adding one file to `registry/case-studies/`; the archive page, sitemap,
OG card, accessibility suite and link check all pick it up automatically.

Generated files are never edited by hand — the importer overwrites them.

### The evidence layer

The portfolio is the reading surface for the ecosystem's
[evidence registry](https://github.com/henrygoldsmith07-wq/Claude-Code/blob/main/evidence/registry.json),
which grades every capability claim from `insufficient-evidence` to
`externally-validated`. That grading is enforced here, not just displayed:

- An outcome linked with `ledgerClaimId` renders its **grade, sample size and
  last-validated date** straight from the ledger.
- A case study that claims a capability whose grade is `insufficient-evidence`
  **fails validation** — link a passing claim or rewrite the copy.
- Every case study must state its `limitations` (rendered as "What this does not
  prove", next to the claims they bound) and a `lastVerifiedAt` date.
- Evidence that rots (screenshots, videos, benchmarks) carries `capturedAt`;
  captures older than 90 days fail validation, and `expiresAt` sets an explicit
  shelf life.
- Citing CI evidence when the importer found no workflow **fails** in
  authenticated mode — empty facts are treated as a broken promise, not shrunk
  from.
- Citing CI evidence while the latest upstream run failed draws a validator
  warning once the last green run is older than 30 days (or none exists), so
  stale-green claims surface where someone is editing copy.

### Source truth and automatic archiving

Every case study is checked against what actually exists on each import:

- **current** — the upstream entry exists and its repo/path resolves; the page
  shows the exact commit SHA checked.
- **archived-source** — the entry was removed upstream or its source is gone.
  The study is kept as provenance, auto-labelled `Archived source`, demoted from
  featured, forced to `stage: archived`, and excluded from publish gates.
- **concept / historical** — human declarations (`sourceStatus` in the case
  study) the derivation never overwrites.

`verify:sources` additionally resolves **every** cited path — evidence `path`
fields, architecture layers, GitHub blob/tree hrefs — against the repository
that owns it today (standalone repos after the 2026-08 migration), and fails if
anything is missing.

### Publish gating

A case study with `"publish": false` is carried in the registry but rendered
nowhere. It publishes itself once the upstream registry promotes it out of
`incubating`. This is how Pulse reaches the site: nothing to remember, and
`registry:validate` reports every gate that has opened.

### Stage labels are earned, not chosen

`registry:validate` refuses a label the evidence does not support:

| Stage | Requires |
|---|---|
| `shipped` | a `liveUrl` **and** a `live` evidence item |
| `beta` | at least one `ci` evidence item |
| `prototype` | at least one `repo` evidence item |
| `research` | at least one evidence item of any kind |
| `archived` | the upstream lifecycle to be archived or superseded |

It also enforces: every claim has non-empty evidence, every metric states a
specific measurement method, every trade-off names what was given up, an
illustration's caption says it is not a screenshot, and 5–6 projects are
featured. It reports content gaps on featured work (missing screenshots, videos,
failed approaches, lessons) without failing — those need source material, not a
code change.

## Scripts

```bash
bun run dev                    # dev server
bun run build                  # regenerates OG cards + sitemap, then builds

bun run registry:import        # re-import upstream registry + evidence ledger + source status
bun run registry:import:ci     # ...and pull CI facts (needs a token for counts)
bun run verify:sources         # every cited repo path must exist, before publishing
bun run registry:validate      # enforce every rule above

bun run audit:claims           # ban self-ratings and unfalsifiable superlatives
bun run check:links            # internal assets, sitemap, built output
bun run check:links:external   # also HEAD every external evidence link
bun run check:links:github     # also verify GitHub blob/tree paths exist in their repos

bun run test:a11y              # axe over every published route, light and dark
bun run test:visual            # visual regression
bun run test:visual:update     # accept new baselines
bun run lighthouse             # performance/a11y/best-practices/SEO budgets

bun run verify                 # everything CI runs, in order
```

### Capturing real product evidence

When an app deployment is publicly reachable:

```bash
node scripts/capture-evidence.mjs <slug> <url>   # screenshot + ~8s demo.webm into public/media/<slug>/
```

The script refuses auth walls (a protected Vercel deployment serves its login
page with a 200 — capturing that would be evidence of nothing). Then set the
`capturedAt` stamp and swap the illustration for the real capture in the case
study.

## What CI enforces

`ci.yml` on every push and PR:

- **registry + claims** — evidence rules, stage rules, and a ban on `10/10`-style
  self-ratings, `world-class`, `production-ready` and unmeasured usage claims.
  Deleting a bad phrase once is not a fix; the pattern is banned so it cannot
  come back.
- **types, lint, build**
- **links** — internal assets, sitemap coverage (including that unpublished
  projects do *not* leak into it), and that built output references only emitted
  assets.
- **stale generated files** — the build regenerates OG cards and the sitemap; if
  they differ from what is committed, the repo is out of date with the registry.
- **accessibility** — axe over every published route in light and dark. Serious
  and critical violations fail. The suite asserts the app actually rendered
  first, because an empty page has no violations.
- **visual regression** — desktop and mobile, both colour schemes.
- **Lighthouse budgets** — see `lighthouserc.json`.

`registry-sync.yml` re-imports on every push to main and weekly (generated
refreshes land directly; anything touching narrative opens a PR), so CI facts,
lifecycle states, deployment status, commit SHAs and archive decisions stay
current without anyone remembering. Its health gate fails the job when the
import ran without usable repository access, so degradation cannot hide behind
a green run. `deploy-monitor.yml` probes the live site every six hours and also
raises its alarm when evidence facts go stale; one issue covers both, and it
closes itself on recovery.

## Configuration

| Variable | Where | Purpose |
|---|---|---|
| `SITE_URL` / `VITE_SITE_URL` | optional env | Overrides the build-time origin for sitemap URLs and OG images. Defaults to the production alias (`https://henry-builds.vercel.app`, see `PRODUCTION_ORIGIN` in `generate-sitemap.mjs`) so deploys without variables stay correct; `ALLOW_RELATIVE_SITEMAP=1` opts out locally. |
| `REGISTRY_TOKEN` | repo secret | PAT with read access to the sibling repos (`public_repo` is enough). Without it every cross-repo gate — source verification, GitHub path link checks, CI-facts refresh — **skips loudly** instead of enforcing, because the built-in `GITHUB_TOKEN` cannot read repositories other than its own and anonymous runner calls are rate-limited. In scheduled sync an unusable token now **fails the job** instead of passing silently, and deploy-monitor raises its alarm when facts go stale. |
| `VITE_CONVEX_URL` | deploy env | Optional. Enables `/auth` and `/dashboard`. The public site does not use it. |

The public portfolio has no backend. `VITE_CONVEX_URL` being absent switches
sign-in off and leaves everything else working.

## OG cards

`scripts/generate-og.mjs` renders one PNG per published project into `public/og/`.
PNG rather than SVG on purpose — most crawlers will not render an SVG OG image.

## Deployment

Vercel, config in `vercel.json`. The build origin defaults to the production
alias; set `SITE_URL` in the Vercel project (and/or repo variables) only if the
domain moves.
