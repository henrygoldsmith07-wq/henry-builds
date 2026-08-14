import { Check, Dumbbell, Timer, Utensils } from "lucide-react";
import type { PreviewKind, Visual } from "@/data/registry/schema";

/** Previews drawn on a dark chrome rather than a light one. */
const DARK_PREVIEWS = new Set<PreviewKind>(["revise", "studio", "world-news", "rtk"]);

/**
 * Renders a project's lead visual.
 *
 * The badge in the corner is driven by `visual.kind`, not by styling choices —
 * an illustration is always labelled as one, so a drawn mockup is never
 * mistaken for a capture of working software.
 */
export function ProjectPreview({
  visual,
  accent,
  name,
  featured = false,
}: {
  visual: Visual;
  accent: string;
  name: string;
  featured?: boolean;
}) {
  const isDark = visual.kind === "illustration" && DARK_PREVIEWS.has(visual.preview);

  return (
    <figure
      className={`project-preview relative overflow-hidden rounded-[1.25rem] border border-black/10 ${
        featured ? "min-h-[330px] sm:min-h-[420px]" : "min-h-[260px]"
      }`}
      style={{ backgroundColor: accent }}
    >
      <div
        className={`absolute inset-0 ${
          isDark ? "bg-[#171817]" : "bg-[#f8f7f3]"
        } m-4 overflow-hidden rounded-xl border border-black/10 shadow-[0_18px_50px_rgba(20,25,20,0.12)]`}
      >
        {visual.kind === "screenshot" ? (
          <img
            src={visual.src}
            alt={visual.alt}
            loading="lazy"
            decoding="async"
            className="size-full object-cover"
          />
        ) : (
          /*
           * The illustration is a drawing of an interface, not an interface. Its
           * internals are meaningless out of context — a screen reader working
           * through "Streak / 12 days / Due today" learns nothing. So it is
           * exposed as one labelled image and its contents are hidden from the
           * accessibility tree, which is also why the low-contrast mock chrome
           * inside it is not a barrier.
           */
          <div role="img" aria-label={visual.alt} className="size-full">
            <div aria-hidden="true" className="size-full">
              <div
                className={`flex items-center justify-between border-b px-4 py-3 text-[9px] font-semibold uppercase tracking-[0.16em] ${
                  isDark ? "border-white/15 text-white/75" : "border-black/10 text-black/65"
                }`}
              >
                <span className="flex items-center gap-2">
                  <span className="size-1.5 rounded-full bg-current" /> {name}
                </span>
                <span>Illustration</span>
              </div>
              <PreviewBody kind={visual.preview} label={visual.alt} />
            </div>
          </div>
        )}
      </div>

      <span
        className={`preview-badge ${
          visual.kind === "screenshot" ? "preview-badge-real" : ""
        }`}
      >
        {visual.kind === "screenshot" ? "Screenshot" : "Illustration — not a screenshot"}
      </span>

      {visual.caption && <figcaption className="sr-only">{visual.caption}</figcaption>}
    </figure>
  );
}

function PreviewBody({ kind, label }: { kind: PreviewKind; label: string }) {
  switch (kind) {
    case "revise":
      return <RevisePreview />;
    case "rapport":
      return <RapportPreview />;
    case "pulse":
      return <PulsePreview />;
    case "rtk":
      return <RtkPreview />;
    case "forq":
      return <ForqPreview />;
    case "reflect":
      return <ReflectPreview />;
    case "world-news":
      return <WorldNewsPreview />;
    case "fitness":
      return <FitnessPreview />;
    case "language":
      return <LanguagePreview />;
    case "calendar":
      return <CalendarPreview />;
    case "studio":
      return <StudioPreview />;
    default:
      return <GenericPreview label={label} />;
  }
}

