import fs from "node:fs";
import path from "node:path";

/**
 * The publication gate: does this case study appear on the site?
 *
 * Authored `publish: true` always publishes. `publish: false` is a gate that
 * opens automatically when the upstream lifecycle is promoted to
 * active/maintenance.
 *
 * This is the single definition. It is imported by every Node-side consumer
 * (sitemap, OG cards, route HTML, link checks, the Playwright suites). The
 * browser copy in src/data/registry/index.ts must keep the same semantics;
 * that module cannot import this file because it is plain JS running in Vite.
 */
export function isPublishedCaseStudy(project, upstreamById) {
  if (project.publish === true) return true;
  const lifecycle = upstreamById.get(project.upstreamId)?.lifecycle;
  return lifecycle === "active" || lifecycle === "maintenance";
}

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
