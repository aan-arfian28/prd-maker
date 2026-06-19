import type { AiModelInfo, ProviderType } from "./types";

/* ------------------------------------------------------------------ */
/*  Per-provider static fallback model lists                          */
/* ------------------------------------------------------------------ */

export const FALLBACK_MODELS_OPENAI: AiModelInfo[] = [
  { name: "gpt-4o", displayName: "GPT-4o", description: "Flagship multimodal model" },
  { name: "gpt-4o-mini", displayName: "GPT-4o Mini", description: "Smaller, faster, cheaper" },
  { name: "gpt-4.1", displayName: "GPT-4.1", description: "Latest GPT-4 variant" },
  { name: "o4-mini", displayName: "o4 Mini", description: "Fast reasoning model" },
  { name: "o3", displayName: "O3", description: "Advanced reasoning model" },
];

export const FALLBACK_MODELS_DEEPSEEK: AiModelInfo[] = [
  { name: "deepseek-chat", displayName: "deepseek-chat", description: "DeepSeek-V3 — fast and efficient" },
  { name: "deepseek-reasoner", displayName: "deepseek-reasoner", description: "DeepSeek-R1 — advanced reasoning" },
];

export const FALLBACK_MODELS_GEMINI: AiModelInfo[] = [
  { name: "gemini-2.5-flash", displayName: "Gemini 2.5 Flash", description: "Fast, efficient, latest" },
  { name: "gemini-2.5-pro", displayName: "Gemini 2.5 Pro", description: "Most capable Gemini model" },
  { name: "gemini-2.0-flash", displayName: "Gemini 2.0 Flash", description: "Previous-gen fast model" },
];

export const FALLBACK_MODELS_GROK: AiModelInfo[] = [
  { name: "grok-3", displayName: "Grok 3", description: "Latest Grok model" },
  { name: "grok-3-mini", displayName: "Grok 3 Mini", description: "Faster, lighter Grok" },
];

export const FALLBACK_MODELS_ANTHROPIC: AiModelInfo[] = [
  { name: "claude-sonnet-4-6-20250514", displayName: "Claude Sonnet 4.6", description: "Best balance of speed & capability" },
  { name: "claude-opus-4-8-20250514", displayName: "Claude Opus 4.8", description: "Most powerful Claude model" },
  { name: "claude-haiku-4-5-20251001", displayName: "Claude Haiku 4.5", description: "Fastest Claude model" },
];

/* ------------------------------------------------------------------ */
/*  Master fallback map                                               */
/* ------------------------------------------------------------------ */

export const FALLBACK_MODELS: Record<ProviderType, AiModelInfo[]> = {
  openai: FALLBACK_MODELS_OPENAI,
  deepseek: FALLBACK_MODELS_DEEPSEEK,
  gemini: FALLBACK_MODELS_GEMINI,
  grok: FALLBACK_MODELS_GROK,
  anthropic: FALLBACK_MODELS_ANTHROPIC,
};

/* ------------------------------------------------------------------ */
/*  Dynamic model fetching                                            */
/* ------------------------------------------------------------------ */

/**
 * Fetch available models from the provider's API.
 * For providers without a models endpoint (Gemini, Anthropic), returns fallback.
 */
export async function fetchAvailableModels(
  provider: ProviderType,
  apiKey: string
): Promise<AiModelInfo[]> {
  const fallback = FALLBACK_MODELS[provider] || FALLBACK_MODELS_DEEPSEEK;

  // Providers that don't have a public models list endpoint
  if (provider === "gemini" || provider === "anthropic") {
    return fallback;
  }

  // OpenAI-compatible providers (openai, deepseek, grok)
  if (!apiKey) return fallback;

  const endpoints: Record<string, string> = {
    openai: "https://api.openai.com/v1/models",
    deepseek: "https://api.deepseek.com/v1/models",
    grok: "https://api.x.ai/v1/models",
  };

  const url = endpoints[provider];
  if (!url) return fallback;

  try {
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(8000),
    });

    if (!response.ok) return fallback;

    const data = await response.json();
    if (!data.data || !Array.isArray(data.data)) return fallback;

    const models: AiModelInfo[] = data.data
      .filter((m: { id?: string }) => !!m.id)
      .map((m: { id: string; owned_by?: string }) => ({
        name: m.id,
        displayName: m.id,
        description: m.owned_by || "",
      }))
      .sort((a: AiModelInfo, b: AiModelInfo) =>
        a.displayName.localeCompare(b.displayName)
      );

    return models.length > 0 ? models : fallback;
  } catch {
    return fallback;
  }
}

/* ------------------------------------------------------------------ */
/*  Normalize model name                                              */
/* ------------------------------------------------------------------ */

/** Returns a default model for the given provider. */
export function normalizeModel(
  provider: ProviderType,
  input: string | undefined | null
): string {
  if (input) return input;
  const fallback = FALLBACK_MODELS[provider];
  return fallback?.[0]?.name || "deepseek-chat";
}
