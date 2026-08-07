import { AnimatePresence, motion, useReducedMotion, type Variants } from "framer-motion";
import {
  ArrowDown,
  ArrowUpRight,
  BrainCircuit,
  ChevronDown,
  ChevronRight,
  Circle,
  Code2,
  Dumbbell,
  ExternalLink,
  Github,
  Laptop,
  Lightbulb,
  Menu,
  Moon,
  MoveUpRight,
  Palette,
  Quote,
  Sparkles,
  Sun,
  X,
  Zap,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { ProjectDialog as AccessibleProjectDialog } from "@/components/portfolio/ProjectDialog";
import { ProjectPreview } from "@/components/portfolio/ProjectPreview";
import { SiteMetadata } from "@/components/portfolio/SiteMetadata";
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

export default function Landing() {
  const [isDark, setIsDark] = useState(() => {
    if (typeof window === "undefined") return false;
    const storedTheme = window.localStorage.getItem("henry-theme");
    return storedTheme ? storedTheme === "dark" : window.matchMedia("(prefers-color-scheme: dark)").matches;
  });
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(() => typeof window !== "undefined" && window.scrollY > 24);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const reduceMotion = useReducedMotion();
  const year = new Date().getFullYear();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 24);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDark);
    window.localStorage.setItem("henry-theme", isDark ? "dark" : "light");
  }, [isDark]);

  const featuredProjects = useMemo(() => projects.filter((project) => project.featured), []);
  const remainingProjects = useMemo(() => projects.filter((project) => !project.featured), []);
  const reveal: Variants = reduceMotion
    ? { hidden: { opacity: 1, y: 0 }, visible: { opacity: 1, y: 0 } }
    : { hidden: { opacity: 0, y: 18 }, visible: { opacity: 1, y: 0, transition: { duration: 0.55 } } };

  return (
    <div className="portfolio-shell min-h-screen overflow-x-hidden bg-background text-foreground">
      <SiteMetadata />
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
          <div className="relative z-10 max-w-5xl"><motion.p initial={reduceMotion ? {} : { opacity: 0, y: 12 }} animate={reduceMotion ? {} : { opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="eyebrow mb-8">{profile.name.toUpperCase()} <span className="mx-2 text-muted-foreground/40">/</span> {profile.role.toUpperCase()}</motion.p><motion.h1 initial={reduceMotion ? {} : { opacity: 0, y: 20 }} animate={reduceMotion ? {} : { opacity: 1, y: 0 }} transition={{ delay: 0.18, duration: 0.7 }} className="hero-title">Learning.<br /><span className="text-muted-foreground">Building.</span><br />Improving<span className="accent-dot">.</span></motion.h1><motion.div initial={reduceMotion ? {} : { opacity: 0 }} animate={reduceMotion ? {} : { opacity: 1 }} transition={{ delay: 0.55 }} className="mt-9 flex flex-col gap-7 sm:flex-row sm:items-end sm:justify-between"><p className="max-w-md text-base leading-7 text-muted-foreground sm:text-lg">{profile.intro}</p><div className="flex shrink-0 gap-3"><button type="button" className="button-primary" onClick={() => scrollToId("projects")}>Explore my work <ArrowDown className="size-4" /></button><button type="button" className="button-secondary" onClick={() => scrollToId("about")}>About me</button></div></motion.div></div>
          <motion.div initial={reduceMotion ? {} : { opacity: 0 }} animate={reduceMotion ? {} : { opacity: 1 }} transition={{ delay: 0.8 }} className="relative z-10 mt-24 flex items-end justify-between border-t border-border pt-5 text-[11px] uppercase tracking-[0.16em] text-muted-foreground"><span>{profile.role}</span><span className="hidden sm:block">Scroll to explore <ChevronDown aria-hidden="true" className="ml-1 inline size-3.5" /></span><span>01 — 07</span></motion.div>
        </section>

        <section id="about" className="section-shell border-t border-border"><div className="section-grid"><div><SectionLabel number="01" >About</SectionLabel><h2 className="section-title">A little<br /><span className="text-muted-foreground">about me.</span></h2></div><div className="section-copy"><p className="large-copy">I like understanding how things work, then thinking about how they could work better.</p><p className="mt-6 text-muted-foreground">Most of my projects begin with a small frustration from my own life — a study system that feels scattered, a week that is difficult to see, or a routine that could use a little more structure. I build to learn, and I learn by making things real.</p><div className="mt-10 grid gap-0 border-y border-border sm:grid-cols-2"><div className="info-cell"><span>Currently</span><strong>{profile.currently}</strong></div><div className="info-cell"><span>Learning</span><strong>{profile.learning}</strong></div><div className="info-cell"><span>Outside coding</span><strong>{profile.outsideCoding}</strong></div><div className="info-cell"><span>Approach</span><strong>{profile.approach}</strong></div></div></div></div></section>

        <section className="philosophy-section border-y border-border"><div className="mx-auto grid max-w-[1380px] gap-12 px-5 py-24 sm:px-8 lg:grid-cols-[0.8fr_1.2fr] lg:px-12 lg:py-32"><div><SectionLabel number="02">Philosophy</SectionLabel><h2 className="section-title">Build.<br />Test.<br /><span className="text-muted-foreground">Learn.</span><br />Improve<span className="accent-dot">.</span></h2></div><div className="flex flex-col justify-between"><p className="max-w-lg text-xl leading-8 tracking-tight text-foreground/80 sm:text-2xl">Many of my projects start because something feels frustrating or could work better. The useful part is not getting it perfect first time — it&apos;s creating a loop that lets the idea get better.</p><div className="process-line mt-16 grid gap-3 sm:grid-cols-5">{["Problem", "Idea", "Build", "Use", "Improve"].map((item, index) => <div key={item} className="process-step"><span>{String(index + 1).padStart(2, "0")}</span><strong>{item}</strong>{index < 4 && <ChevronRight className="hidden size-4 text-muted-foreground/50 sm:block" />}</div>)}</div><div className="mt-10 flex items-center gap-3 text-sm text-muted-foreground"><span className="size-2 rounded-full bg-foreground" /> Repeat until it feels useful.</div></div></div></section>

        <section id="projects" className="section-shell"><div className="mb-14 flex flex-col justify-between gap-6 sm:flex-row sm:items-end"><div><SectionLabel number="03">Featured work</SectionLabel><h2 className="section-title">Things I&apos;m<br /><span className="text-muted-foreground">building.</span></h2></div><p className="max-w-xs text-sm leading-6 text-muted-foreground">A considered collection of products, systems and experiments — some are in progress, some are still being worked out.</p></div><div className="space-y-20">{featuredProjects.map((project, index) => <motion.article key={project.slug} initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-80px" }} variants={reveal} className={`project-row group grid gap-8 lg:grid-cols-[0.95fr_1.05fr] ${index === 1 ? "lg:grid-cols-[1.05fr_0.95fr]" : ""}`}><div className={`${index === 1 ? "lg:order-2" : ""}`}><button type="button" onClick={() => setSelectedProject(project)} className="block w-full text-left" aria-label={`View ${project.name} project details`}><ProjectPreview project={project} featured /></button></div><div className={`flex flex-col justify-center ${index === 1 ? "lg:order-1" : ""}`}><div className="flex items-center justify-between gap-4"><span className="eyebrow">0{index + 1} / {project.status}</span><span className="text-xs text-muted-foreground">{project.category}</span></div><h3 className="mt-5 text-4xl font-semibold tracking-[-0.06em] sm:text-5xl">{project.name}</h3><p className="mt-2 text-lg tracking-tight text-muted-foreground">{project.eyebrow}</p><p className="mt-6 max-w-md text-sm leading-6 text-muted-foreground">{project.description}</p><div className="mt-7 flex flex-wrap gap-2">{project.tags.map((tag) => <span key={tag} className="pill">{tag}</span>)}</div><button type="button" onClick={() => setSelectedProject(project)} className="inline-link mt-9 w-fit">View project <MoveUpRight className="size-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" /></button></div></motion.article>)}</div><div className="mt-24 border-t border-border pt-7"><div className="mb-6 flex items-center justify-between"><p className="eyebrow">More projects</p><span className="text-xs text-muted-foreground">03 — 06</span></div><div className="grid gap-px overflow-hidden border border-border bg-border md:grid-cols-3">{remainingProjects.map((project) => <button key={project.slug} type="button" onClick={() => setSelectedProject(project)} className="group bg-background p-5 text-left transition-colors hover:bg-muted sm:p-7"><div className="mb-14 flex items-center justify-between"><span className="text-xs text-muted-foreground">{project.status}</span><ArrowUpRight className="size-4 text-muted-foreground transition-transform group-hover:-translate-y-1 group-hover:translate-x-1" /></div><h3 className="text-2xl font-semibold tracking-[-0.05em]">{project.name}</h3><p className="mt-2 text-sm leading-6 text-muted-foreground">{project.description}</p><div className="mt-6 flex flex-wrap gap-2">{project.tags.slice(0, 2).map((tag) => <span key={tag} className="pill">{tag}</span>)}</div></button>)}</div></div></section>

        <section id="interests" className="section-shell border-t border-border"><div className="section-grid"><div><SectionLabel number="04">Interests</SectionLabel><h2 className="section-title">Curious<br /><span className="text-muted-foreground">by default.</span></h2></div><div><p className="large-copy max-w-2xl">The things I care about sit somewhere between technology, learning and making everyday systems feel more human.</p><div className="interest-grid mt-14">{profile.interests.map((interest, index) => { const Icon = iconMap[interest.icon as keyof typeof iconMap]; return <motion.div key={interest.title} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={reveal} transition={{ delay: index * 0.03 }} className="interest-card"><Icon className="size-5 text-muted-foreground" strokeWidth={1.5} /><h3 className="mt-12 text-lg font-semibold tracking-tight">{interest.title}</h3><p className="mt-2 text-sm leading-6 text-muted-foreground">{interest.description}</p></motion.div>; })}</div></div></div></section>

        <section id="now" className="now-section border-y border-border">
          <div className="mx-auto max-w-[1380px] px-5 py-24 sm:px-8 lg:px-12 lg:py-32">
            <div className="grid gap-12 lg:grid-cols-[0.7fr_1.3fr]">
              <div>
                <SectionLabel number="05">Now</SectionLabel>
                <h2 className="section-title">
                  What I&apos;m<br />
                  <span className="text-muted-foreground">doing now.</span>
                </h2>
                <p className="mt-7 max-w-xs text-sm leading-6 text-muted-foreground">
                  A small snapshot of where my attention is going. This section is intentionally easy to update.
                </p>
              </div>
              <div className="grid border-y border-border sm:grid-cols-2">
                {[
                  { title: "Building", text: "Improving my current apps and experimenting with new ideas.", icon: Laptop },
                  { title: "Learning", text: "Software development, AI and product design.", icon: BrainCircuit },
                  { title: "Training", text: "Strength training and cycling.", icon: Dumbbell },
                  { title: "Thinking about", text: "How software can remove friction from everyday tasks.", icon: Lightbulb },
                ].map(({ title, text, icon: Icon }) => (
                  <div key={title} className="info-cell min-h-40">
                    <Icon className="size-4 text-muted-foreground" />
                    <span className="mt-5">{title}</span>
                    <strong>{text}</strong>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-24 grid gap-12 lg:grid-cols-2">
              <div>
                <p className="eyebrow">Things I&apos;m exploring</p>
                <div className="mt-5 border-t border-border">
                  {profile.exploring.map((item, index) => (
                    <div key={item} className="explore-row">
                      <span className="text-xs text-muted-foreground">0{index + 1}</span>
                      <span>{item}</span>
                      <ArrowUpRight className="ml-auto size-3.5 text-muted-foreground" />
                    </div>
                  ))}
                </div>
              </div>

              <div className="dashboard-tease">
                <div className="flex items-center justify-between border-b border-white/10 px-4 py-3 text-[9px] uppercase tracking-[0.16em] text-white/40">
                  <span>Henry OS / Personal Dashboard</span>
                  <span className="flex items-center gap-1.5">
                    <span className="size-1.5 rounded-full bg-[#bbd7bd]" /> Concept
                  </span>
                </div>
                <div className="grid grid-cols-[0.6fr_1fr] gap-3 p-4 text-white">
                  <div className="space-y-2">
                    {["Overview", "Study", "Projects", "Fitness", "Goals"].map((item, index) => (
                      <div key={item} className={`rounded px-2 py-2 text-[9px] ${index === 0 ? "bg-white/10" : "text-white/35"}`}>
                        {item}
                      </div>
                    ))}
                  </div>
                  <div>
                    <p className="text-[9px] text-white/40">Tuesday, 14 May</p>
                    <p className="mt-1 text-lg font-semibold">Good morning.</p>
                    <div className="mt-5 grid grid-cols-2 gap-2">
                      <div className="rounded-lg bg-white/8 p-3">
                        <p className="text-[8px] text-white/35">Focus</p>
                        <p className="mt-3 text-sm">Study</p>
                      </div>
                      <div className="rounded-lg bg-white/8 p-3">
                        <p className="text-[8px] text-white/35">Movement</p>
                        <p className="mt-3 text-sm">42 min</p>
                      </div>
                    </div>
                    <div className="mt-2 h-16 rounded-lg bg-gradient-to-r from-white/5 via-[#bbd7bd]/25 to-white/5" />
                  </div>
                </div>
              </div>
            </div>
            <p className="mt-4 max-w-md text-sm leading-6 text-muted-foreground">
              An experiment in connecting studying, projects, fitness and planning into one personal system.
            </p>
          </div>
        </section>

        <section className="section-shell"><div className="grid gap-16 lg:grid-cols-[0.8fr_1.2fr]"><div><SectionLabel number="06">The path so far</SectionLabel><h2 className="section-title">Still early.<br /><span className="text-muted-foreground">Already moving.</span></h2></div><div className="timeline">{profile.moments.map((moment, index) => <div className="timeline-item" key={moment.label}><div className={`timeline-marker ${index === profile.moments.length - 1 ? "timeline-marker-active" : ""}`}><span>{String(index + 1).padStart(2, "0")}</span></div><div className="pb-12"><p className="text-xl font-semibold tracking-tight">{moment.label}</p><p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">{moment.description}</p></div></div>)}</div></div><div className="mt-20 grid gap-8 border-t border-border pt-8 sm:grid-cols-3">{Object.entries(profile.tools).map(([category, tools]) => <div key={category}><p className="eyebrow">{category}</p><div className="mt-4 flex flex-wrap gap-2">{tools.map((tool) => <span key={tool} className="pill">{tool}</span>)}</div></div>)}</div></section>

        <section className="personal-section border-y border-border"><div className="mx-auto max-w-[1380px] px-5 py-20 sm:px-8 lg:px-12"><div className="mb-10 flex items-center gap-3"><Quote className="size-5 text-muted-foreground" strokeWidth={1.5} /><p className="eyebrow">A few personal details</p></div><div className="grid gap-px overflow-hidden border border-border bg-border sm:grid-cols-2 lg:grid-cols-4">{[["Usually building", "Some new app idea"], ["Sport", "Cycling + fitness"], ["Football", "Liverpool"], ["Current obsession", "Making software simpler"]].map(([label, value]) => <div key={label} className="bg-background p-6"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-10 text-lg font-semibold tracking-tight">{value}</p></div>)}</div></div></section>

        <section id="contact" className="contact-section"><div className="mx-auto max-w-[1380px] px-5 py-28 sm:px-8 lg:px-12 lg:py-40"><SectionLabel number="07">Contact</SectionLabel><div className="flex flex-col justify-between gap-12 lg:flex-row lg:items-end"><div><h2 className="section-title max-w-3xl">Let&apos;s build something <span className="text-muted-foreground">interesting.</span></h2><p className="mt-7 max-w-md text-base leading-7 text-muted-foreground">I&apos;m always interested in learning, experimenting and working on new ideas.</p></div><div className="flex flex-wrap gap-3"><a href={profile.contact.github} target="_blank" rel="noopener noreferrer" className="button-primary">GitHub <Github className="size-4" /></a>{profile.contact.email && <a href={`mailto:${profile.contact.email}`} className="button-secondary">Email <ExternalLink className="size-4" /></a>}</div></div></div></section>
      </main>

      <footer className="border-t border-border"><div className="mx-auto flex max-w-[1380px] flex-col gap-8 px-5 py-8 sm:px-8 md:flex-row md:items-center md:justify-between lg:px-12"><div><a href="#top" className="text-sm font-semibold tracking-tight">Henry Goldsmith</a><p className="mt-1 text-xs text-muted-foreground">Henry Goldsmith · Learning. Building. Improving.</p></div><div className="flex flex-wrap gap-5 text-xs text-muted-foreground"><a href="#projects" className="hover:text-foreground">Projects</a><a href="#about" className="hover:text-foreground">About</a><a href="#contact" className="hover:text-foreground">Contact</a><a href={profile.contact.github} target="_blank" rel="noopener noreferrer" className="hover:text-foreground">GitHub</a></div><p className="text-xs text-muted-foreground">© {year} · Made with curiosity</p></div></footer>
      <AccessibleProjectDialog
        project={selectedProject}
        preview={selectedProject ? <ProjectPreview project={selectedProject} featured /> : null}
        open={selectedProject !== null}
        onOpenChange={(open) => { if (!open) setSelectedProject(null); }}
      />
    </div>
  );
}
