import fs from "node:fs";
import path from "node:path";
import {
  buildRouteManifest,
  buildRoutePaths,
  isPublishedCaseStudy,
} from "../../src/data/registry/publication.mjs";

/**
 * Filesystem loading for the publication rule.
 *
 * The rule itself lives in `src/data/registry/publication.mjs` and is re-exported
 * here for the many existing `from "scripts/lib/published-projects.mjs"` call
 * sites. That module is pure ESM with no `node:` imports, so the browser and
 * Node load the identical file — the rule is no longer written down twice.
 *
 * Re-exported rather than removed so the change stays reviewable: consumers can
 * migrate to the canonical path one at a time.
 */
export { isPublishedCaseStudy, buildRouteManifest, buildRoutePaths };

export function loadCaseStudies(root = process.cwd()) {
  const caseStudyDir = path.join(root, "registry/case-studies");
  const upstreamPath = path.join(root, "registry/upstream.json");

  const upstream = fs.existsSync(upstreamPath)
    ? JSON.parse(fs.readFileSync(upstreamPath, "utf8"))
    : { entries: [] };

  const upstreamById = new Map(
    (upstream.entries ?? []).map((entry) => [entry.id, entry]),
  );

  const all = fs.existsSync(caseStudyDir)
    ? fs
        .readdirSync(caseStudyDir)
        .filter((file) => file.endsWith(".json"))
        .map((file) => ({
          file: `registry/case-studies/${file}`,
          data: JSON.parse(
            fs.readFileSync(path.join(caseStudyDir, file), "utf8"),
          ),
        }))
    : [];

  const isPublished = ({ data }) => isPublishedCaseStudy(data, upstreamById);

  return {
    all,
    published: all.filter(isPublished),
    unpublished: all.filter((entry) => !isPublished(entry)),
    upstream,
    upstreamById,
    caseStudyDir,
  };
}
