/**
 * Contact form data schemas and types.
 * 
 * This module defines the structure for the intelligent contact system,
 * which tracks visitor interests without compromising privacy or verification principles.
 */
import { z } from "zod";

/**
 * Interest areas captured when a visitor contacts Henry.
 * Mapped from demonstrated capabilities in case studies.
 */
export const interestAreaSchema = z.enum([
  "backend",
  "frontend",
  "mobile",
  "data-science",
  "machine-learning",
  "devops",
  "ui-ux",
  "system-design",
  "research",
  "tooling",
]);

export type InterestArea = z.infer<typeof interestAreaSchema>;

/**
 * What brought the visitor to the site.
 * Helps understand discovery channels.
 */
export const referralSourceSchema = z.string().min(1).max(200);

export type ReferralSource = z.infer<typeof referralSourceSchema>;

/**
 * Type of engagement the visitor is interested in.
 * Used to prioritize and route inquiries appropriately.
 */
export const inquiryTypeSchema = z.enum([
  "consulting",
  "employment",
  "collaboration",
  "speaking",
  "learning",
  "other",
]);

export type InquiryType = z.infer<typeof inquiryTypeSchema>;

/**
 * Priority level inferred from visitor context.
 * Not set by user, but derived from behavior/context.
 */
export const priorityLevelSchema = z.enum(["low", "medium", "high", "urgent"]);

export type PriorityLevel = z.infer<typeof priorityLevelSchema>;

/**
 * Which specific capabilities caught their attention.
 * Links back to demonstrable projects via project slugs.
 */
export const projectInterestSchema = z.object({
  slug: z.string().min(1),
  reason: z.string().min(10).max(500),
});

export type ProjectInterest = z.infer<typeof projectInterestSchema>;

/**
 * Consent flags for privacy compliance.
 * Required before any personal data processing.
 */
export const consentFlagsSchema = z.object({
  emailConsent: z.boolean(),
  analyticsConsent: z.boolean(),
  retentionPeriod: z.enum(["30days", "90days", "1year", "never"]),
});

export type ConsentFlags = z.infer<typeof consentFlagsSchema>;

/**
 * Complete contact form submission payload.
 * All fields validated before storage/processing.
 */
export const contactFormDataSchema = z.object({
  // Contact information (optional - can be just project interests)
  name: z.string().min(1).max(200).optional(),
  email: z.string().email().optional(),
  
  // Engagement metadata
  inquiryType: inquiryTypeSchema,
  referralSource: referralSourceSchema.optional(),
  priorityLevel: priorityLevelSchema.optional(),
  
  // Project interests - at least one required
  interestedProjects: z.array(projectInterestSchema).min(1),
  
  // Capability interests - mapped from registry demonstrates data
  interestAreas: z.array(interestAreaSchema).min(1),
  
  // Message field
  message: z.string().min(20).max(2000),
  
  // Privacy consent - always required
  consent: consentFlagsSchema,
  
  // Client-side metadata
  timestamp: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: "Must be a valid ISO date string",
  }),
  userAgent: z.string().optional(),
  currentUrl: z.string().url().optional(),
});

export type ContactFormData = z.infer<typeof contactFormDataSchema>;

/**
 * Processed contact record ready for storage/forwarding.
 * Sanitized version without client-side metadata.
 */
export const processedContactRecordSchema = z.object({
  id: z.string(),
  createdAt: z.string(),
  inquiryType: inquiryTypeSchema,
  referralSource: z.string().optional(),
  interestAreas: z.array(interestAreaSchema),
  projectInterests: z.array(projectInterestSchema),
  messageSummary: z.string().max(500),
  contactMethod: z.enum(["email", "form"]),
  consentVersion: z.string(),
  status: z.enum(["new", "processed", "archived"]),
});

export type ProcessedContactRecord = z.infer<typeof processedContactRecordSchema>;

/**
 * Aggregate interest statistics for site optimization.
 * Anonymized and used internally only.
 */
export const interestStatisticsSchema = z.object({
  periodStart: z.string(),
  periodEnd: z.string(),
  totalInquiries: z.number().int().nonnegative(),
  inquiryTypeDistribution: z.record(inquiryTypeSchema, z.number().int()),
  interestAreaDistribution: z.record(interestAreaSchema, z.number().int()),
  topInterestedProjects: z.array(z.object({
    slug: z.string(),
    count: z.number().int(),
  })).max(10),
  averageMessageLength: z.number(),
});

export type InterestStatistics = z.infer<typeof interestStatisticsSchema>;
