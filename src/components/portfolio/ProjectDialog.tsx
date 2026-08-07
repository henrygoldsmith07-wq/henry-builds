import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Check, ExternalLink, Github } from "lucide-react";
import type { ReactNode } from "react";
import type { Project } from "@/data/projects";

export function ProjectDialog({
  project,
  preview,
  open,
  onOpenChange,
}: {
  project: Project | null;
  preview: ReactNode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  if (!project) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-4xl overflow-y-auto rounded-[1.5rem] border-border bg-background p-5 sm:p-8" aria-describedby="project-dialog-description">
        <DialogHeader className="pr-8 text-left">
          <div className="flex flex-wrap items-center gap-3">
            <span className="eyebrow">{project.status}</span>
            <span className="text-xs text-muted-foreground">{project.category}</span>
          </div>
          <DialogTitle className="mt-3 text-4xl font-semibold tracking-[-0.06em] sm:text-6xl">
            {project.name}
          </DialogTitle>
          <DialogDescription id="project-dialog-description" className="max-w-xl text-base leading-7 text-muted-foreground">
            {project.eyebrow} {project.description}
          </DialogDescription>
        </DialogHeader>

        <div className="mt-3">{preview}</div>

        <div className="mt-8 grid gap-8 border-t border-border pt-8 sm:grid-cols-2">
          <div>
            <p className="eyebrow">Overview</p>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">{project.description}</p>
          </div>
          <div>
            <p className="eyebrow">What I&apos;m improving</p>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">{project.improving}</p>
          </div>
        </div>

        <div className="mt-8 grid gap-8 border-t border-border pt-8 sm:grid-cols-2">
          <div>
            <p className="eyebrow">The problem</p>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">{project.problem}</p>
          </div>
          <div>
            <p className="eyebrow">The idea</p>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">{project.idea}</p>
          </div>
        </div>

        <div className="mt-8 grid gap-8 border-t border-border pt-8 sm:grid-cols-2">
          <div>
            <p className="eyebrow">Core features</p>
            <ul className="mt-4 space-y-3 text-sm">
              {project.features.slice(0, 6).map((feature) => (
                <li key={feature} className="flex items-center gap-2">
                  <Check className="size-3.5 text-muted-foreground" aria-hidden="true" />
                  {feature}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="eyebrow">Technology & approach</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {project.technology.map((tool) => <span key={tool} className="pill">{tool}</span>)}
            </div>
          </div>
        </div>

        {(project.liveUrl || project.githubUrl) && (
          <div className="mt-8 flex flex-wrap gap-3 border-t border-border pt-8">
            {project.liveUrl && (
              <a className="button-primary" href={project.liveUrl} target="_blank" rel="noopener noreferrer">
                Visit live app <ExternalLink className="size-4" aria-hidden="true" />
              </a>
            )}
            {project.githubUrl && (
              <a className="button-secondary" href={project.githubUrl} target="_blank" rel="noopener noreferrer">
                View GitHub <Github className="size-4" aria-hidden="true" />
              </a>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
