# henry-builds

Portfolio site for Henry Goldsmith. Vite + React 19 + React Router 7 + Tailwind 4.

The organising idea: **nothing appears on this site unless it points at something
checkable.** Project data is imported from a registry rather than hand-maintained,
every number states how it was measured, every claim carries an evidence link,
and the rules are enforced in CI rather than by discipline.

## How project data gets here

Seven layers, six of them generated:

| Path | Written by | Contents |
|---|---|---|
| `registry/upstream.json` | `registry:refresh` | Snapshot of `henrygoldsmith07-wq/Claude-Code:apps/registry.json` |
| `registry/evidence-ledger.json` | `registry:refresh` | Graded claims from the monorepo's `evidence/registry.json` — status, sample size, last-validated date and limitations per capability |
| `registry/source-status.json` | `registry:refresh` | Per project: current vs archived-source, why, and the commit SHA the source sits at right now |
| `registry/ci-facts.json` | `registry:refresh:ci` | Latest workflow conclusion per app, the last green run, and test counts pulled from Actions artifacts or job logs |
| `registry/facts-history.json` | `registry:refresh` | Per project: deployment state and deployed SHA vs HEAD, latest release/tag, Dependabot alerts — plus a dated history powering trend charts |
| `registry/bundle-history.json` | `record:bundle` | This site's own dist weight over time; warns past 10% growth |
| `registry/case-studies/*.json` | a human | Narrative, architecture, trade-offs, evidence |

`src/data/registry/index.ts` merges the generated project facts and exports typed projects. Adding a
project is adding one file to `registry/case-studies/`; the archive page, sitemap,
OG card, accessibility suite and link check all pick it up automatically.

Generated files are never edited by hand. `registry:refresh` is the canonical
orchestrator: it imports upstream/evidence/source truth, reconciles archive state
and records operational history. `registry:refresh:ci` also refreshes Actions facts.

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
- **concept / historical** — human declarations (`sourceState` in the case
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
bun run build                  # regenerates OG/sitemap, builds, then emits route HTML

bun run registry:refresh       # canonical upstream/evidence/source/facts refresh
bun run registry:refresh:ci    # ...and pull CI facts
bun run registry:import        # lower-level upstream/evidence/source importer
bun run registry:import:ci     # lower-level importer including CI facts
bun run registry:facts         # refresh deployment/release/security history
bun run registry:freshness     # reject generated truth older than the CI allowance
bun run verify:sources         # every cited repo path must exist, before publishing
bun run registry:validate      # enforce every rule above
bun run record:bundle          # record built JS/CSS weight into bundle history
bun run route-html             # after Vite: emit crawler-visible HTML per public route

bun run audit:claims           # ban self-ratings and unfalsifiable superlatives
bun run test:evidence           # regression-test the evidence gates themselves
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
- **stale generated files** — freshness checks reject old registry/evidence/facts
  snapshots, and the build regenerates OG cards + sitemap; committed output must
  match the registry.
- **accessibility** — axe over every published route in light and dark. Serious
  and critical violations fail. The suite asserts the app actually rendered
  first, because an empty page has no violations.
- **visual regression** — desktop and mobile, both colour schemes.
- **Lighthouse budgets** — see `lighthouserc.json`.

`registry-sync.yml` refreshes the generated evidence layer daily at 06:20 UTC
and can be dispatched manually. Generated-only refreshes land directly; anything
touching authored narrative opens a PR. A strict two-day freshness gate makes a
dead token or broken collector fail visibly instead of leaving old facts labelled
current. `deploy-monitor.yml` probes the live site every six hours and also raises
its alarm when evidence facts go stale; the combined issue closes itself on recovery.

## Configuration

| Variable | Where | Purpose |
|---|---|---|
| `SITE_URL` / `VITE_SITE_URL` | optional env | Overrides the build-time origin for sitemap URLs and OG images. Defaults to the production alias (`https://henry-builds.vercel.app`, see `PRODUCTION_ORIGIN` in `generate-sitemap.mjs`) so deploys without variables stay correct; `ALLOW_RELATIVE_SITEMAP=1` opts out locally. |
| `REGISTRY_TOKEN` | repo secret | PAT with Contents/Actions read access to every sibling repo the portfolio cites. A classic token needs `repo` if any cited repo is private; public-only portfolios can use `public_repo`. Without it cross-repo checks degrade loudly instead of pretending stale data is current. Scheduled sync fails on an unusable token, and deploy-monitor alarms if the facts stop refreshing. |
| `VITE_VLY_PARENT_ORIGIN` | optional editor env | Explicitly allow one parent origin for the Vly preview route bridge. Without it, only Vly/Freebuff parent hosts from the document referrer are accepted. |

The portfolio has no application backend or account surface.

## Crawler-visible routes and OG cards

`scripts/generate-og.mjs` renders one PNG per published project into `public/og/`.
PNG rather than SVG on purpose — most crawlers will not render an SVG OG image.

After Vite builds, `scripts/generate-route-html.mjs` turns the built `index.html`
into a small static entry for every public route. The React app still hydrates
normally, but a crawler that never executes JavaScript now receives the correct
title, description, canonical URL, OpenGraph/Twitter card and structured data
for `/projects` and each case study. It also emits a noindex `404.html`.

All generated surfaces use the same publication gate as the runtime registry:
an authored `publish: false` study becomes public when its upstream lifecycle
moves to `active` or `maintenance`. `check:route-html` enforces that no
published project can have a page without crawler metadata, and no gated project
can leak a static route.

## Deployment

Vercel, config in `vercel.json`. The build origin defaults to the production
alias; set `SITE_URL` in the Vercel project (and/or repo variables) only if the
domain moves.
