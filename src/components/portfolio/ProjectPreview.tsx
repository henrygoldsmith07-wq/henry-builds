import {
  CalendarDays,
  Check,
  Dumbbell,
  Timer,
  Utensils,
} from "lucide-react";
import type { Project } from "@/data/projects";

export function ProjectPreview({ project, featured = false }: { project: Project; featured?: boolean }) {
  const isDark = project.preview === "revise" || project.preview === "studio";
  return (
    <div
      className={`project-preview relative overflow-hidden rounded-[1.25rem] border border-black/10 ${featured ? "min-h-[330px] sm:min-h-[420px]" : "min-h-[260px]"}`}
      style={{ backgroundColor: project.accent }}
    >
      <div className={`absolute inset-0 ${isDark ? "bg-[#171817]" : "bg-[#f8f7f3]"} m-4 overflow-hidden rounded-xl border border-black/10 shadow-[0_18px_50px_rgba(20,25,20,0.12)]`}>
        {project.screenshots?.[0] ? (
          <img src={project.screenshots[0].src} alt={project.screenshots[0].alt} className="size-full object-cover" />
        ) : (
          <>
            <div className="flex items-center justify-between border-b border-black/10 px-4 py-3 text-[9px] font-semibold uppercase tracking-[0.16em] text-black/45">
              <span className="flex items-center gap-2"><span className="size-1.5 rounded-full bg-current" /> {project.name}</span>
              <span>Concept</span>
            </div>
            {project.preview === "revise" && <RevisePreview />}
            {project.preview === "fitness" && <FitnessPreview />}
            {project.preview === "food" && <FoodPreview />}
            {project.preview === "language" && <LanguagePreview />}
            {project.preview === "calendar" && <CalendarPreview />}
            {project.preview === "studio" && <StudioPreview />}
          </>
        )}
      </div>
      <span className="absolute bottom-7 right-7 rounded-full bg-white/80 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-black/55 backdrop-blur-sm">
        {project.screenshots?.[0] ? "Screenshot" : "Concept preview"}
      </span>
    </div>
  );
}

function RevisePreview() {
  return (
    <div className="grid h-[calc(100%-43px)] grid-cols-[0.75fr_1.4fr] gap-3 p-3 text-white">
      <div className="rounded-lg bg-white/8 p-3">
        <div className="mb-8 size-5 rounded bg-[#c5d5ff]" />
        {["Today", "Subjects", "Flashcards", "Past papers"].map((item, index) => <div key={item} className={`mb-3 rounded px-2 py-1.5 text-[10px] ${index === 0 ? "bg-white/12 text-white" : "text-white/40"}`}>{item}</div>)}
      </div>
      <div className="flex flex-col gap-3 p-1 sm:p-3">
        <div><p className="text-[10px] text-white/45">Tuesday, 14 May</p><p className="mt-1 text-lg font-semibold tracking-tight">Good morning, Henry.</p></div>
        <div className="grid grid-cols-2 gap-2"><div className="rounded-lg border border-white/10 bg-white/8 p-3"><p className="text-[9px] text-white/45">Streak</p><p className="mt-3 text-xl font-semibold">12 days</p></div><div className="rounded-lg border border-white/10 bg-white/8 p-3"><p className="text-[9px] text-white/45">Due today</p><p className="mt-3 text-xl font-semibold">24 cards</p></div></div>
        <div className="mt-auto rounded-lg border border-white/10 bg-white/8 p-3"><div className="flex justify-between text-[9px] text-white/45"><span>Revision plan</span><span>68%</span></div><div className="mt-3 h-1 rounded-full bg-white/10"><div className="h-full w-2/3 rounded-full bg-[#c5d5ff]" /></div></div>
      </div>
    </div>
  );
}

function FitnessPreview() {
  return <div className="grid h-[calc(100%-43px)] gap-3 p-5 sm:grid-cols-[1.1fr_0.9fr]"><div><p className="text-[10px] uppercase tracking-[0.13em] text-black/40">This week</p><p className="mt-2 text-3xl font-semibold tracking-tight text-black/80">4 <span className="text-sm font-normal text-black/35">sessions</span></p><div className="mt-8 flex h-24 items-end gap-2">{[38, 57, 45, 78, 52, 88, 65].map((height, index) => <div key={index} className="flex-1 rounded-t bg-[#a9c4ae]" style={{ height: `${height}%` }} />)}</div><div className="mt-2 flex justify-between text-[9px] text-black/35"><span>M</span><span>T</span><span>W</span><span>T</span><span>F</span><span>S</span><span>S</span></div></div><div className="rounded-lg bg-[#e4eee3] p-4"><Dumbbell className="size-4 text-black/45" /><p className="mt-9 text-[10px] text-black/40">Next up</p><p className="mt-1 text-base font-semibold text-black/75">Upper body</p><div className="mt-4 flex items-center gap-1.5 text-[9px] text-black/45"><Timer className="size-3" /> 42 min</div></div></div>;
}

