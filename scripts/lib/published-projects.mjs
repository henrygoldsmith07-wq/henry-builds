import fs from "node:fs";
import path from "node:path";

/**
 * Load case studies with the same publication gate used by src/data/registry.
 *
 * Authored publish:true always publishes. publish:false is a gate that opens
 * automatically when the upstream lifecycle is promoted to active/maintenance.
 */
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

  const isPublished = ({ data }) => {
    if (data.publish === true) return true;
    const lifecycle = upstreamById.get(data.upstreamId)?.lifecycle;
    return lifecycle === "active" || lifecycle === "maintenance";
  };

  return {
    all,
    published: all.filter(isPublished),
    unpublished: all.filter((entry) => !isPublished(entry)),
    upstream,
    upstreamById,
    caseStudyDir,
  };
}