function RevisePreview() {
  return (
    <div className="grid h-[calc(100%-43px)] grid-cols-[0.75fr_1.4fr] gap-3 p-3 text-white">
      <div className="rounded-lg bg-white/8 p-3">
        <div className="mb-8 size-5 rounded bg-[#c5d5ff]" />
        {["Today", "Subjects", "Flashcards", "Past papers"].map((item, index) => (
          <div
            key={item}
            className={`mb-3 rounded px-2 py-1.5 text-[10px] ${index === 0 ? "bg-white/12 text-white" : "text-white/60"}`}
          >
            {item}
          </div>
        ))}
      </div>
      <div className="flex flex-col gap-3 p-1 sm:p-3">
        <div>
          <p className="text-[10px] text-white/65">Next highest-value task</p>
          <p className="mt-1 text-lg font-semibold tracking-tight">Repair 6 dropped marks</p>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-lg border border-white/10 bg-white/8 p-3">
            <p className="text-[9px] text-white/65">Due reviews</p>
            <p className="mt-3 text-xl font-semibold">24</p>
          </div>
          <div className="rounded-lg border border-white/10 bg-white/8 p-3">
            <p className="text-[9px] text-white/65">Open mistakes</p>
            <p className="mt-3 text-xl font-semibold">6</p>
          </div>
        </div>
        <div className="mt-auto rounded-lg border border-white/10 bg-white/8 p-3">
          <div className="flex justify-between text-[9px] text-white/65">
            <span>Spec coverage</span>
            <span>68%</span>
          </div>
          <div className="mt-3 h-1 rounded-full bg-white/10">
            <div className="h-full w-2/3 rounded-full bg-[#c5d5ff]" />
          </div>
        </div>
      </div>
    </div>
  );
}

function RapportPreview() {
  return (
    <div className="h-[calc(100%-43px)] p-5">
      <p className="text-[10px] uppercase tracking-[0.13em] text-black/60">Skill graph</p>
      <div className="relative mt-5 h-28">
        {[
          [12, 14],
          [46, 6],
          [78, 22],
          [30, 52],
          [64, 60],
        ].map(([left, top], index) => (
          <span
            key={`${left}-${top}`}
            className={`absolute size-3 rounded-full ${index === 1 ? "bg-[#8f7bb5]" : "bg-black/20"}`}
            style={{ left: `${left}%`, top: `${top}%` }}
          />
        ))}
        <svg className="size-full" viewBox="0 0 100 70" aria-hidden="true" fill="none">
          <path
            d="M13 16 L47 8 M47 8 L79 24 M13 16 L31 54 M47 8 L65 62 M31 54 L65 62"
            stroke="currentColor"
            className="text-black/15"
            strokeWidth="0.7"
          />
        </svg>
      </div>
      <div className="rounded-lg bg-black/[0.04] p-3">
        <div className="flex justify-between text-[9px] text-black/65">
          <span>Mastery</span>
          <span>Confidence</span>
        </div>
        <div className="mt-3 flex gap-2">
          <div className="h-1.5 flex-1 rounded-full bg-black/10">
            <div className="h-full w-3/5 rounded-full bg-[#8f7bb5]" />
          </div>
          <div className="h-1.5 flex-1 rounded-full bg-black/10">
            <div className="h-full w-1/3 rounded-full bg-black/35" />
          </div>
        </div>
        <p className="mt-3 text-[9px] text-black/60">Tracked separately, each with uncertainty</p>
      </div>
    </div>
  );
}

function PulsePreview() {
  return (
    <div className="h-[calc(100%-43px)] p-5">
      <p className="text-[10px] uppercase tracking-[0.13em] text-black/60">Finding</p>
      <p className="mt-2 text-base font-semibold leading-tight tracking-tight text-black/75">
        Later sessions score lower — but time of day explains most of it.
      </p>
      <div className="mt-5 grid grid-cols-3 gap-2">
        {[
          ["Effect", "−0.31"],
          ["n days", "22"],
          ["Grade", "Moderate"],
        ].map(([label, value]) => (
          <div key={label} className="rounded-lg bg-black/[0.04] p-2.5">
            <p className="text-[8px] text-black/60">{label}</p>
            <p className="mt-2 text-sm font-semibold text-black/75">{value}</p>
          </div>
        ))}
      </div>
      <div className="mt-3 flex items-start gap-2 rounded-lg border border-black/10 px-3 py-2 text-[9px] leading-4 text-black/65">
        <span className="mt-0.5 size-1.5 shrink-0 rounded-full bg-[#c98b3f]" />
        Uncontrolled after adjustment — not promoted to an experiment.
      </div>
    </div>
  );
}

