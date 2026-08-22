#!/usr/bin/env node
/**
 * One-shot repointing of case-study evidence after the 2026-08 app migration.
 *
 * Every product now lives in its own repository (registry/upstream.json `repo`
 * fields), while case-study evidence still says Claude-Code:apps/<id>/... .
 * This rewrites hrefs, path fields and repo pointers into the standalone
 * repos. Idempotent; archived-source studies are left untouched on purpose —
 * their stale pointers are part of the historical record.
 */
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const upstream = JSON.parse(fs.readFileSync(path.join(root, "registry/upstream.json"), "utf8"));
const statuses = JSON.parse(fs.readFileSync(path.join(root, "registry/source-status.json"), "utf8"));

const MONO = "https://github.com/henrygoldsmith07-wq/Claude-Code";
const byId = new Map((upstream.entries ?? []).map((e) => [e.id, e]));

/** Paths that moved during the standalone migration, verified against HEAD. */
const PATH_FIXUPS = {
  forq: { "lib/recommend.js": "src/lib/recommend.js" },
};

function walk(node, visit) {
  if (Array.isArray(node)) {
    for (const item of node) walk(item, visit);
    return;
  }
  if (node && typeof node === "object") {
    for (const [key, value] of Object.entries(node)) {
      visit(node, key, value);
      walk(value, visit);
    }
  }
}

for (const file of fs.readdirSync(path.join(root, "registry/case-studies")).sort()) {
  const full = path.join(root, "registry/case-studies", file);
  const project = JSON.parse(fs.readFileSync(full, "utf8"));
  const status = statuses.projects?.[project.slug]?.derived ?? "current";
  const entry = byId.get(project.upstreamId);
  const changes = [];

  // Archived studies keep their historical pointers.
  if (status !== "current" || !entry?.repo) continue;

  const appPrefix = `apps/${entry.id}`;
  const ghRepo = entry.repo;
  const shortName = ghRepo.split("/")[1];

  walk(project, (obj, key, value) => {
    if (key === "path" && typeof value === "string") {
      const fixups = PATH_FIXUPS[project.slug];
      if (fixups?.[value] && status === "current") {
        obj[key] = fixups[value];
        changes.push(`fixup:${value}→${obj[key]}`);
        return;
      }
    }
    if (key === "href" && typeof value === "string" && value.startsWith(MONO)) {
      for (const kind of ["blob", "tree"]) {
        const appUrl = `${MONO}/${kind}/main/${appPrefix}/`;
        if (value.startsWith(appUrl)) {
          obj[key] = value.replace(`${MONO}/${kind}/main/${appPrefix}/`, `${MONO.replace("Claude-Code", shortName)}/${kind}/main/`);
          changes.push(`href→${shortName}`);
          return;
        }
        const wfUrl = `${MONO}/${kind}/main/.github/workflows/`;
        if (value.startsWith(wfUrl)) {
          obj[key] = value.replace(
            `${MONO}/${kind}/main/.github/workflows/`,
            `${MONO.replace("Claude-Code", shortName)}/${kind}/main/.github/workflows/`,
          );
          changes.push(`href(workflow)→${shortName}`);
          return;
        }
      }
    }
    if (key === "path" && typeof value === "string") {
      if (value.startsWith(`${appPrefix}/`)) {
        obj[key] = value.slice(appPrefix.length + 1);
        changes.push(`path:${value}→${obj[key]}`);
      } else if (value === appPrefix) {
        // Top-level repo pointer: the repo root itself.
        obj[key] = ".";
        changes.push("repoPath→root");
      }
    }
    if (
      key === "href" &&
      typeof value === "string" &&
      value === `${MONO}/tree/main/${appPrefix}`
    ) {
      obj[key] = `https://github.com/${ghRepo}`;
      changes.push("repoHref→standalone");
    }
    if (key === "label" && typeof value === "string" && value === appPrefix) {
      obj[key] = shortName;
      changes.push("label");
    }
  });

  if (changes.length) {
    fs.writeFileSync(full, `${JSON.stringify(project, null, 2)}\n`);
    console.log(`${project.slug}: ${changes.length} pointer(s) → ${ghRepo}`);
  } else {
    console.log(`${project.slug}: already current`);
  }
}
