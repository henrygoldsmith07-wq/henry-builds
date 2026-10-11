/**
 * Reading measured counts out of a CI job log.
 *
 * This logic lived inline in `import-registry.mjs` and was wrong in a way that
 * nothing could catch: every pattern is `^`-anchored, but GitHub prefixes every
 * log line with an ISO timestamp and colourised runners wrap labels in ANSI
 * escapes. So no count was ever extracted, for any project, and
 * `registry/ci-facts.json` shipped without a single test figure while the
 * numbers sat in plain sight in the logs.
 *
 * It is a module now for one reason: a regex that cannot match its input is
 * indistinguishable from a repository that has no tests, and only a test can
 * tell those apart. `run-evidence-tests.mjs` drives the table below against
 * real captured log fragments.
 *
 * Nothing here guesses. If no pattern matches, the answer is `undefined` and
 * the site shows no number — a wrong figure on a site whose whole proposition
 * is that its numbers are checkable is worse than a missing one.
 */

/**
 * Strip the two decorations GitHub puts on every job log line.
 *
 *   1. An ISO timestamp prefix:
 *      `2026-10-09T19:59:33.0008989Z Tests  734 passed (734)`
 *   2. ANSI colour codes, which split the label:
 *      `\u001b[2m      Tests \u001b[22m\u001b[1m\u001b[32m734 passed\u001b[39m`
 *
 * This normalises the input; it does not relax the patterns. A log that matches
 * none of them still yields no count.
 */
export function normaliseLogText(text) {
  return String(text)
    .replace(/\u001b\[[0-9;]*m/g, "")
    .replace(/^\d{4}-\d{2}-\d{2}T[\d:.]+Z[ \t]?/gm, "");
}

/**
 * Runner summaries, most specific first.
 *
 * Each captures the total the runner reported, including skipped tests where
 * the runner prints it that way, because that is the number the runner itself
 * calls the total.
 */
export const TEST_PATTERNS = [
  // vitest: "Tests  412 passed (412)"
  /^\s*Tests\s+(\d+)\s+passed\s+\((\d+)\)/im,
  // vitest with skips or failures: "Tests  1808 passed | 3 skipped (1811)"
  /^\s*Tests\s+.*?\((\d+)\)\s*$/im,
  // node:test TAP summary: "# pass 37"
  /^#\s*pass\s+(\d+)/im,
  // jest: "Tests:       412 passed, 412 total"
  /^\s*Tests:\s+.*?(\d+)\s+total/im,
];

export const FILE_PATTERNS = [
  // vitest: "Test Files  29 passed (29)"
  /^\s*Test Files\s+\d+\s+passed\s+\((\d+)\)/im,
  /^\s*Test Files\s+.*?\((\d+)\s*\)$/im,
];

/** rtk's benchmark runner prints a strict final line: "benchmark cases: N". */
export const BENCHMARK_PATTERNS = [/^benchmark cases:\s*(\d+)\s*$/im];

/**
 * The first matching count, in pattern order.
 *
 * Used per job log, never across concatenated jobs — see `summariseJobs`.
 */
export function extractCount(text, patterns) {
  const normalised = normaliseLogText(text);
  for (const pattern of patterns) {
    const match = normalised.match(pattern);
    if (match) {
      const value = Number(match[match.length - 1]);
      if (Number.isFinite(value) && value > 0) return value;
    }
  }
  return undefined;
}

/**
 * The count from the last matching summary line, not the first.
 *
 * A single job can print more than one summary — a retry, or a suite run twice
 * against different configs. `arise`'s log contains `# tests 1537` and then
 * `# tests 1561`; the run ended having executed 1561, so the last one describes
 * the job.
 */
export function extractLastCount(text, patterns) {
  const normalised = normaliseLogText(text);
  let found;
  for (const pattern of patterns) {
    const flags = pattern.flags.includes("g") ? pattern.flags : `${pattern.flags}g`;
    for (const match of normalised.matchAll(new RegExp(pattern.source, flags))) {
      const value = Number(match[match.length - 1]);
      if (Number.isFinite(value) && value > 0) found = value;
    }
    if (found !== undefined) return found;
  }
  return undefined;
}

/** One job's reported suite, as the runner itself described it. */
export function jobFacts(text) {
  const tests = extractLastCount(text, TEST_PATTERNS);
  const files = extractLastCount(text, FILE_PATTERNS);
  const benchCases = extractLastCount(text, BENCHMARK_PATTERNS);
  if (!tests && !benchCases) return null;
  return { tests, files, benchCases };
}

/**
 * Combine per-job results into one figure for the run.
 *
 * Neither "first match" nor "sum everything" is right, and the real logs show
 * why:
 *
 *   - `daily-debate` runs the same 131-file suite in two jobs (verify reports
 *     115 passed | 16 skipped, e2e reports 130 passed | 1 skipped, both totalling
 *     1463). Summing would claim 2926 tests for one suite.
 *   - `emotion-tracker` runs three genuinely different suites — 68 files/714,
 *     7 files/75, 11 files/165. Taking the first would claim 75 when 954 ran.
 *
 * The file count distinguishes them: jobs reporting the same number of files
 * are the same suite and are counted once; jobs reporting different file counts
 * are different suites and are added. Summaries that carry no file count (TAP
 * output) cannot be compared that way, so the largest is taken — the run did at
 * least that many, and overstating is the error that matters here.
 *
 * `jobs` is recorded so a reader can see how many contributions there were and
 * check the arithmetic against the run.
 */
export function summariseJobs(jobResults) {
  const usable = jobResults.filter(Boolean);
  if (usable.length === 0) return null;

  const withFiles = usable.filter((job) => job.tests && job.files);
  const withoutFiles = usable.filter((job) => job.tests && !job.files);

  // Same file count ⇒ same suite, reported by more than one job.
  const byFileCount = new Map();
  for (const job of withFiles) {
    const existing = byFileCount.get(job.files);
    if (!existing || job.tests > existing.tests) byFileCount.set(job.files, job);
  }

  const totalTests =
    [...byFileCount.values()].reduce((sum, job) => sum + job.tests, 0) +
    withoutFiles.reduce((max, job) => Math.max(max, job.tests), 0);
  const totalFiles = [...byFileCount.keys()].reduce((sum, n) => sum + n, 0);
  const benchCases = usable.reduce(
    (max, job) => Math.max(max, job.benchCases ?? 0),
    0,
  );

  if (!totalTests && !benchCases) return null;

  return {
    ...(totalTests
      ? {
          tests: {
            total: totalTests,
            ...(totalFiles ? { files: totalFiles } : {}),
          },
        }
      : {}),
    ...(benchCases ? { benchmarks: { cases: benchCases } } : {}),
    jobs: usable.length,
    derivedFrom: "workflow job log",
  };
}

/**
 * Convenience for a single blob of log text — the shape used by tests and by
 * anything that has already concatenated a run's jobs.
 */
export function factsFromLog(text) {
  return summariseJobs([jobFacts(text)]);
}
