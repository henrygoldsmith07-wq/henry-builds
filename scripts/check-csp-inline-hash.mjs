// Guards the CSP in vercel.json against the inline theme bootstrap in
// index.html.
//
// script-src is pinned to a sha256 hash rather than 'unsafe-inline', which is
// stricter but means editing the inline script silently breaks the deployed
// policy: the page keeps working locally and only loses its theme bootstrap in
// production, with a console error pointing at CSP. This fails instead, and
// prints the value to paste.
//
//   node scripts/check-csp-inline-hash.mjs           # verify (CI)
//   node scripts/check-csp-inline-hash.mjs --print   # print hashes only
//
// The hash is computed over the LF-normalised script body. .gitattributes
// normalises text files to LF in the working tree, but the normalisation here
// stays as defence in depth: a checkout made before that file existed, or a
// tool that rewrites endings, would otherwise emit a different digest per
// platform and fail the check for a reason that has nothing to do with the CSP.
//
// No dependencies — runs in a bare CI container.
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const printOnly = process.argv.includes("--print");

const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const inline = [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)];

const hashes = inline.map(([, body]) => {
  const normalised = body.replace(/\r\n/g, "\n");
  return `'sha256-${crypto.createHash("sha256").update(normalised, "utf8").digest("base64")}'`;
});

if (hashes.length === 0) {
  console.log("check-csp-inline-hash: no inline script in index.html — nothing to pin");
  process.exit(0);
}

if (printOnly) {
  for (const hash of hashes) console.log(hash);
  process.exit(0);
}

const vercel = JSON.parse(fs.readFileSync(path.join(root, "vercel.json"), "utf8"));
const headers = (vercel.headers ?? []).flatMap((entry) => entry.headers ?? []);
const csp = headers.find((h) => h.key === "Content-Security-Policy")?.value ?? "";

if (!csp) {
  console.error(
    "check-csp-inline-hash: vercel.json sets no Content-Security-Policy. " +
      `index.html has ${hashes.length} inline script(s), which such a policy would block.`,
  );
  process.exit(1);
}

const missing = hashes.filter((hash) => !csp.includes(hash));
if (missing.length > 0) {
  console.error(
    "check-csp-inline-hash: vercel.json's CSP does not allow the inline script in index.html.\n" +
      "The deployed page would lose its theme bootstrap. Add to script-src:\n",
  );
  for (const hash of missing) console.error(`  ${hash}`);
  console.error("\nOr drop the inline script and move it into a bundled module.");
  process.exit(1);
}

console.log(
  `check-csp-inline-hash: ${hashes.length} inline script(s), all present in the CSP`,
);