function RtkPreview() {
  return (
    <div className="h-[calc(100%-43px)] p-5 font-mono text-white">
      {/* Faded to show noise being collapsed, but not below AA: opacity-30 put
          this at 2.7:1. */}
      <div className="space-y-1 opacity-55">
        {["✓ src/a.test.ts (18)", "✓ src/b.test.ts (24)", "✓ src/c.test.ts (31)", "✓ …197 more"].map(
          (line) => (
            <p key={line} className="truncate text-[9px]">
              {line}
            </p>
          ),
        )}
      </div>
      <div className="my-4 flex items-center gap-2 text-[9px] text-white/60">
        <span className="h-px flex-1 bg-white/15" />
        rtk
        <span className="h-px flex-1 bg-white/15" />
      </div>
      <p className="text-[11px] text-[#9fd39f]">✓ 200 passed</p>
      <div className="mt-6 grid grid-cols-2 gap-2 font-sans">
        <div className="rounded-lg bg-white/8 p-3">
          <p className="text-[8px] text-white/60">Reduction</p>
          <p className="mt-2 text-lg font-semibold">99.9%</p>
        </div>
        <div className="rounded-lg bg-white/8 p-3">
          <p className="text-[8px] text-white/60">Critical kept</p>
          <p className="mt-2 text-lg font-semibold">100%</p>
        </div>
      </div>
    </div>
  );
}

function ForqPreview() {
  return (
    <div className="h-[calc(100%-43px)] p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] uppercase tracking-[0.13em] text-black/60">Suggested tonight</p>
          <p className="mt-1 text-xl font-semibold tracking-tight text-black/75">Pepper traybake</p>
        </div>
        <Utensils className="size-5 text-black/60" />
      </div>
      <div className="mt-5 space-y-1.5">
        {[
          "83% already in your kitchen",
          "Uses peppers expiring tomorrow",
          "24 minutes — fits Tuesday",
          "£2.17 per person",
        ].map((line) => (
          <div key={line} className="flex items-center gap-2 text-[10px] text-black/70">
            <Check className="size-3 shrink-0 text-[#789c68]" /> {line}
          </div>
        ))}
      </div>
      <div className="mt-4 rounded-lg bg-black/[0.04] px-3 py-2 text-[10px] text-black/65">
        Every factor explains itself
      </div>
    </div>
  );
}

