#!/usr/bin/env node
/**
 * Probes the live deployment. Run by .github/workflows/deploy-monitor.yml.
 *
 *   SITE_URL=https://example.com node scripts/probe-deployment.mjs
 *
 * Checks what a build cannot: that the deployed origin serves every route, that
 * the SPA rewrite has not started returning the shell for missing assets, and
 * that the metadata a link preview depends on is actually present and absolute.
 */

import fs from "node:fs";
import path from "node:path";

const origin = (process.env.SITE_URL ?? process.env.VITE_SITE_URL ?? "").replace(/\/$/, "");

if (!origin) {
  console.error("probe-deployment: SITE_URL is not set");
  process.exit(1);
}

const caseStudyDir = path.join(process.cwd(), "registry/case-studies");
const published = fs
  .readdirSync(caseStudyDir)
  .filter((file) => file.endsWith(".json"))
  .map((file) => JSON.parse(fs.readFileSync(path.join(caseStudyDir, file), "utf8")))
  .filter((project) => project.publish !== false);

let failures = 0;
const problem = (msg) => {
  console.error(`✗ ${msg}`);
  failures++;
};
const ok = (msg) => console.log(`✓ ${msg}`);

async function get(url, init) {
  const response = await fetch(url, {
    redirect: "follow",
    headers: { "user-agent": "henry-builds-deploy-probe" },
    signal: AbortSignal.timeout(30_000),
    ...init,
  });
  return response;
}

/**
 * A protected deployment answers 401/403 to everything, which would otherwise
 * surface as one failure per route and read like a total outage. Detect it once
 * and stop, so the report says what is actually wrong.
 */
async function assertReachable() {
  let response;
  try {
    response = await get(`${origin}/`);
  } catch (error) {
    console.error(`✗ ${origin} is unreachable — ${error.message}`);
    process.exit(1);
  }

  if (response.status === 401 || response.status === 403) {
    const protectedBy =
      response.headers.get("x-vercel-protection-bypass") ??
      response.headers.get("set-cookie")?.includes("_vercel_sso_nonce");

    console.error(
      `✗ ${origin} returned ${response.status} for the root route.\n` +
        (protectedBy
          ? "  This looks like Vercel deployment protection. Point SITE_URL at the\n" +
            "  production domain, or set a protection-bypass token for the probe.\n"
          : "  Every route will fail while the origin refuses unauthenticated requests.\n"),
    );
    process.exit(1);
  }
}

await assertReachable();

// --- routes ---------------------------------------------------------------
const routes = ["/", "/projects", ...published.map((p) => `/projects/${p.slug}`)];

for (const route of routes) {
  try {
    const response = await get(`${origin}${route}`);
    if (!response.ok) {
      problem(`${route} returned ${response.status}`);
      continue;
    }
    const html = await response.text();
    if (!html.includes('<div id="root">')) {
      problem(`${route} responded 200 but did not serve the app shell`);
    } else {
      ok(`${route} ${response.status}`);
    }
  } catch (error) {
    problem(`${route} unreachable — ${error.message}`);
  }
}

// --- assets that must not be swallowed by the SPA rewrite ------------------
const assets = [
  "/sitemap.xml",
  "/robots.txt",
  "/og/default.png",
  "/og/projects.png",
  ...published.map((p) => `/og/${p.slug}.png`),
];

for (const asset of assets) {
  try {
    const response = await get(`${origin}${asset}`);
    if (!response.ok) {
      problem(`${asset} returned ${response.status}`);
      continue;
    }
    const type = response.headers.get("content-type") ?? "";
    // A rewrite that catches everything returns index.html for a missing PNG.
    if (asset.endsWith(".png") && !type.includes("image/")) {
      problem(`${asset} served as "${type}" — the SPA rewrite is catching static assets`);
    } else if (asset.endsWith(".xml") && !/xml/.test(type)) {
      problem(`${asset} served as "${type}", expected XML`);
    } else {
      ok(`${asset} ${response.status} (${type.split(";")[0]})`);
    }
  } catch (error) {
    problem(`${asset} unreachable — ${error.message}`);
  }
}

// --- metadata a link preview depends on -----------------------------------
try {
  const html = await (await get(`${origin}/`)).text();

  const required = [
    ['og:image', /<meta[^>]+property="og:image"[^>]+content="([^"]+)"/],
    ['og:title', /<meta[^>]+property="og:title"[^>]+content="([^"]+)"/],
    ['description', /<meta[^>]+name="description"[^>]+content="([^"]+)"/],
  ];

  for (const [name, pattern] of required) {
    const match = html.match(pattern);
    if (!match) {
      problem(`the served HTML has no ${name} tag`);
      continue;
    }
    if (name === "og:image") {
      // The static shell may ship a root-relative og:image; what matters for
      // crawlers is that it resolves to an absolute URL on this origin.
      const resolved = match[1].startsWith("http") ? match[1] : `${origin}${match[1]}`;
      if (!/^https?:\/\//.test(match[1]) && !match[1].startsWith("/")) {
        problem(`og:image is "${match[1]}" — neither absolute nor origin-relative`);
      } else if (resolved.endsWith(".svg")) {
        problem("og:image is an SVG, which most crawlers will not render");
      } else {
        try {
          const card = await get(resolved, { method: "HEAD" });
          if (!card.ok) {
            problem(`og:image ${resolved} returned ${card.status}`);
          } else {
            ok(`og:image ${resolved}`);
          }
        } catch {
          ok(`og:image ${resolved} (HEAD probe failed, URL present)`);
        }
      }
    } else {
      ok(`${name} present`);
    }
  }
} catch (error) {
  problem(`could not read metadata — ${error.message}`);
}

// --- a route that should 404 ----------------------------------------------
try {
  const response = await get(`${origin}/projects/definitely-not-a-project`);
  const html = await response.text();
  if (html.includes('<div id="root">')) {
    ok("unknown project route serves the app shell (client-side 404)");
  } else {
    problem("unknown project route did not serve the app shell");
  }
} catch (error) {
  problem(`404 probe failed — ${error.message}`);
}

console.log(`\nprobe-deployment: ${routes.length + assets.length} targets, ${failures} failure(s)`);
process.exit(failures > 0 ? 1 : 0);
