/**
 * Shared GitHub path-resolution for the evidence pipeline.
 *
 * A case study points at files (`path` fields) and at GitHub URLs. After the
 * 2026-08 migration every product lives in its own repository while old
 * evidence still says `apps/<id>/...` inside Claude-Code. This module maps a
 * claimed location to the repo/ref/path triple that should exist today, and
 * checks it against the repo's real git tree.
 */

export const MONOREPO = "henrygoldsmith07-wq/Claude-Code";
const API = "https://api.github.com";

const token = process.env.GITHUB_TOKEN ?? process.env.GH_TOKEN ?? "";

function headers(withAuth = true) {
  const h = { "user-agent": "henry-builds-evidence-check" };
  if (token && withAuth) h.authorization = `Bearer ${token}`;
  return h;
}

async function api(url) {
  let res = await fetch(url, { headers: headers(), signal: AbortSignal.timeout(30_000) });
  // A repo-scoped GITHUB_TOKEN gets 404 (not 401) for repositories outside
  // its scope, even public ones. Retry anonymously — public data is readable.
  if ((res.status === 404 || res.status === 403) && token) {
    res = await fetch(url, { headers: headers(false), signal: AbortSignal.timeout(30_000) });
  }
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} for ${url}`);
  return res.json();
}

async function rawFetch(url, timeoutMs = 60_000) {
  let res = await fetch(url, { headers: headers(), signal: AbortSignal.timeout(timeoutMs) });
  if ((res.status === 404 || res.status === 403) && token) {
    res = await fetch(url, { headers: headers(false), signal: AbortSignal.timeout(timeoutMs) });
  }
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} fetching ${url}`);
  return res;
}

/** Paths that genuinely still live at the monorepo root, even post-migration. */
const MONOREPO_ROOTS = ["apps/", "packages/", "vendor/", "evidence/", "config/"];
/** Bare files that live at the monorepo root. */
const MONOREPO_ROOT_FILES = new Set(["IMPROVEMENT_LOG.md"]);

export function resolveLocation(claimedPath, upstream) {
  if (!claimedPath) return { repo: MONOREPO, ref: "main", path: claimedPath };
  if (MONOREPO_ROOT_FILES.has(claimedPath)) {
    return { repo: MONOREPO, ref: "main", path: claimedPath };
  }

  if (upstream?.repo) {
    // App-owned subpaths moved verbatim into the standalone repo.
    const appPrefix = `apps/${upstream.id}/`;
    if (claimedPath.startsWith(appPrefix)) {
      return { repo: upstream.repo, ref: "HEAD", path: claimedPath.slice(appPrefix.length) };
    }
    if (claimedPath.startsWith(".github/workflows/") && !MONOREPO_ROOTS.some((r) => claimedPath.includes(r.slice(0, -1)))) {
      return { repo: upstream.repo, ref: "HEAD", path: claimedPath };
    }
    // Anything else that is not a monorepo-level root belongs to the app now.
    if (!MONOREPO_ROOTS.some((root) => claimedPath.startsWith(root))) {
      return { repo: upstream.repo, ref: "HEAD", path: claimedPath };
    }
  }
  return { repo: MONOREPO, ref: "main", path: claimedPath };
}

const treeCache = new Map();

/** Full recursive tree of repo@ref as a Set of file paths (cached per run). */
export async function treeOf(repo, ref) {
  const key = `${repo}@${ref}`;
  if (treeCache.has(key)) return treeCache.get(key);

  const sha = await api(`${API}/repos/${repo}/commits/${encodeURIComponent(ref)}`).then(
    (c) => c.commit.tree.sha,
  );
  const files = new Set();
  let url = `${API}/repos/${repo}/git/trees/${sha}?recursive=1`;
  while (url) {
    const page = await rawFetch(url);
    const data = await page.json();
    for (const entry of data.tree ?? []) {
      if (entry.type === "blob") files.add(entry.path);
    }
    url = null; // one page is enough below 100k entries
    if (data.truncated) {
      process.stderr.write(`warning: tree of ${key} truncated — results may miss deep paths\n`);
    }
  }

  treeCache.set(key, files);
  return files;
}

/** Does repo@ref contain this path (file or directory)? */
export async function pathExistsIn(repo, ref, claimedPath) {
  const tree = await treeOf(repo, ref);
  if (tree.has(claimedPath)) return true;
  // Directories do not appear as blobs; look for any blob underneath.
  const prefix = `${claimedPath.replace(/\/$/, "")}/`;
  for (const p of tree) {
    if (p.startsWith(prefix)) return true;
  }
  return false;
}

/**
 * Can this process actually read repositories other than its own?
 *
 * Inside Actions, the built-in GITHUB_TOKEN is scoped to the calling repo and
 * gets 404 for every other repository, while anonymous retries from shared
 * runner IPs usually die on rate limits. Probing one known-public repo tells
 * the callers whether to enforce or to degrade loudly.
 */
export async function crossRepoReadable(probe = `${MONOREPO}/commits/main`) {
  try {
    await api(probe);
    return true;
  } catch {
    return false;
  }
}

/** Parse owner/repo, ref and path out of a github.com blob/tree URL. */
export function parseGitHubUrl(url) {
  const match = url.match(
    /^https?:\/\/github\.com\/([^/]+)\/([^/]+)\/(?:blob|tree)\/([^/]+)\/(.+?)\/?$/,
  );
  if (!match) return null;
  return { repo: `${match[1]}/${match[2]}`, ref: match[3], path: match[4] };
}
