import { AnimatePresence, motion, useReducedMotion, type Variants } from "framer-motion";
import {
  ArrowDown,
  ArrowUpRight,
  BrainCircuit,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronRight,
  Circle,
  Code2,
  Dumbbell,
  ExternalLink,
  Github,
  Globe2,
  Grid3X3,
  Laptop,
  Lightbulb,
  Menu,
  Moon,
  MoveUpRight,
  Palette,
  PanelTop,
  Quote,
  Sparkles,
  Sun,
  Timer,
  Utensils,
  X,
  Zap,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { profile } from "@/data/profile";
import { projects, type Project } from "@/data/projects";

const iconMap = {
  code: Code2,
  spark: BrainCircuit,
  design: Palette,
  learning: Lightbulb,
  fitness: Dumbbell,
  cycling: Zap,
  football: Circle,
  improve: Sparkles,
} as const;

const navItems = [
  ["About", "about"],
  ["Projects", "projects"],
  ["Interests", "interests"],
  ["Now", "now"],
  ["Contact", "contact"],
] as const;

function scrollToId(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function SectionLabel({ number, children }: { number: string; children: string }) {
  return (
    <div className="mb-7 flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
      <span className="text-foreground/45">{number}</span>
      <span className="h-px w-8 bg-border" />
      <span>{children}</span>
    </div>
  );
}

function ProjectPreview({ project, featured = false }: { project: Project; featured?: boolean }) {
  const isDark = project.preview === "revise" || project.preview === "studio";
  return (
    <div
      className={`project-preview relative overflow-hidden rounded-[1.25rem] border border-black/10 ${featured ? "min-h-[330px] sm:min-h-[420px]" : "min-h-[260px]"}`}
      style={{ backgroundColor: project.accent }}
    >
      <div className={`absolute inset-0 ${isDark ? "bg-[#171817]" : "bg-[#f8f7f3]"} m-4 overflow-hidden rounded-xl border border-black/10 shadow-[0_18px_50px_rgba(20,25,20,0.12)]`}>
        <div className="flex items-center justify-between border-b border-black/10 px-4 py-3 text-[9px] font-semibold uppercase tracking-[0.16em] text-black/45">
          <span className="flex items-center gap-2"><span className="size-1.5 rounded-full bg-current" /> {project.name}</span>
          <span>v.01</span>
        </div>
        {project.preview === "revise" && <RevisePreview />}
        {project.preview === "fitness" && <FitnessPreview />}
        {project.preview === "food" && <FoodPreview />}
        {project.preview === "language" && <LanguagePreview />}
        {project.preview === "calendar" && <CalendarPreview />}
        {project.preview === "studio" && <StudioPreview />}
      </div>
      <span className="absolute bottom-7 right-7 rounded-full bg-white/80 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-black/55 backdrop-blur-sm">Preview</span>
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

function ProjectDialog({ project, onClose }: { project: Project; onClose: () => void }) {
  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    document.addEventListener("keydown", handleKey);
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", handleKey); document.body.style.overflow = ""; };
  }, [onClose]);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 p-0 backdrop-blur-sm sm:items-center sm:p-6" onMouseDown={(event) => event.target === event.currentTarget && onClose()} role="dialog" aria-modal="true" aria-label={`${project.name} project details`}>
      <motion.div initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }} transition={{ type: "spring", stiffness: 260, damping: 25 }} className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-t-[1.5rem] bg-background p-5 text-foreground sm:rounded-[1.5rem] sm:p-8">
        <div className="flex items-start justify-between gap-6"><div><p className="eyebrow">{project.category}</p><h2 className="mt-3 text-4xl font-semibold tracking-[-0.06em] sm:text-6xl">{project.name}</h2><p className="mt-3 max-w-xl text-base leading-7 text-muted-foreground">{project.description}</p></div><button type="button" onClick={onClose} aria-label="Close project details" className="icon-button"><X className="size-4" /></button></div>
        <div className="mt-8"><ProjectPreview project={project} featured /></div>
        <div className="mt-8 grid gap-8 border-t border-border pt-8 sm:grid-cols-3"><div><p className="eyebrow">The problem</p><p className="mt-3 text-sm leading-6 text-muted-foreground">{project.problem}</p></div><div><p className="eyebrow">The idea</p><p className="mt-3 text-sm leading-6 text-muted-foreground">{project.idea}</p></div><div><p className="eyebrow">What I&apos;m improving</p><p className="mt-3 text-sm leading-6 text-muted-foreground">{project.improving}</p></div></div>
        <div className="mt-8 grid gap-8 border-t border-border pt-8 sm:grid-cols-2"><div><p className="eyebrow">Features</p><ul className="mt-4 space-y-3 text-sm">{project.features.map((feature) => <li key={feature} className="flex items-center gap-2"><Check className="size-3.5 text-muted-foreground" /> {feature}</li>)}</ul></div><div><p className="eyebrow">Technology & approach</p><div className="mt-4 flex flex-wrap gap-2">{project.technology.map((tool) => <span key={tool} className="pill">{tool}</span>)}</div></div></div>
      </motion.div>
    </motion.div>
  );
}

