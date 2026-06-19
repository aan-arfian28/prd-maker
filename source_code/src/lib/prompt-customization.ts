import { DEFAULT_PROMPTS } from "./prompts";

/* ------------------------------------------------------------------ */
/*  Storage key & types                                               */
/* ------------------------------------------------------------------ */

const STORAGE_KEY = "ai-prd-maker-custom-prompts";

/** Map of prompt key → custom prompt text. Only overrides are stored. */
export type CustomPromptMap = Record<string, string>;

/* ------------------------------------------------------------------ */
/*  localStorage helpers (client-side only)                           */
/* ------------------------------------------------------------------ */

export function loadCustomPrompts(): CustomPromptMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // ignore
  }
  return {};
}

export function saveCustomPrompts(map: CustomPromptMap): void {
  if (typeof window === "undefined") return;
  try {
    // Only store entries that actually differ from defaults
    const clean: CustomPromptMap = {};
    for (const [key, value] of Object.entries(map)) {
      if (value && value !== DEFAULT_PROMPTS[key]) {
        clean[key] = value;
      }
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(clean));
  } catch {
    // ignore
  }
}

export function clearCustomPrompts(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

/* ------------------------------------------------------------------ */
/*  Prompt resolution                                                 */
/* ------------------------------------------------------------------ */

/**
 * Returns the effective prompt for a given key:
 * custom override if available, otherwise the default.
 */
export function getEffectivePrompt(
  key: string,
  custom?: CustomPromptMap | null
): string {
  if (custom && custom[key]) return custom[key];
  return DEFAULT_PROMPTS[key] || "";
}

/**
 * Merge custom overrides with defaults to produce the full prompt set.
 * Used server-side when the client sends partial overrides.
 */
export function resolveAllPrompts(
  custom?: CustomPromptMap | null
): Record<string, string> {
  const resolved: Record<string, string> = { ...DEFAULT_PROMPTS };
  if (custom) {
    for (const [key, value] of Object.entries(custom)) {
      if (value) resolved[key] = value;
    }
  }
  return resolved;
}
