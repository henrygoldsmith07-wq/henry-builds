/**
 * Intelligent contact form with capability tracking.
 * 
 * This component enhances the existing contact system by:
 * - Tracking which capabilities/projects interest visitors
 * - Categorizing inquiries by type and priority
 * - Maintaining proof-first principles (no unverified claims)
 * 
 * The form is optional - basic contact still works via direct email links.
 */

import { useState } from "react";
import { Check, Mail, Sparkles } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  contactFormDataSchema,
  type ContactFormData,
  type InterestArea,
} from "@/types/contact";
import { projects } from "@/data/registry";
import { profile } from "@/data/profile";

/**
 * Project interest selector showing featured projects with evidence indicators.
 */
function ProjectInterestSelector({
  selectedProjects,
  onToggleProject,
}: {
  selectedProjects: string[];
  onToggleProject: (slug: string) => void;
}) {
  const featured = projects.filter((p) => p.stage !== "archived").slice(0, 6);

  return (
    <div className="space-y-4">
      <p className="text-sm font-medium">
        Which projects caught your attention? <span className="text-destructive">*</span>
      </p>
      <p className="text-xs text-muted-foreground">
        Select at least one — required
      </p>
      
      <div className="grid gap-3 sm:grid-cols-2">
        {featured.map((project) => {
          const isSelected = selectedProjects.includes(project.slug);
          
          return (
            <button
              key={project.slug}
              type="button"
              onClick={() => onToggleProject(project.slug)}
              className={`group flex items-start gap-3 rounded-lg border p-4 text-left transition-all ${
                isSelected
                  ? "border-primary bg-primary/5"
                  : "border-border bg-background hover:bg-muted"
              }`}
              aria-pressed={isSelected}
            >
              <div
                className={`mt-0.5 size-5 shrink-0 rounded-md border ${
                  isSelected
                    ? "bg-primary border-primary"
                    : "border-border bg-background"
                } flex items-center justify-center transition-colors`}
              >
                {isSelected && <Check className="size-3.5 text-primary" />}
              </div>
              
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{project.name}</p>
                <p className="mt-0.5 text-xs text-muted-foreground truncate">
                  {project.tagline}
                </p>
                <p className="mt-2 text-[10px] text-muted-foreground/70">
                  {project.caseStudy.outcomes.filter((outcome) => outcome.evidence.length > 0).length} evidenced outcomes •{" "}
                  {project.caseStudy.limitations.length} documented limitations
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Main intelligent contact form component.
 * Integrates into the landing page or can be used standalone.
 */
export function ContactIntelligence() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  
  // Form state
  const [selectedInterestAreas, setSelectedInterestAreas] = useState<InterestArea[]>([]);
  const [selectedProjects, setSelectedProjects] = useState<string[]>([]);
  
  // Initialize form with react-hook-form
  const {
    register,
    getValues,
    watch,
    formState: { errors },
  } = useForm<ContactFormData>({
    resolver: zodResolver(contactFormDataSchema),
    defaultValues: {
      name: "",
      email: "",
      inquiryType: "consulting",
      interestedProjects: [],
      interestAreas: [],
      message: "",
      consent: {
        emailConsent: false,
        analyticsConsent: false,
      },
      timestamp: new Date().toISOString(),
    },
  });

  // Submission requires the visitor's explicit email consent. Watch the
  // checkbox so the submit button stays disabled until it is actually checked.
  // react-hook-form's `watch` is intentionally outside React Compiler's
  // memoisation model; this component is not memoised and the value is read
  // only to gate a button, so the warning does not apply here.
  // eslint-disable-next-line react-hooks/incompatible-library
  const emailConsentGiven = watch("consent.emailConsent") === true;
  const submitDisabled =
    isSubmitting ||
    selectedProjects.length === 0 ||
    selectedInterestAreas.length === 0 ||
    !emailConsentGiven;

  // Interest area definitions with descriptions mapped from registry demonstrates
  const interestAreas: Array<{
    id: InterestArea;
    label: string;
    description: string;
    examples: string[];
  }> = [
    {
      id: "backend",
      label: "Backend Systems",
      description: "APIs, databases, server architecture, data pipelines",
      examples: ["Pulse's statistical backend", "Daily Debate's debate engine"],
    },
    {
      id: "frontend",
      label: "Frontend Development",
      description: "React, Vue, UI components, interactive experiences",
      examples: ["Arise's dashboard UI", "Habit Tracker's mobile view"],
    },
    {
      id: "mobile",
      label: "Mobile Applications",
      description: "iOS, Android, cross-platform mobile development",
      examples: ["Dictation Typer mobile", "Meeting Recorder app"],
    },
    {
      id: "data-science",
      label: "Data Science & Analytics",
      description: "Statistical analysis, data visualization, insights extraction",
      examples: ["Pulse's metrics dashboard", "RTK's test analytics"],
    },
    {
      id: "machine-learning",
      label: "Machine Learning",
      description: "ML models, AI integration, intelligent automation",
      examples: ["Le Studio French tutor", "Report's content recommendations"],
    },
    {
      id: "ui-ux",
      label: "UI/UX Design",
      description: "User research, interface design, accessibility",
      examples: ["Reflect's journaling flow", "Noticed's notification design"],
    },
    {
      id: "system-design",
      label: "System Architecture",
      description: "Scalable systems, distributed architecture, infrastructure",
      examples: ["Agent OS Control Room", "World News aggregator"],
    },
    {
      id: "research",
      label: "Research & Prototyping",
      description: "Experimentation, proof-of-concept, feasibility studies",
      examples: ["Revise experiments", "Concept explorations"],
    },
    {
      id: "tooling",
      label: "Developer Tooling",
      description: "CLI tools, build systems, developer experience",
      examples: ["Registry validation scripts", "Build automation"],
    },
    {
      id: "devops",
      label: "DevOps & CI/CD",
      description: "Testing, deployment, monitoring, reliability engineering",
      examples: ["CI pipeline optimization", "Automated testing frameworks"],
    },
  ];

  // Toggle interest area selection
  const toggleInterestArea = (areaId: InterestArea) => {
    setSelectedInterestAreas((prev) =>
      prev.includes(areaId)
        ? prev.filter((id) => id !== areaId)
        : [...prev, areaId]
    );
  };

  // Toggle project selection
  const toggleProject = (slug: string) => {
    setSelectedProjects((prev) =>
      prev.includes(slug)
        ? prev.filter((id) => id !== slug)
        : [...prev, slug]
    );
  };

  // Handle form submission. The two custom selectors are not DOM inputs, so
  // react-hook-form's resolver never sees them; validate the whole payload
  // explicitly instead of silently rejecting a filled-in form.
  const onSubmit = async () => {
    setSubmitError(null);

    const values = getValues();
    // Registered text inputs contribute "" when left blank. The schema treats
    // these optional fields as absent only when they are undefined, so plain
    // empty strings would otherwise make a valid inquiry impossible to send.
    const blankToUndefined = (value?: string) =>
      typeof value === "string" && value.trim() === "" ? undefined : value;

    const parsed = contactFormDataSchema.safeParse({
      ...values,
      name: blankToUndefined(values.name),
      email: blankToUndefined(values.email),
      referralSource: blankToUndefined(values.referralSource),
      interestAreas: selectedInterestAreas,
      interestedProjects: selectedProjects.map((slug) => ({
        slug,
        reason: "Interested in discussing this project",
      })),
      timestamp: values.timestamp || new Date().toISOString(),
    });

    if (!parsed.success) {
      const fields = Array.from(
        new Set(parsed.error.issues.map((issue) => issue.path.join("."))),
      ).join(", ");
      setSubmitError(`Please complete or check these fields: ${fields}.`);
      return;
    }

    const data = parsed.data;

    // There is no application backend on this site. Without an explicit
    // endpoint, submitting to a hardcoded /api/contact always failed and then
    // opened a mailto addressed to the visitor's own (optional) email. Say so
    // plainly instead of pretending the message was received.
    const endpoint = (import.meta.env.VITE_CONTACT_ENDPOINT as string | undefined)?.trim();
    if (!endpoint) {
      setSubmitError(
        "Direct contact is not configured on this site yet. You can reach me on GitHub instead.",
      );
      return;
    }

    // The deployed CSP is `connect-src 'self'`, so a cross-origin endpoint can
    // never be reached from the browser. Resolve the configured value against
    // this page and require a same-origin result before making any request.
    // Anything else fails visibly (via submitError) and sends nothing.
    let requestUrl: URL;
    try {
      requestUrl = new URL(endpoint, window.location.href);
    } catch {
      setSubmitError("The configured contact endpoint is not a valid URL. No request was sent.");
      return;
    }
    if (requestUrl.origin !== window.location.origin) {
      setSubmitError(
        "The configured contact endpoint is not on this site's origin, so no request was sent.",
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          processedAt: new Date().toISOString(),
          version: "1.0",
        }),
      });

      if (!response.ok) {
        throw new Error(`Contact endpoint returned ${response.status}`);
      }

      setSubmitSuccess(true);
    } catch (error) {
      console.error("Contact form error:", error);
      setSubmitError(
        "Your message could not be sent. Please try again or reach me on GitHub.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitSuccess) {
    return (
      <div className="rounded-xl border border-green-500/30 bg-green-500/5 p-8 text-center">
        <Mail className="mx-auto size-12 text-green-500" />
        <h3 className="mt-4 text-xl font-semibold">Message sent</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Thanks for reaching out. Your inquiry was delivered to the configured
          contact endpoint.
        </p>
        <button
          onClick={() => {
            setSubmitSuccess(false);
            setIsExpanded(false);
          }}
          className="mt-6 button-secondary"
        >
          Send another message
        </button>
      </div>
    );
  }

  if (!isExpanded) {
    return (
      <button
        onClick={() => setIsExpanded(true)}
        className="w-full rounded-xl border border-dashed border-border bg-background p-6 text-left transition-colors hover:border-primary/50 hover:bg-muted"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Sparkles className="size-5 text-foreground/50" />
            <span className="font-medium">Smart contact options</span>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">
              Tell me what interests you
            </p>
          </div>
        </div>
      </button>
    );
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        void onSubmit();
      }}
      className="space-y-6"
    >
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Let's talk about it</h3>
        <button
          type="button"
          onClick={() => setIsExpanded(false)}
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          Close
        </button>
      </div>

      {/* Inquiry type */}
      <div className="space-y-2">
        <label htmlFor="inquiryType" className="text-sm font-medium">
          What kind of collaboration? <span className="text-destructive">*</span>
        </label>
        <select
          id="inquiryType"
          {...register("inquiryType")}
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
        >
          <option value="consulting">Consulting / Contract work</option>
          <option value="employment">Full-time employment</option>
          <option value="collaboration">Project collaboration</option>
          <option value="speaking">Speaking / Consulting</option>
          <option value="learning">Learning / Questions</option>
          <option value="other">Other</option>
        </select>
        {errors.inquiryType && (
          <p className="text-xs text-destructive">{errors.inquiryType.message}</p>
        )}
      </div>

      {/* Referral source */}
      <div className="space-y-2">
        <label htmlFor="referralSource" className="text-sm font-medium">
          How did you find me? (optional)
        </label>
        <input
          id="referralSource"
          type="text"
          {...register("referralSource")}
          placeholder="e.g., GitHub, LinkedIn, industry event, colleague referral"
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
        />
      </div>

      {/* Project interests */}
      <ProjectInterestSelector
        selectedProjects={selectedProjects}
        onToggleProject={toggleProject}
      />

      {/* Interest areas */}
      <div className="space-y-3">
        <p className="text-sm font-medium">
          What specific capabilities interest you? <span className="text-destructive">*</span>
        </p>
        <p className="text-xs text-muted-foreground">
          Select all that apply. Helps me route your inquiry appropriately.
        </p>
        
        <div className="grid gap-3 sm:grid-cols-2">
          {interestAreas.map((area) => {
            const isSelected = selectedInterestAreas.includes(area.id);
            
            return (
              <button
                key={area.id}
                type="button"
                onClick={() => toggleInterestArea(area.id)}
                className={`flex items-start gap-3 rounded-lg border p-3 text-left transition-all ${
                  isSelected
                    ? "border-primary bg-primary/5"
                    : "border-border bg-background hover:bg-muted"
                }`}
                aria-pressed={isSelected}
              >
                <div
                  className={`mt-0.5 size-4 shrink-0 rounded border ${
                    isSelected
                      ? "bg-primary border-primary"
                      : "border-border bg-background"
                  } flex items-center justify-center transition-colors`}
                >
                  {isSelected && <Check className="size-3 text-primary" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{area.label}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Message */}
      <div className="space-y-2">
        <label htmlFor="message" className="text-sm font-medium">
          Your message <span className="text-destructive">*</span>
        </label>
        <textarea
          id="message"
          rows={6}
          {...register("message")}
          placeholder="Tell me about your project, timeline, budget, and what specific expertise you need..."
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary resize-none"
        />
        {errors.message && (
          <p className="text-xs text-destructive">{errors.message.message}</p>
        )}
        <p className="text-xs text-muted-foreground">
          Min 20 characters. Include specifics about scope, timeline, and goals.
        </p>
      </div>

      {/* Contact info (optional) */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <label htmlFor="name" className="text-sm font-medium">Name (optional)</label>
          <input
            id="name"
            type="text"
            {...register("name")}
            placeholder="Your name"
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
        <div className="space-y-2">
          <label htmlFor="email" className="text-sm font-medium">Email (optional)</label>
          <input
            id="email"
            type="email"
            {...register("email")}
            placeholder="your@email.com"
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
      </div>

      {/* Consent */}
      <div className="rounded-lg border border-border bg-muted p-4 text-sm">
        <p className="font-medium mb-3">Privacy & Consent *</p>

        <div className="space-y-3">
          <label className="flex items-start gap-2">
            <input
              type="checkbox"
              {...register("consent.emailConsent")}
              className="mt-0.5 size-4"
            />
            <span>
              I agree to receive a response via email. Your details are sent only to this site's
              configured contact endpoint when you submit with this consent.
              <span className="text-destructive">*</span>
            </span>
          </label>
        </div>
      </div>

      {submitError && (
        <p
          role="alert"
          className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-foreground"
        >
          {submitError}{" "}
          <a
            href={profile.contact.github}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium underline"
          >
            Open GitHub
          </a>
        </p>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={submitDisabled}
        className={`w-full rounded-lg py-3 text-sm font-medium transition-all ${
          submitDisabled
            ? "cursor-not-allowed bg-muted text-muted-foreground"
            : "button-primary"
        }`}
      >
        {isSubmitting ? "Sending..." : "Send inquiry"}
      </button>

      {/* Helper text */}
      <p className="text-xs text-muted-foreground">
        Required fields marked with *. This intelligent form helps me understand your needs better and respond more effectively.
      </p>
    </form>
  );
}