function FoodPreview() {
  return <div className="h-[calc(100%-43px)] p-5"><div className="flex items-center justify-between"><div><p className="text-[10px] uppercase tracking-[0.13em] text-black/40">Weekly plan</p><p className="mt-1 text-xl font-semibold tracking-tight text-black/75">What should we eat?</p></div><Utensils className="size-5 text-black/35" /></div><div className="mt-6 grid grid-cols-3 gap-2">{[["M", "Pasta"], ["T", "Salmon"], ["W", "Tacos"], ["T", "Curry"], ["F", "Pizza"], ["S", "Salad"]].map(([day, meal], index) => <div key={`${day}-${meal}`} className={`rounded-lg p-3 ${index === 1 ? "bg-[#d8e5c9]" : "bg-black/5"}`}><p className="text-[9px] font-semibold text-black/40">{day}</p><p className="mt-4 text-[10px] font-medium text-black/70">{meal}</p></div>)}</div><div className="mt-3 flex items-center gap-2 rounded-lg bg-black/[0.04] px-3 py-2 text-[10px] text-black/50"><Check className="size-3.5 text-[#789c68]" /> Shopping list ready · 14 items</div></div>;
}

function LanguagePreview() {
  return <div className="flex h-[calc(100%-43px)] flex-col justify-between p-5"><div className="flex justify-between"><div><p className="text-[10px] uppercase tracking-[0.13em] text-black/40">Daily practice</p><p className="mt-1 text-xl font-semibold tracking-tight text-black/75">Bonjour, Henry.</p></div><span className="rounded-full bg-[#eee6f5] px-2 py-1 text-[9px] text-black/50">12 min</span></div><div className="rounded-xl bg-[#eee6f5] p-5 text-center"><p className="text-[10px] text-black/45">Translate this phrase</p><p className="mt-4 text-lg font-semibold text-black/75">Je suis en train d&apos;apprendre.</p><div className="mt-5 h-8 rounded-lg border border-black/10 bg-white/60 text-left" /></div><div className="flex items-center justify-between text-[10px] text-black/40"><span>Lesson 04</span><span>6 / 10 complete</span></div></div>;
}

function CalendarPreview() {
  return <div className="h-[calc(100%-43px)] p-4"><div className="flex items-center justify-between"><p className="text-sm font-semibold text-black/75">May 2026</p><CalendarDays className="size-4 text-black/40" /></div><div className="mt-5 grid grid-cols-7 gap-1 text-center text-[9px] text-black/35">{["M", "T", "W", "T", "F", "S", "S", "12", "13", "14", "15", "16", "17", "18", "19", "20", "21", "22", "23", "24", "25"].map((item, index) => <span key={`${item}-${index}`} className={`rounded py-1.5 ${item === "14" ? "bg-[#c8e0e4] font-semibold text-black/70" : ""}`}>{item}</span>)}</div><div className="mt-5 space-y-2"><div className="flex items-center gap-2 rounded bg-black/5 p-2 text-[9px] text-black/55"><span className="size-1.5 rounded-full bg-[#7b9fa4]" /> Design review <span className="ml-auto text-black/30">10:00</span></div><div className="flex items-center gap-2 rounded bg-black/5 p-2 text-[9px] text-black/55"><span className="size-1.5 rounded-full bg-[#d1ad71]" /> Cycle <span className="ml-auto text-black/30">18:30</span></div></div></div>;
}

function StudioPreview() {
  return <div className="relative h-[calc(100%-43px)] overflow-hidden p-5 text-white"><div className="absolute -right-10 -top-14 size-44 rounded-full border border-white/15" /><div className="absolute -bottom-20 left-20 size-48 rounded-full border border-white/10" /><p className="text-[10px] uppercase tracking-[0.13em] text-white/40">Visual studies / 006</p><p className="mt-12 max-w-[170px] text-2xl font-semibold leading-[1.05] tracking-tight">Ideas need a place to become visible.</p><div className="absolute bottom-5 left-5 right-5 flex justify-between text-[9px] text-white/35"><span>Typography</span><span>Le Studio</span></div></div>;
}
