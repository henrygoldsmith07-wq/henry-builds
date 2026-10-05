import { Download, Github, Linkedin, Mail } from "lucide-react";
import { profile } from "@/data/profile";

/**
 * The recruiter-facing contact block.
 *
 * Everything it renders comes from `profile.contact`. A field that is empty is
 * not rendered at all — no placeholder row, no "coming soon", no mailto with a
 * blank address. That is deliberate: the site's proposition is that it does not
 * claim more than it can show, and a contact section with three dead buttons
 * would be the loudest possible contradiction of that.
 *
 * To add an email, a LinkedIn profile or a CV, edit `profile.ts`. This file
 * needs no change, and no contact detail is hard-coded anywhere else.
 */
export function ContactActions({ variant = "default" }: { variant?: "default" | "compact" }) {
  const { github, email, linkedin, cv } = profile.contact;
  const primary = variant === "default" ? "button-primary" : "button-secondary";
  const secondary = variant === "default" ? "button-secondary" : "button-secondary";

  return (
    <div className="flex flex-wrap gap-3">
      <a href={github} target="_blank" rel="noopener noreferrer" className={primary}>
        GitHub <Github className="size-4" aria-hidden="true" />
        <span className="sr-only"> — opens Henry Goldsmith's GitHub profile in a new tab</span>
      </a>

      {cv && (
        <a href={cv} className={secondary} download>
          <Download className="size-4" aria-hidden="true" />
          CV
          <span className="sr-only"> — downloads Henry Goldsmith's CV</span>
        </a>
      )}

      {linkedin && (
        <a href={linkedin} target="_blank" rel="noopener noreferrer" className={secondary}>
          LinkedIn <Linkedin className="size-4" aria-hidden="true" />
          <span className="sr-only"> — opens Henry Goldsmith's LinkedIn profile in a new tab</span>
        </a>
      )}

      {email && (
        <a href={`mailto:${email}`} className={secondary}>
          Email <Mail className="size-4" aria-hidden="true" />
        </a>
      )}
    </div>
  );
}

/**
 * A compact version for the site header area, where the full set of actions
 * would crowd the nav on a phone. Renders the CV only when one exists.
 */
export function ContactActionsCompact() {
  const { cv } = profile.contact;
  if (!cv) return null;
  return (
    <a href={cv} className="button-secondary" download>
      <Download className="size-4" aria-hidden="true" />
      CV
      <span className="sr-only"> — downloads Henry Goldsmith's CV</span>
    </a>
  );
}