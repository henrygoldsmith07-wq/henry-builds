/**
 * Claim taxonomy v1 — TYPE of claim only. Never proof.
 * Authoritative proof: validate-registry.mjs + audit-claims.mjs.
 * Scope: evidence/claims/registry/validation only. Never import from src/.
 */
export const TAXONOMY_VERSION = "1.0.0";
export const TAXONOMY_MAJOR = "1";
export const CONFIDENCE_THRESHOLD = 0.7;
export const FALLBACK_CATEGORY = "other";
export const CLAIM_CATEGORIES = ["performance","reliability","security","accessibility","usability","feature","benchmark","testing","deployment","unsupported-or-unclear","other"];
export const TAXONOMY_INSTRUCTIONS = "Classify the TYPE of product claim, not whether it is true or proven. performance=speed/latency/reduction/efficiency. reliability=correctness/stability/retention. security=isolation/safety/auth/privacy. accessibility=disability/WCAG/axe/keyboard. usability=ease/clarity/workflow. feature=capability exists. benchmark=reproducible number. testing=automated tests. deployment=live/deployed. unsupported-or-unclear=vague superlative. other=none fit.";
