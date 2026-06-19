import OpenAI from "openai";
import type { AiProvider } from "./types";
import type { AiModelInfo } from "@/lib/types";
import { FALLBACK_MODELS_OPENAI, FALLBACK_MODELS_DEEPSEEK, FALLBACK_MODELS_GROK } from "@/lib/modelList";

/* ------------------------------------------------------------------ */
/*  OpenAI-compatible provider factory                                */
/* ------------------------------------------------------------------ */

interface CompatibleConfig {
  name: string;
  baseURL: string;
  defaultModel: string;
  modelsEndpoint: string | null;
  fallbackModels: AiModelInfo[];
}

/**
 * Create an AiProvider for any OpenAI-compatible API.
 * Covers: OpenAI, DeepSeek, Grok (xAI)
 */
export function createOpenAICompatibleProvider(config: CompatibleConfig): AiProvider {
  const { name, baseURL, defaultModel, modelsEndpoint, fallbackModels } = config;

  function createClient(apiKey: string) {
    return new OpenAI({ apiKey, baseURL });
  }

  return {
    name,
    defaultModel,

    async generateText(systemPrompt, userPrompt, apiKey, model) {
      const client = createClient(apiKey);
      const result = await client.chat.completions.create({
        model: model || defaultModel,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      });
      return result.choices[0]?.message?.content || "";
    },

    generateStream(systemPrompt, userPrompt, apiKey, model) {
      const client = createClient(apiKey);
      const stream = client.chat.completions.create({
        model: model || defaultModel,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        stream: true,
      });

      // Wrap the SDK stream into a proper async iterable
      return (async function* () {
        for await (const chunk of await stream) {
          const delta = chunk.choices[0]?.delta?.content;
          if (delta) yield delta;
        }
      })();
    },

    async chatCompletion(systemPrompt, messages, apiKey, model) {
      const client = createClient(apiKey);
      const result = await client.chat.completions.create({
        model: model || defaultModel,
        messages: [
          { role: "system", content: systemPrompt },
          ...messages.map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
        ],
      });
      return result.choices[0]?.message?.content || "";
    },

    async fetchModels(apiKey) {
      if (!apiKey || !modelsEndpoint) return fallbackModels;
      try {
        const response = await fetch(modelsEndpoint, {
          headers: {
            Authorization: `Bearer ${apiKey}`,
          },
          signal: AbortSignal.timeout(8000),
        });
        if (!response.ok) return fallbackModels;
        const data = await response.json();
        if (!data.data || !Array.isArray(data.data)) return fallbackModels;

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

        return models.length > 0 ? models : fallbackModels;
      } catch {
        return fallbackModels;
      }
    },
  };
}

/* ------------------------------------------------------------------ */
/*  Pre-built instances                                               */
/* ------------------------------------------------------------------ */

export const openaiProvider = createOpenAICompatibleProvider({
  name: "OpenAI (ChatGPT)",
  baseURL: "https://api.openai.com/v1",
  defaultModel: "gpt-4o",
  modelsEndpoint: "https://api.openai.com/v1/models",
  fallbackModels: FALLBACK_MODELS_OPENAI,
});

export const deepseekProvider = createOpenAICompatibleProvider({
  name: "DeepSeek",
  baseURL: "https://api.deepseek.com/v1",
  defaultModel: "deepseek-chat",
  modelsEndpoint: "https://api.deepseek.com/v1/models",
  fallbackModels: FALLBACK_MODELS_DEEPSEEK,
});

export const grokProvider = createOpenAICompatibleProvider({
  name: "Grok (xAI)",
  baseURL: "https://api.x.ai/v1",
  defaultModel: "grok-3",
  modelsEndpoint: "https://api.x.ai/v1/models",
  fallbackModels: FALLBACK_MODELS_GROK,
});