export default function Landing() {
  const [isDark, setIsDark] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const reduceMotion = useReducedMotion();
  const year = new Date().getFullYear();

  useEffect(() => {
    const storedTheme = window.localStorage.getItem("henry-theme");
    const shouldUseDark = storedTheme ? storedTheme === "dark" : window.matchMedia("(prefers-color-scheme: dark)").matches;
    setIsDark(shouldUseDark);
    const handleScroll = () => setScrolled(window.scrollY > 24);
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDark);
    window.localStorage.setItem("henry-theme", isDark ? "dark" : "light");
  }, [isDark]);

  const featuredProjects = useMemo(() => projects.slice(0, 3), []);
  const remainingProjects = useMemo(() => projects.slice(3), []);
  const reveal: Variants = reduceMotion
    ? { hidden: { opacity: 1, y: 0 }, visible: { opacity: 1, y: 0 } }
    : { hidden: { opacity: 0, y: 18 }, visible: { opacity: 1, y: 0, transition: { duration: 0.55 } } };

  return (
    <div className="portfolio-shell min-h-screen overflow-x-hidden bg-background text-foreground">
      <header className={`site-nav ${scrolled ? "site-nav-scrolled" : ""}`}>
        <div className="mx-auto flex max-w-[1380px] items-center justify-between px-5 py-4 sm:px-8 lg:px-12">
          <a href="#top" className="group flex items-center gap-3" aria-label="Henry Goldsmith home"><span className="monogram">HG</span><span className="hidden text-sm font-semibold tracking-tight sm:block">Henry Goldsmith</span></a>
          <nav className="hidden items-center gap-7 md:flex" aria-label="Main navigation">{navItems.map(([label, id]) => <a key={id} href={`#${id}`} className="nav-link">{label}</a>)}</nav>
          <div className="flex items-center gap-2"><button type="button" className="theme-toggle" onClick={() => setIsDark((current) => !current)} aria-label={`Switch to ${isDark ? "light" : "dark"} mode`}>{isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}</button><button type="button" className="icon-button md:hidden" onClick={() => setMenuOpen((current) => !current)} aria-label={menuOpen ? "Close menu" : "Open menu"} aria-expanded={menuOpen}>{menuOpen ? <X className="size-4" /> : <Menu className="size-4" />}</button></div>
        </div>
        <AnimatePresence>{menuOpen && <motion.nav initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="border-t border-border px-5 pb-5 pt-2 md:hidden" aria-label="Mobile navigation">{navItems.map(([label, id]) => <a key={id} href={`#${id}`} onClick={() => setMenuOpen(false)} className="mobile-nav-link">{label}<ArrowUpRight className="size-3.5" /></a>)}</motion.nav>}</AnimatePresence>
      </header>

      <main id="top">
        <section className="hero-section relative mx-auto flex min-h-[min(860px,100vh)] max-w-[1380px] flex-col justify-between px-5 pb-12 pt-32 sm:px-8 sm:pb-16 sm:pt-40 lg:px-12">
          <div className="hero-grid" aria-hidden="true" />
          <div className="relative z-10 max-w-5xl"><motion.p initial={reduceMotion ? {} : { opacity: 0, y: 12 }} animate={reduceMotion ? {} : { opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="eyebrow mb-8">{profile.name} <span className="mx-2 text-muted-foreground/40">/</span> {profile.role}</motion.p><motion.h1 initial={reduceMotion ? {} : { opacity: 0, y: 20 }} animate={reduceMotion ? {} : { opacity: 1, y: 0 }} transition={{ delay: 0.18, duration: 0.7 }} className="hero-title">Learning.<br /><span className="text-muted-foreground">Building.</span><br />Improving<span className="accent-dot">.</span></motion.h1><motion.div initial={reduceMotion ? {} : { opacity: 0 }} animate={reduceMotion ? {} : { opacity: 1 }} transition={{ delay: 0.55 }} className="mt-9 flex flex-col gap-7 sm:flex-row sm:items-end sm:justify-between"><p className="max-w-md text-base leading-7 text-muted-foreground sm:text-lg">{profile.intro}</p><div className="flex shrink-0 gap-3"><button type="button" className="button-primary" onClick={() => scrollToId("projects")}>Explore my work <ArrowDown className="size-4" /></button><button type="button" className="button-secondary" onClick={() => scrollToId("about")}>About me</button></div></motion.div></div>
          <motion.div initial={reduceMotion ? {} : { opacity: 0 }} animate={reduceMotion ? {} : { opacity: 1 }} transition={{ delay: 0.8 }} className="relative z-10 mt-24 flex items-end justify-between border-t border-border pt-5 text-[11px] uppercase tracking-[0.16em] text-muted-foreground"><span>Based somewhere in the UK</span><span className="hidden sm:block">Scroll to explore <ChevronDown className="ml-1 inline size-3.5" /></span><span>01 — 07</span></motion.div>
        </section>

        <section id="about" className="section-shell border-t border-border"><div className="section-grid"><div><SectionLabel number="01" >About</SectionLabel><h2 className="section-title">A little<br /><span className="text-muted-foreground">about me.</span></h2></div><div className="section-copy"><p className="large-copy">I like understanding how things work, then thinking about how they could work better.</p><p className="mt-6 text-muted-foreground">Most of my projects begin with a small frustration from my own life — a study system that feels scattered, a week that is difficult to see, or a routine that could use a little more structure. I build to learn, and I learn by making things real.</p><div className="mt-10 grid gap-0 border-y border-border sm:grid-cols-2"><div className="info-cell"><span>Currently</span><strong>{profile.currently}</strong></div><div className="info-cell"><span>Learning</span><strong>{profile.learning}</strong></div><div className="info-cell"><span>Outside coding</span><strong>{profile.outsideCoding}</strong></div><div className="info-cell"><span>Approach</span><strong>{profile.approach}</strong></div></div></div></div></section>

        <section className="philosophy-section border-y border-border"><div className="mx-auto grid max-w-[1380px] gap-12 px-5 py-24 sm:px-8 lg:grid-cols-[0.8fr_1.2fr] lg:px-12 lg:py-32"><div><SectionLabel number="02">Philosophy</SectionLabel><h2 className="section-title">Build.<br />Test.<br /><span className="text-muted-foreground">Learn.</span><br />Improve<span className="accent-dot">.</span></h2></div><div className="flex flex-col justify-between"><p className="max-w-lg text-xl leading-8 tracking-tight text-foreground/80 sm:text-2xl">Many of my projects start because something feels frustrating or could work better. The useful part is not getting it perfect first time — it&apos;s creating a loop that lets the idea get better.</p><div className="process-line mt-16 grid gap-3 sm:grid-cols-5">{["Problem", "Idea", "Build", "Use", "Improve"].map((item, index) => <div key={item} className="process-step"><span>{String(index + 1).padStart(2, "0")}</span><strong>{item}</strong>{index < 4 && <ChevronRight className="hidden size-4 text-muted-foreground/50 sm:block" />}</div>)}</div><div className="mt-10 flex items-center gap-3 text-sm text-muted-foreground"><span className="size-2 rounded-full bg-foreground" /> Repeat until it feels useful.</div></div></div></section>

        <section id="projects" className="section-shell"><div className="mb-14 flex flex-col justify-between gap-6 sm:flex-row sm:items-end"><div><SectionLabel number="03">Selected work</SectionLabel><h2 className="section-title">Things I&apos;m<br /><span className="text-muted-foreground">building.</span></h2></div><p className="max-w-xs text-sm leading-6 text-muted-foreground">A collection of products, systems and experiments — all still in motion.</p></div><div className="space-y-20">{featuredProjects.map((project, index) => <motion.article key={project.slug} initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-80px" }} variants={reveal} className={`project-row group grid gap-8 lg:grid-cols-[0.95fr_1.05fr] ${index === 1 ? "lg:grid-cols-[1.05fr_0.95fr]" : ""}`}><div className={`${index === 1 ? "lg:order-2" : ""}`}><button type="button" onClick={() => setSelectedProject(project)} className="block w-full text-left" aria-label={`View ${project.name} project details`}><ProjectPreview project={project} featured /></button></div><div className={`flex flex-col justify-center ${index === 1 ? "lg:order-1" : ""}`}><div className="flex items-center justify-between gap-4"><span className="eyebrow">0{index + 1} / {project.status}</span><span className="text-xs text-muted-foreground">{project.category}</span></div><h3 className="mt-5 text-4xl font-semibold tracking-[-0.06em] sm:text-5xl">{project.name}</h3><p className="mt-2 text-lg tracking-tight text-muted-foreground">{project.eyebrow}</p><p className="mt-6 max-w-md text-sm leading-6 text-muted-foreground">{project.description}</p><div className="mt-7 flex flex-wrap gap-2">{project.tags.map((tag) => <span key={tag} className="pill">{tag}</span>)}</div><button type="button" onClick={() => setSelectedProject(project)} className="inline-link mt-9 w-fit">View project <MoveUpRight className="size-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" /></button></div></motion.article>)}</div><div className="mt-24 border-t border-border pt-7"><div className="mb-6 flex items-center justify-between"><p className="eyebrow">More experiments</p><span className="text-xs text-muted-foreground">03 — 06</span></div><div className="grid gap-px overflow-hidden border border-border bg-border md:grid-cols-3">{remainingProjects.map((project) => <button key={project.slug} type="button" onClick={() => setSelectedProject(project)} className="group bg-background p-5 text-left transition-colors hover:bg-muted sm:p-7"><div className="mb-14 flex items-center justify-between"><span className="text-xs text-muted-foreground">{project.status}</span><ArrowUpRight className="size-4 text-muted-foreground transition-transform group-hover:-translate-y-1 group-hover:translate-x-1" /></div><h3 className="text-2xl font-semibold tracking-[-0.05em]">{project.name}</h3><p className="mt-2 text-sm leading-6 text-muted-foreground">{project.description}</p><div className="mt-6 flex flex-wrap gap-2">{project.tags.slice(0, 2).map((tag) => <span key={tag} className="pill">{tag}</span>)}</div></button>)}</div></div></section>

        <section id="interests" className="section-shell border-t border-border"><div className="section-grid"><div><SectionLabel number="04">Interests</SectionLabel><h2 className="section-title">Curious<br /><span className="text-muted-foreground">by default.</span></h2></div><div><p className="large-copy max-w-2xl">The things I care about sit somewhere between technology, learning and making everyday systems feel more human.</p><div className="interest-grid mt-14">{profile.interests.map((interest, index) => { const Icon = iconMap[interest.icon as keyof typeof iconMap]; return <motion.div key={interest.title} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={reveal} transition={{ delay: index * 0.03 }} className="interest-card"><Icon className="size-5 text-muted-foreground" strokeWidth={1.5} /><h3 className="mt-12 text-lg font-semibold tracking-tight">{interest.title}</h3><p className="mt-2 text-sm leading-6 text-muted-foreground">{interest.description}</p></motion.div>; })}</div></div></div></section>

        <section id="now" className="now-section border-y border-border"><div className="mx-auto max-w-[1380px] px-5 py-24 sm:px-8 lg:px-12 lg:py-32"><div className="grid gap-12 lg:grid-cols-[0.7fr_1.3fr]"><div><SectionLabel number="05">Now</SectionLabel><h2 className="section-title">What I&apos;m<br /><span className="text-muted-foreground">doing now.</span></h2><p className="mt-7 max-w-xs text-sm leading-6 text-muted-foreground">A small snapshot of where my attention is going. This section is intentionally easy to update.</p></div><div className="grid border-y border-border sm:grid-cols-2">{[{ title: "Building", text: "Improving my current apps and experimenting with new ideas.", icon: Laptop }, { title: "Learning", text: "Software development, AI and product design.", icon: BrainCircuit }, { title: "Training", text: "Strength training and cycling.", icon: Dumbbell }, { title: "Thinking about", text: "How software can remove friction from everyday tasks.", icon: Lightbulb }].map(({ title, text, icon: Icon }) => <div key={title} className="info-cell min-h-40"><Icon className="size-4 text-muted-foreground" /><span className="mt-5">{title}</span><strong>{text}</strong></div>)}</div></div><div className="mt-24 grid gap-12 lg:grid-cols-2"><div><p className="eyebrow">Things I&apos;m exploring</p><div className="mt-5 border-t border-border">{profile.exploring.map((item, index) => <div key={item} className="explore-row"><span className="text-xs text-muted-foreground">0{index + 1}</span><span>{item}</span><ArrowUpRight className="ml-auto size-3.5 text-muted-foreground" /></div>)}</div></div><div className="dashboard-tease"><div className="flex items-center justify-between border-b border-white/10 px-4 py-3 text-[9px] uppercase tracking-[0.16em] text-white/40"><span>Henry OS / personal dashboard</span><span className="flex items-center gap-1.5"><span className="size-1.5 rounded-full bg-[#bbd7bd]" /> live concept</span></div><div className="grid grid-cols-[0.6fr_1fr] gap-3 p-4 text-white"><div className="space-y-2">{["Overview", "Study", "Projects", "Fitness", "Goals"].map((item, index) => <div key={item} className={`rounded px-2 py-2 text-[9px] ${index === 0 ? "bg-white/10" : "text-white/35"}`}>{item}</div>)}</div><div><p className="text-[9px] text-white/40">Tuesday, 14 May</p><p className="mt-1 text-lg font-semibold">Good morning.</p><div className="mt-5 grid grid-cols-2 gap-2"><div className="rounded-lg bg-white/8 p-3"><p className="text-[8px] text-white/35">Focus</p><p className="mt-3 text-sm">Study</p></div><div className="rounded-lg bg-white/8 p-3"><p className="text-[8px] text-white/35">Movement</p><p className="mt-3 text-sm">42 min</p></div></div><div className="mt-2 h-16 rounded-lg bg-gradient-to-r from-white/5 via-[#bbd7bd]/25 to-white/5" /></div></div></div></div></div></section>

        <section className="section-shell"><div className="grid gap-16 lg:grid-cols-[0.8fr_1.2fr]"><div><SectionLabel number="06">The path so far</SectionLabel><h2 className="section-title">Still early.<br /><span className="text-muted-foreground">Already moving.</span></h2></div><div className="timeline">{profile.moments.map((moment, index) => <div className="timeline-item" key={moment.label}><div className={`timeline-marker ${index === profile.moments.length - 1 ? "timeline-marker-active" : ""}`}><span>{String(index + 1).padStart(2, "0")}</span></div><div className="pb-12"><p className="text-xl font-semibold tracking-tight">{moment.label}</p><p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">{moment.description}</p></div></div>)}</div></div><div className="mt-20 grid gap-8 border-t border-border pt-8 sm:grid-cols-3">{Object.entries(profile.tools).map(([category, tools]) => <div key={category}><p className="eyebrow">{category}</p><div className="mt-4 flex flex-wrap gap-2">{tools.map((tool) => <span key={tool} className="pill">{tool}</span>)}</div></div>)}</div></section>

        <section className="personal-section border-y border-border"><div className="mx-auto max-w-[1380px] px-5 py-20 sm:px-8 lg:px-12"><div className="mb-10 flex items-center gap-3"><Quote className="size-5 text-muted-foreground" strokeWidth={1.5} /><p className="eyebrow">A few personal details</p></div><div className="grid gap-px overflow-hidden border border-border bg-border sm:grid-cols-2 lg:grid-cols-4">{[["Usually building", "Some new app idea"], ["Sport", "Cycling + fitness"], ["Football", "Liverpool"], ["Current obsession", "Making software simpler"]].map(([label, value]) => <div key={label} className="bg-background p-6"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-10 text-lg font-semibold tracking-tight">{value}</p></div>)}</div></div></section>

        <section id="contact" className="contact-section"><div className="mx-auto max-w-[1380px] px-5 py-28 sm:px-8 lg:px-12 lg:py-40"><SectionLabel number="07">Contact</SectionLabel><div className="flex flex-col justify-between gap-12 lg:flex-row lg:items-end"><div><h2 className="section-title max-w-3xl">Let&apos;s build something <span className="text-muted-foreground">interesting.</span></h2><p className="mt-7 max-w-md text-base leading-7 text-muted-foreground">I&apos;m always interested in learning, experimenting and working on new ideas.</p></div><div className="flex gap-3"><a href={profile.contact.github} target="_blank" rel="noreferrer" className="button-primary">GitHub <Github className="size-4" /></a><a href={profile.contact.email ? `mailto:${profile.contact.email}` : "#contact"} className="button-secondary">Email <ExternalLink className="size-4" /></a></div></div></div></section>
      </main>

      <footer className="border-t border-border"><div className="mx-auto flex max-w-[1380px] flex-col gap-8 px-5 py-8 sm:px-8 md:flex-row md:items-center md:justify-between lg:px-12"><div><a href="#top" className="text-sm font-semibold tracking-tight">Henry Goldsmith</a><p className="mt-1 text-xs text-muted-foreground">Learning. Building. Improving.</p></div><div className="flex gap-5 text-xs text-muted-foreground"><a href="#projects" className="hover:text-foreground">Projects</a><a href="#about" className="hover:text-foreground">About</a><a href="#contact" className="hover:text-foreground">Contact</a></div><p className="text-xs text-muted-foreground">© {year} · Made with curiosity</p></div></footer>
      <AnimatePresence>{selectedProject && <ProjectDialog project={selectedProject} onClose={() => setSelectedProject(null)} />}</AnimatePresence>
    </div>
  );
}
