/**
 * LLM client for the portfolio's AI tooling — NVIDIA Integrate API primary,
 * OpenRouter fallback. Both are OpenAI-compatible; the key lives in .env
 * (gitignored) or the environment, never in source.
 *
 *   import { chat, chatJson, POOL } from "./lib/llm.mjs";
 *   const { content, model } = await chat([{ role: "user", content: "..." }]);
 *
 * Policy (owner's instruction, 2026-08-23):
 *   - the model pool runs with no client-side limits: no token ceilings,
 *     no request throttling, no per-model quotas
 *   - requests fall through the pool automatically when a model is busy or
 *     erroring, so one unavailable model never blocks a run
 */

import fs from "node:fs";
import path from "node:path";

const PROVIDERS = {
  nvidia: {
    endpoint: "https://integrate.api.nvidia.com/v1/chat/completions",
    keyVar: "NVIDIA_API_KEY",
    // The owner's model list, strongest first for fallback order. All free
    // tier, no caps.
    pool: [
      "nvidia/nemotron-3-ultra-550b-a55b",
      "nvidia/nemotron-3-super-120b-a12b",
      "google/gemma-4-31b-it",
      "nvidia/nemotron-3.5-lightning-30b-a3b",
      "nvidia/nemotron-3-nano-30b-a3b",
      "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning",
      "nvidia/nemotron-nano-12b-v2-vl",
      "nvidia/nvidia-nemotron-nano-9b-v2",
      "poolside/laguna-xs-2.1",
      "thinkingmachines/inkling",
    ],
  },
  openrouter: {
    endpoint: "https://openrouter.ai/api/v1/chat/completions",
    keyVar: "OPENROUTER_API_KEY",
    pool: [
      "z-ai/glm-5.2:free",
      "google/gemma-4-31b-it:free",
      "nvidia/nemotron-3-super-120b-a12b:free",
      "thinkingmachines/inkling-small:free",
      "poolside/laguna-s-2.1:free",
      "google/gemma-4-26b-a4b-it:free",
      "cohere/north-mini-code:free",
      "dots-studio/dots-3-note-preview:free",
      "liquid/lfm-2.5-2.6b:free",
    ],
  },
};

/** Safety classifier — content checks only, never general chat. */
export const SAFETY_MODEL = "nvidia/nemotron-3.5-content-safety";

export const POOL = PROVIDERS.nvidia.pool;

function loadEnvKey(keyVar) {
  if (process.env[keyVar]) return process.env[keyVar];
  const envPath = path.join(process.cwd(), ".env");
  if (fs.existsSync(envPath)) {
    for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
      const match = line.match(new RegExp(`^${keyVar}=(.+)$`));
      if (match) return match[1].trim();
    }
  }
  return undefined;
}

export class LlmError extends Error {
  constructor(message, status, model) {
    super(message);
    this.status = status;
    this.model = model;
  }
}

function providerOrder() {
  // NVIDIA first; OpenRouter only serves if its key exists.
  const order = ["nvidia"];
  if (loadEnvKey("OPENROUTER_API_KEY")) order.push("openrouter");
  return order;
}

/**
 * One chat completion. `model` pins a model; otherwise the pool falls through
 * in order, then to the next provider's pool. No max_tokens is sent unless
 * the caller passes one — uncapped by default.
 */
export async function chat(messages, { model, provider, temperature, json, signal } = {}) {
  const providers = provider ? [provider] : providerOrder();
  const failures = [];

  for (const name of providers) {
    const config = PROVIDERS[name];
    const key = loadEnvKey(config.keyVar);
    if (!key) {
      failures.push(`${name}: no ${config.keyVar}`);
      continue;
    }

    const pool = model ? [model] : config.pool;
    for (const candidate of pool) {
      const res = await fetch(config.endpoint, {
        method: "POST",
        headers: {
          authorization: `Bearer ${key}`,
          "content-type": "application/json",
          "user-agent": "henry-builds-ai",
          accept: "application/json",
        },
        body: JSON.stringify({
          model: candidate,
          messages,
          ...(temperature !== undefined ? { temperature } : {}),
          ...(json ? { response_format: { type: "json_object" } } : {}),
        }),
        signal: signal ?? AbortSignal.timeout(180_000),
      });

      if (res.ok) {
        const data = await res.json();
        const content = data.choices?.[0]?.message?.content;
        if (typeof content === "string" && content.length > 0) {
          return { content, model: candidate, provider: name, usage: data.usage };
        }
        failures.push(`${name}/${candidate}: empty response`);
        continue;
      }

      const body = await res.text().catch(() => "");
      if (res.status === 401 || res.status === 403) {
        // Key rejected for this provider — try the next provider entirely.
        failures.push(`${name}/${candidate}: key rejected ${res.status}`);
        break;
      }
      failures.push(`${name}/${candidate}: ${res.status} ${body.slice(0, 120)}`);
    }
  }

  throw new LlmError(`all models failed:\n  ${failures.join("\n  ")}`, 502);
}

/** Parse a JSON-object response, tolerating code fences and prose wrappers. */
export async function chatJson(messages, options = {}) {
  const result = await chat(messages, { ...options, json: true });
  const text = result.content.trim();
  try {
    return { ...result, data: JSON.parse(text) };
  } catch {
    const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    const braces = text.match(/\{[\s\S]*\}/);
    const raw = fenced ? fenced[1] : braces ? braces[0] : null;
    if (raw) {
      try {
        return { ...result, data: JSON.parse(raw) };
      } catch {
        // fall through
      }
    }
    throw new LlmError(`model ${result.model} returned unparseable JSON`, 502, result.model);
  }
}
