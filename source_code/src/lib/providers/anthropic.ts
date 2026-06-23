import type { AiProvider } from "./types";
import type { AiModelInfo } from "@/lib/types";
import { FALLBACK_MODELS_ANTHROPIC } from "@/lib/modelList";

/* ------------------------------------------------------------------ */
/*  Anthropic Claude provider (Messages API via fetch)                */
/* ------------------------------------------------------------------ */

const BASE_URL = "https://api.anthropic.com/v1";
const ANTHROPIC_VERSION = "2023-06-01";

const DEFAULT_MODEL = "claude-sonnet-4-6-20250514";

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

interface AnthropicMessage {
  role: "user" | "assistant";
  content: string;
}

interface AnthropicRequest {
  model: string;
  system?: string;
  messages: AnthropicMessage[];
  max_tokens: number;
  temperature?: number;
  stream?: boolean;
}

interface AnthropicContentBlock {
  type: "text";
  text: string;
}

interface AnthropicResponse {
  content?: AnthropicContentBlock[];
  error?: { type: string; message: string };
}

interface AnthropicStreamEvent {
  type: string;
  delta?: { type: string; text?: string };
  content_block?: { type: string; text?: string };
  error?: { type: string; message: string };
}

/**
 * Ensure messages start with a user turn (Anthropic requires this).
 * Also merges consecutive same-role messages.
 */
function normalizeMessages(
  messages: { role: "user" | "assistant"; content: string }[]
): AnthropicMessage[] {
  const result: AnthropicMessage[] = [];

  for (const m of messages) {
    const last = result[result.length - 1];
    if (last && last.role === m.role) {
      // Merge consecutive same-role messages
      last.content += "\n\n" + m.content;
    } else {
      result.push({ role: m.role, content: m.content });
    }
  }

  // Anthropic requires first message to be user
  if (result.length > 0 && result[0].role === "assistant") {
    result.unshift({ role: "user", content: "(start)" });
  }

  return result;
}

async function anthropicFetch(
  apiKey: string,
  body: AnthropicRequest,
  stream: boolean
): Promise<Response> {
  const response = await fetch(`${BASE_URL}/messages`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": ANTHROPIC_VERSION,
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(120000),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw new Error(`Anthropic API error (${response.status}): ${errorText}`);
  }

  return response;
}

/* ------------------------------------------------------------------ */
/*  Provider implementation                                            */
/* ------------------------------------------------------------------ */

export const anthropicProvider: AiProvider = {
  name: "Anthropic Claude",
  defaultModel: DEFAULT_MODEL,

  async generateText(systemPrompt, userPrompt, apiKey, model) {
    const body: AnthropicRequest = {
      model: model || DEFAULT_MODEL,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
      max_tokens: 8192,
      temperature: 0.7,
    };

    const response = await anthropicFetch(apiKey, body, false);
    const data: AnthropicResponse = await response.json();

    if (data.error) {
      throw new Error(`Anthropic: ${data.error.message}`);
    }

    return data.content?.map((b) => b.text).join("") || "";
  },

  async *generateStream(systemPrompt, userPrompt, apiKey, model) {
    const body: AnthropicRequest = {
      model: model || DEFAULT_MODEL,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
      max_tokens: 8192,
      temperature: 0.7,
      stream: true,
    };

    const response = await anthropicFetch(apiKey, body, true);
    const reader = response.body?.getReader();
    if (!reader) return;

    const decoder = new TextDecoder();
    let buffer = "";

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith("data: ")) continue;
          const jsonStr = trimmed.slice(6);

          try {
            const event: AnthropicStreamEvent = JSON.parse(jsonStr);

            if (event.type === "content_block_delta" && event.delta?.text) {
              yield event.delta.text;
            } else if (event.type === "error" && event.error) {
              throw new Error(`Anthropic stream error: ${event.error.message}`);
            }
            // Ignore other event types (message_start, content_block_start, ping, etc.)
          } catch (err) {
            if (err instanceof SyntaxError) continue; // skip unparseable
            throw err;
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  },

  async chatCompletion(systemPrompt, messages, apiKey, model) {
    const normalized = normalizeMessages(messages);

    const body: AnthropicRequest = {
      model: model || DEFAULT_MODEL,
      system: systemPrompt || undefined,
      messages: normalized,
      max_tokens: 8192,
      temperature: 0.7,
    };

    const response = await anthropicFetch(apiKey, body, false);
    const data: AnthropicResponse = await response.json();

    if (data.error) {
      throw new Error(`Anthropic: ${data.error.message}`);
    }

    return data.content?.map((b) => b.text).join("") || "";
  },

  async fetchModels(apiKey) {
    try {
      const response = await fetch("https://api.anthropic.com/v1/models", {
        headers: {
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
        signal: AbortSignal.timeout(8000),
      });
      if (!response.ok) return FALLBACK_MODELS_ANTHROPIC;
      const data = await response.json();
      if (!data.data || !Array.isArray(data.data)) return FALLBACK_MODELS_ANTHROPIC;

      const models: AiModelInfo[] = data.data
        .filter((m: { id?: string }) => !!m.id)
        .map((m: { id: string; display_name?: string }) => ({
          name: m.id,
          displayName: m.display_name || m.id,
          description: "",
        }));

      return models.length > 0 ? models : FALLBACK_MODELS_ANTHROPIC;
    } catch {
      return FALLBACK_MODELS_ANTHROPIC;
    }
  },
};