function ReflectPreview() {
  return (
    <div className="h-[calc(100%-43px)] p-5">
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-lg bg-[#dfe9ec] p-3">
          <p className="text-[8px] uppercase tracking-[0.12em] text-black/60">Observed</p>
          <p className="mt-2 text-[10px] leading-4 text-black/70">They left without saying goodbye.</p>
        </div>
        <div className="rounded-lg bg-black/[0.05] p-3">
          <p className="text-[8px] uppercase tracking-[0.12em] text-black/60">Assumed</p>
          <p className="mt-2 text-[10px] leading-4 text-black/70">They are annoyed with me.</p>
        </div>
      </div>
      <div className="mt-3 rounded-lg border border-black/10 p-3">
        <p className="text-[8px] uppercase tracking-[0.12em] text-black/60">Alternative reading</p>
        <p className="mt-2 text-[10px] leading-4 text-black/65">
          They were late for something and did not notice.
        </p>
      </div>
      <div className="mt-3 flex items-center justify-between rounded-lg bg-black/[0.04] px-3 py-2 text-[9px] text-black/65">
        <span>Confidence 0.38</span>
        <span>Below 0.45 — flag omitted</span>
      </div>
    </div>
  );
}

function WorldNewsPreview() {
  return (
    <div className="relative h-[calc(100%-43px)] overflow-hidden p-5 text-white">
      <div className="absolute -bottom-16 -left-10 size-44 rounded-full border border-white/15" />
      <div className="absolute -bottom-12 -left-6 size-36 rounded-full border border-white/10" />
      <p className="text-[10px] uppercase tracking-[0.13em] text-white/60">Story cluster</p>
      <p className="mt-2 max-w-[190px] text-base font-semibold leading-tight tracking-tight">
        Nine sources. Two disagree on the cause.
      </p>
      <div className="mt-5 space-y-1.5">
        {[
          ["Widely agreed", "6 of 9"],
          ["Conflicting claims", "2"],
          ["Coverage gaps", "4 regions"],
        ].map(([label, value]) => (
          <div key={label} className="flex justify-between text-[9px] text-white/70">
            <span>{label}</span>
            <span className="text-white/75">{value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function FitnessPreview() {
  return (
    <div className="grid h-[calc(100%-43px)] gap-3 p-5 sm:grid-cols-[1.1fr_0.9fr]">
      <div>
        <p className="text-[10px] uppercase tracking-[0.13em] text-black/60">This week</p>
        <p className="mt-2 text-3xl font-semibold tracking-tight text-black/80">
          4 <span className="text-sm font-normal text-black/60">sessions</span>
        </p>
        <div className="mt-8 flex h-24 items-end gap-2">
          {[38, 57, 45, 78, 52, 88, 65].map((height, index) => (
            <div key={index} className="flex-1 rounded-t bg-[#a9c4ae]" style={{ height: `${height}%` }} />
          ))}
        </div>
      </div>
      <div className="rounded-lg bg-[#e4eee3] p-4">
        <Dumbbell className="size-4 text-black/65" />
        <p className="mt-9 text-[10px] text-black/60">Next up</p>
        <p className="mt-1 text-base font-semibold text-black/75">Upper body</p>
        <div className="mt-4 flex items-center gap-1.5 text-[9px] text-black/65">
          <Timer className="size-3" /> 42 min
        </div>
      </div>
    </div>
  );
}

function LanguagePreview() {
  return (
    <div className="flex h-[calc(100%-43px)] flex-col justify-between p-5">
      <div>
        <p className="text-[10px] uppercase tracking-[0.13em] text-black/60">Daily practice</p>
        <p className="mt-1 text-xl font-semibold tracking-tight text-black/75">Unit 4 · Lesson 2</p>
      </div>
      <div className="rounded-xl bg-[#eee6f5] p-5 text-center">
        <p className="text-[10px] text-black/65">Translate this phrase</p>
        <p className="mt-4 text-lg font-semibold text-black/75">Je suis en train d&apos;apprendre.</p>
        <div className="mt-5 h-8 rounded-lg border border-black/10 bg-white/60" />
      </div>
      <div className="flex items-center justify-between text-[10px] text-black/60">
        <span>Speaking + listening</span>
        <span>6 / 10 complete</span>
      </div>
    </div>
  );
}

function CalendarPreview() {
  return (
    <div className="h-[calc(100%-43px)] p-4">
      <p className="text-sm font-semibold text-black/75">This week</p>
      <div className="mt-5 grid grid-cols-7 gap-1 text-center text-[9px] text-black/60">
        {["M", "T", "W", "T", "F", "S", "S", "12", "13", "14", "15", "16", "17", "18"].map(
          (item, index) => (
            <span
              key={`${item}-${index}`}
              className={`rounded py-1.5 ${item === "14" ? "bg-[#c8e0e4] font-semibold text-black/70" : ""}`}
            >
              {item}
            </span>
          ),
        )}
      </div>
      <div className="mt-5 space-y-2">
        {[
          ["Deep work", "10:00", "#7b9fa4"],
          ["Cycle", "18:30", "#d1ad71"],
        ].map(([label, time, colour]) => (
          <div
            key={label}
            className="flex items-center gap-2 rounded bg-black/5 p-2 text-[9px] text-black/70"
          >
            <span className="size-1.5 rounded-full" style={{ backgroundColor: colour }} /> {label}
            <span className="ml-auto text-black/60">{time}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function StudioPreview() {
  return (
    <div className="relative h-[calc(100%-43px)] overflow-hidden p-5 text-white">
      <div className="absolute -right-10 -top-14 size-44 rounded-full border border-white/15" />
      <div className="absolute -bottom-20 left-20 size-48 rounded-full border border-white/10" />
      <p className="text-[10px] uppercase tracking-[0.13em] text-white/60">Visual studies</p>
      <p className="mt-12 max-w-[170px] text-2xl font-semibold leading-[1.05] tracking-tight">
        Ideas need a place to become visible.
      </p>
    </div>
  );
}

function GenericPreview({ label }: { label: string }) {
  return (
    <div className="flex h-[calc(100%-43px)] flex-col justify-between p-5">
      <div className="space-y-2">
        {[100, 72, 88].map((width, index) => (
          <div
            key={index}
            className="h-2 rounded-full bg-black/[0.07]"
            style={{ width: `${width}%` }}
          />
        ))}
      </div>
      <p className="max-w-[220px] text-[11px] leading-4 text-black/60">{label}</p>
    </div>
  );
}
