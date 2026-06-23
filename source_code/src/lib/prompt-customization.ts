import { getDefaultPrompts } from "./prompts";
import type { Lang } from "./i18n";

/* ------------------------------------------------------------------ */
/*  Storage                                                            */
/* ------------------------------------------------------------------ */

const STORAGE_PREFIX = "ai-prd-maker-custom-prompts-";

/** Map of prompt key → custom prompt text. Only overrides are stored. */
export type CustomPromptMap = Record<string, string>;

function storageKey(lang: Lang): string {
  return STORAGE_PREFIX + lang;
}

export function loadCustomPrompts(lang: Lang): CustomPromptMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(storageKey(lang));
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return {};
}

export function saveCustomPrompts(lang: Lang, map: CustomPromptMap): void {
  if (typeof window === "undefined") return;
  try {
    const defaults = getDefaultPrompts(lang);
    const clean: CustomPromptMap = {};
    for (const [key, value] of Object.entries(map)) {
      if (value && value !== defaults[key]) {
        clean[key] = value;
      }
    }
    localStorage.setItem(storageKey(lang), JSON.stringify(clean));
  } catch { /* ignore */ }
}

export function clearCustomPrompts(lang: Lang): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(storageKey(lang));
  } catch { /* ignore */ }
}

/* ------------------------------------------------------------------ */
/*  Prompt resolution                                                 */
/* ------------------------------------------------------------------ */

export function getEffectivePrompt(
  key: string,
  custom?: CustomPromptMap | null,
  lang?: Lang
): string {
  if (custom && custom[key]) return custom[key];
  return getDefaultPrompts(lang || "id")[key] || "";
}

export function resolveAllPrompts(
  custom?: CustomPromptMap | null,
  lang?: Lang
): Record<string, string> {
  return { ...getDefaultPrompts(lang || "id"), ...(custom || {}) };
}
