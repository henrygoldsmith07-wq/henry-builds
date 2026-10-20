/**
 * Similar capabilities recommendation engine.
 * 
 * Suggests related projects based on demonstrated capabilities.
 * Powered entirely by registry data - no external APIs needed.
 * 
 * Example use case: User reading "Pulse" case study might also be
 * interested in "Rapport" which demonstrates similar grounding validation.
 */

import { ArrowRight, Cpu, Users } from "lucide-react";
import { Link } from "react-router";
import { ProjectPreview } from "./ProjectPreview";
import {
  demonstratesOf,
  projects,
} from "@/data/registry";

interface SimilarCapabilitiesProps {
  currentProject: typeof projects[0];
  maxResults?: number;
}

interface CapabilityMatch {
  project: typeof projects[0];
  matchScore: number;
  matchingCapabilities: string[];
  matchType: "technical" | "product" | "both";
}

/**
 * Calculate similarity score between two projects based on demonstrated capabilities.
 */
function calculateSimilarity(
  current: typeof projects[0],
  candidate: typeof projects[0]
): CapabilityMatch | null {
  const currentDemo = demonstratesOf(current);
  const candidateDemo = demonstratesOf(candidate);
  
  // Skip archived projects and self
  if (candidate.stage === "archived") return null;
  if (current.slug === candidate.slug) return null;
  
  // Find matches
  const technicalMatches = currentDemo.technical.filter((tech) =>
    candidateDemo.technical.some((candTech) => 
      tech.toLowerCase().includes(candTech.split(" ")[0].toLowerCase()) ||
      candTech.toLowerCase().includes(tech.split(" ")[0].toLowerCase())
    )
  );
  
  const productMatches = currentDemo.product.filter((prod) =>
    candidateDemo.product.some((candProd) =>
      prod.toLowerCase().includes(candProd.split(" ")[0].toLowerCase()) ||
      candProd.toLowerCase().includes(prod.split(" ")[0].toLowerCase())
    )
  );
  
  const totalMatches = technicalMatches.length + productMatches.length;
  if (totalMatches === 0) return null;
  
  // Calculate match score
  const matchScore = Math.min(100, Math.round((totalMatches / 4) * 100));
  
  // Determine match type
  const matchType: "technical" | "product" | "both" = 
    technicalMatches.length > 0 && productMatches.length > 0 ? "both" :
    technicalMatches.length > 0 ? "technical" : "product";
  
  return {
    project: candidate,
    matchScore,
    matchingCapabilities: [...technicalMatches, ...productMatches],
    matchType,
  };
}

/**
 * Get similar projects sorted by relevance.
 */
function getSimilarProjects(
  project: typeof projects[0],
  limit: number
): CapabilityMatch[] {
  const matches = projects
    .map((p) => calculateSimilarity(project, p))
    .filter((m): m is CapabilityMatch => m !== null);
  
  return matches
    .sort((a, b) => {
      // Primary sort by score
      if (b.matchScore !== a.matchScore) return b.matchScore - a.matchScore;
      
      // Secondary sort by stage priority (shipped > beta > prototype > research)
      const stagePriority = { shipped: 5, beta: 4, prototype: 3, research: 2 };
      return (stagePriority[b.project.stage] ?? 0) - (stagePriority[a.project.stage] ?? 0);
    })
    .slice(0, limit);
}

/**
 * Component displaying similar project recommendations.
 * Integrated into case study pages to increase engagement.
 */
export function SimilarCapabilities({
  currentProject,
  maxResults = 3,
}: SimilarCapabilitiesProps) {
  const similarMatches = getSimilarProjects(currentProject, [], maxResults);
  
  if (similarMatches.length === 0) {
    return null;
  }
  
  const hasTechnical = similarMatches.some((m) => 
    m.matchType === "technical" || m.matchType === "both"
  );
  const hasProduct = similarMatches.some((m) => 
    m.matchType === "product" || m.matchType === "both"
  );
  
  return (
    <section className="case-section">
      <div className="case-section-head">
        <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-foreground/40">
          {String(Object.keys(similarMatches).length + 1).padStart(2, "0")}
        </span>
        <h2 className="flex items-center gap-2 text-xl font-semibold tracking-[-0.03em]">
          <ArrowRight className="size-4" aria-hidden="true" />
          If you liked this, you might also want to see
        </h2>
      </div>
      
      <div className="mt-6 space-y-6">
        {similarMatches.map(({ project, matchingCapabilities, matchType }) => (
          <Link
            key={project.slug}
            to={`/projects/${project.slug}`}
            className="group block overflow-hidden rounded-xl border border-border bg-background transition-all hover:border-primary/50 hover:shadow-lg"
          >
            <div className="grid gap-6 sm:grid-cols-[1fr_1.2fr]">
              {/* Visual preview */}
              <div className="bg-muted p-4">
                {project.caseStudy.visuals[0] && (
                  <ProjectPreview
                    visual={project.caseStudy.visuals[0]}
                    accent={project.accent}
                    name={project.name}
                  />
                )}
              </div>
              
              {/* Content */}
              <div className="flex flex-col justify-between p-6">
                <div>
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="pill">{project.category}</span>
                    {matchType === "both" && (
                      <span className="pill">Both dimensions</span>
                    )}
                    {matchType === "technical" && (
                      <span className="pill text-foreground/70">Technical match</span>
                    )}
                    {matchType === "product" && (
                      <span className="pill text-foreground/70">Product match</span>
                    )}
                  </div>
                  
                  <h3 className="mt-4 text-2xl font-semibold tracking-[-0.05em] group-hover:text-primary">
                    {project.name}
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {project.tagline}
                  </p>
                  
                  {/* Matching capabilities */}
                  {matchingCapabilities.length > 0 && (
                    <div className="mt-4 rounded-lg border border-border bg-muted p-4">
                      <p className="text-xs font-medium text-muted-foreground">
                        Related because both demonstrate:
                      </p>
                      <ul className="mt-2 space-y-1">
                        {matchingCapabilities.slice(0, 3).map((cap) => (
                          <li key={cap} className="flex items-start gap-2 text-xs">
                            <span className="mt-1 size-1.5 shrink-0 rounded-full bg-primary" />
                            <span>{cap}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
                
                <div className="mt-6 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    {matchType === "technical" && (
                      <Cpu className="size-3.5" aria-hidden="true" />
                    )}
                    {matchType === "product" && (
                      <Users className="size-3.5" aria-hidden="true" />
                    )}
                    {matchType === "both" && (
                      <>
                        <Cpu className="size-3.5" aria-hidden="true" />
                        <Users className="size-3.5" aria-hidden="true" />
                      </>
                    )}
                    <span>
                      {matchingCapabilities.length} shared capability{matchingCapabilities.length > 1 ? "s" : ""}
                    </span>
                  </div>
                  
                  <span className="inline-link">
                    View case study <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-1" />
                  </span>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
      
      <div className="mt-8 text-center text-sm">
        <Link to="/compare" className="inline-link">
          Compare all projects side-by-side <ArrowRight className="size-3.5 inline" />
        </Link>
      </div>
    </section>
  );
}

/**
 * Utility hook to get similar projects programmatically.
 */
export function useSimilarProjects(
  projectSlug: string,
  maxResults: number = 3
) {
  const currentProject = projects.find((p) => p.slug === projectSlug);
  
  if (!currentProject) {
    return {
      similar: [] as CapabilityMatch[],
      isLoading: false,
      error: null as Error | null,
    };
  }
  
  const similarMatches = getSimilarProjects(currentProject, maxResults);
  
  return {
    similar: similarMatches,
    isLoading: false,
    error: null,
  };
}
