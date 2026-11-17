import { useMemo, useRef, useState, type ChangeEvent } from "react";
import { Link } from "react-router";
import { CheckCircle2, FileText, X } from "lucide-react";
import { demonstratesOf, projects } from "@/data/registry";

/**
 * A transparent, local skill matcher.
 *
 * The previous version of this widget claimed to be an "AI Resume Analyzer"
 * and returned fixed numbers after a two-second delay without reading the
 * upload. That is the opposite of this site's proposition. This version does
 * one checkable thing: it looks for words from the registry's own capability
 * text in text you paste or load from a plain-text file, and shows the exact
 * word that matched. It is a word match, not an assessment, and there is no
 * score because no measurement stands behind one.
 */

const STOP_WORDS = new Set([
  "about", "across", "after", "based", "both", "build", "built", "from",
  "have", "into", "its", "more", "other", "over", "such", "than", "that",
  "their", "them", "then", "there", "these", "this", "those", "through",
  "under", "using", "well", "when", "where", "which", "while", "with",
]);

function capabilityWords(capability: string): string[] {
  return capability
    .toLowerCase()
    .replace(/[^a-z0-9+#.\s-]/g, " ")
    .split(/[\s\-/]+/)
    .filter((word) => word.length >= 4 && !STOP_WORDS.has(word));
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

type Match = { capability: string; word: string };

export function SkillMatcher() {
  const [text, setText] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);

  const capabilities = useMemo(() => {
    const seen = new Set<string>();
    return projects
      .flatMap((project) => demonstratesOf(project).technical)
      .map((capability) => capability.trim())
      .filter((capability) => {
        if (!capability || seen.has(capability)) return false;
        seen.add(capability);
        return true;
      })
      .sort((a, b) => a.localeCompare(b));
  }, []);

  const matches = useMemo<Match[]>(() => {
    if (!text.trim()) return [];
    return capabilities.flatMap((capability) => {
      const word = capabilityWords(capability).find((candidate) =>
        new RegExp(`\\b${escapeRegExp(candidate)}\\b`, "i").test(text),
      );
      return word ? [{ capability, word }] : [];
    });
  }, [capabilities, text]);

  const matchedNames = new Set(matches.map((match) => match.capability));
  const unmatched = capabilities.filter((capability) => !matchedNames.has(capability));

  async function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setText(await file.text());
    if (fileInput.current) fileInput.current.value = "";
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-border bg-background p-8">
        <div className="flex items-center gap-3">
          <FileText className="size-6 text-primary" aria-hidden="true" />
          <h2 className="text-xl font-semibold tracking-tight">Skill matcher</h2>
        </div>
        <p className="mt-4 text-sm leading-6 text-muted-foreground">
          Paste a CV or job description, or load a plain <code>.txt</code> file. The
          matcher looks for words taken from the capability text in the registry
          and shows the word behind each match. Nothing is uploaded, stored or
          scored — the check runs entirely in this browser.
        </p>

        <label className="mt-6 block text-sm font-medium" htmlFor="skill-matcher-text">
          Text to check
        </label>
        <textarea
          id="skill-matcher-text"
          value={text}
          onChange={(event) => setText(event.target.value)}
          rows={8}
          placeholder="Paste text here…"
          className="mt-2 w-full rounded-xl border border-border bg-background p-4 text-sm leading-6"
        />

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-foreground/5">
            <input
              ref={fileInput}
              type="file"
              accept=".txt,.md,text/plain"
              onChange={handleFile}
              className="sr-only"
            />
            Load a text file
          </label>
          {text && (
            <button
              type="button"
              onClick={() => setText("")}
              className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-foreground/5"
            >
              <X className="size-4" aria-hidden="true" /> Clear
            </button>
          )}
        </div>
      </div>

      {text.trim() && (
        <div className="space-y-6">
          <p className="text-sm text-muted-foreground">
            Matched <strong className="text-foreground">{matches.length}</strong> of{" "}
            {capabilities.length} registry capabilities. This is a word match, not
            evidence that a capability was demonstrated — check the linked case
            studies for the proof.
          </p>

          <div>
            <h3 className="flex items-center gap-2 text-base font-semibold">
              <CheckCircle2 className="size-5 text-emerald-600" aria-hidden="true" />
              Matched ({matches.length})
            </h3>
            <ul className="mt-3 space-y-2">
              {matches.map(({ capability, word }) => (
                <li
                  key={capability}
                  className="rounded-lg border border-border bg-background p-3 text-sm"
                >
                  {capability}{" "}
                  <span className="text-muted-foreground">(matched “{word}”)</span>
                </li>
              ))}
              {matches.length === 0 && (
                <li className="text-sm text-muted-foreground">No capability words found.</li>
              )}
            </ul>
          </div>

          <div>
            <h3 className="text-base font-semibold">Not matched ({unmatched.length})</h3>
            <p className="mt-2 text-xs text-muted-foreground">
              Absence here means only that the words did not appear in the text you supplied.
            </p>
            <ul className="mt-3 flex flex-wrap gap-2">
              {unmatched.map((capability) => (
                <li
                  key={capability}
                  className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground"
                >
                  {capability}
                </li>
              ))}
            </ul>
          </div>

          <p className="text-sm text-muted-foreground">
            See the capability coverage recorded in published case studies on the{" "}
            <Link to="#skills" className="underline">capability map</Link>.
          </p>
        </div>
      )}
    </div>
  );
}
