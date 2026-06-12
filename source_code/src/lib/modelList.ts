/**
 * Static fallback list of known DeepSeek models.
 * Used when the dynamic fetch from DeepSeek API fails or no API key is available.
 *
 * Last updated: 2026-06-11
 */
export const FALLBACK_MODELS: AiModelInfo[] = [
  {
    name: "deepseek-chat",
    displayName: "deepseek-chat",
    description: "deepseek",
  },
  {
    name: "deepseek-reasoner",
    displayName: "deepseek-reasoner",
    description: "deepseek",
  },
];

export interface AiModelInfo {
  name: string;
  displayName: string;
  description: string;
}

// Keep the old name as an alias for backward compatibility
export type GeminiModelInfo = AiModelInfo;

/**
 * Fetch available DeepSeek models from the DeepSeek API using the provided key.
 * Falls back to the static list on failure.
 */
export async function fetchAvailableModels(
  apiKey: string
): Promise<AiModelInfo[]> {
  if (!apiKey) return FALLBACK_MODELS;

  try {
    const url = "https://api.deepseek.com/v1/models";
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      // Browser fetch from server-side only — this runs in the API route
      signal: AbortSignal.timeout(8000),
    });

    if (!response.ok) return FALLBACK_MODELS;

    const data = await response.json();

    if (!data.data || !Array.isArray(data.data)) {
      return FALLBACK_MODELS;
    }

    // DeepSeek API returns models in OpenAI format: { data: [{ id: "deepseek-chat", owned_by: "deepseek", ... }] }
    const availableModels: AiModelInfo[] = data.data
      .filter((m: { id?: string }) => !!m.id)
      .map((m: { id: string; owned_by?: string }) => ({
        name: m.id,
        displayName: m.id,
        description: m.owned_by || "",
      }))
      .sort((a: AiModelInfo, b: AiModelInfo) =>
        a.displayName.localeCompare(b.displayName)
      );

    return availableModels.length > 0 ? availableModels : FALLBACK_MODELS;
  } catch {
    return FALLBACK_MODELS;
  }
}

/**
 * Normalize user-stored model to full name or fall back to default.
 */
export function normalizeModel(input: string | undefined | null): string {
  if (!input) return "deepseek-chat";
  return input;
}
