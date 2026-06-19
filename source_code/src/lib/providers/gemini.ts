import type { AiProvider } from "./types";
import type { AiModelInfo } from "@/lib/types";
import { FALLBACK_MODELS_GEMINI } from "@/lib/modelList";

/* ------------------------------------------------------------------ */
/*  Google Gemini provider (REST API via fetch)                       */
/* ------------------------------------------------------------------ */

const BASE_URL = "https://generativelanguage.googleapis.com/v1beta";

const DEFAULT_MODEL = "gemini-2.5-flash";

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

interface GeminiContent {
  role: "user" | "model";
  parts: { text: string }[];
}

interface GeminiRequest {
  system_instruction?: { parts: { text: string }[] };
  contents: GeminiContent[];
  generationConfig?: {
    temperature?: number;
    topP?: number;
    maxOutputTokens?: number;
  };
}

interface GeminiCandidate {
  content: { parts: { text?: string }[]; role: string };
  finishReason?: string;
}

interface GeminiResponse {
  candidates?: GeminiCandidate[];
}

/**
 * Convert chat messages (user/assistant pairs) to Gemini contents format.
 * Gemini requires strict alternation starting with "user".
 */
function toGeminiContents(
  systemPrompt: string,
  messages: { role: "user" | "assistant"; content: string }[]
): { systemInstruction?: { parts: { text: string }[] }; contents: GeminiContent[] } {
  const systemInstruction = systemPrompt
    ? { parts: [{ text: systemPrompt }] }
    : undefined;

  const contents: GeminiContent[] = messages.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));

  // Ensure first message is "user" — prepend a dummy if needed
  if (contents.length > 0 && contents[0].role === "model") {
    contents.unshift({ role: "user", parts: [{ text: "(start)" }] });
  }

  return { systemInstruction, contents };
}

async function geminiRequest(
  model: string,
  apiKey: string,
  body: GeminiRequest,
  stream: boolean
): Promise<Response> {
  const url = `${BASE_URL}/models/${model}:${stream ? "streamGenerateContent" : "generateContent"}?key=${apiKey}&alt=sse${stream ? "" : ""}`;

  // For streaming, use the streamGenerateContent endpoint with alt=sse
  // For non-streaming, use generateContent
  const endpoint = stream ? "streamGenerateContent" : "generateContent";
  const queryParams = stream ? `?key=${apiKey}&alt=sse` : `?key=${apiKey}`;
  const fullUrl = `${BASE_URL}/models/${model}:${endpoint}${queryParams}`;

  const response = await fetch(fullUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(120000),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw new Error(`Gemini API error (${response.status}): ${errorText}`);
  }

  return response;
}

/* ------------------------------------------------------------------ */
/*  Provider implementation                                            */
/* ------------------------------------------------------------------ */

export const geminiProvider: AiProvider = {
  name: "Google Gemini",
  defaultModel: DEFAULT_MODEL,

  async generateText(systemPrompt, userPrompt, apiKey, model) {
    // Special handling for long system prompts: combine system + user
    // since Gemini's systemInstruction can handle it well
    const body: GeminiRequest = {
      system_instruction: { parts: [{ text: systemPrompt }] },
      contents: [
        { role: "user", parts: [{ text: userPrompt }] },
      ],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 8192,
      },
    };

    const response = await geminiRequest(model || DEFAULT_MODEL, apiKey, body, false);
    const data: GeminiResponse = await response.json();

    const text = data.candidates?.[0]?.content?.parts
      ?.map((p) => p.text || "")
      .join("") || "";

    return text;
  },

  async *generateStream(systemPrompt, userPrompt, apiKey, model) {
    const body: GeminiRequest = {
      system_instruction: { parts: [{ text: systemPrompt }] },
      contents: [
        { role: "user", parts: [{ text: userPrompt }] },
      ],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 8192,
      },
    };

    const response = await geminiRequest(model || DEFAULT_MODEL, apiKey, body, true);
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
          if (jsonStr === "[DONE]") return;

          try {
            const parsed = JSON.parse(jsonStr);
            const text = parsed.candidates?.[0]?.content?.parts
              ?.map((p: { text?: string }) => p.text || "")
              .join("");
            if (text) yield text;
          } catch {
            // skip unparseable chunks
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  },

  async chatCompletion(systemPrompt, messages, apiKey, model) {
    // Build conversation: combine system prompt into first user message if needed
    // Gemini handles system instruction separately
    const allMessages: { role: "user" | "assistant"; content: string }[] = [
      ...messages,
    ];

    const { systemInstruction, contents } = toGeminiContents(systemPrompt, allMessages);

    const body: GeminiRequest = {
      system_instruction: systemInstruction,
      contents,
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 8192,
      },
    };

    const response = await geminiRequest(model || DEFAULT_MODEL, apiKey, body, false);
    const data: GeminiResponse = await response.json();

    return data.candidates?.[0]?.content?.parts
      ?.map((p) => p.text || "")
      .join("") || "";
  },

  async fetchModels(_apiKey) {
    // Gemini doesn't have a simple /v1/models REST endpoint like OpenAI.
    // We return a curated static list. The user can also type custom model names.
    return FALLBACK_MODELS_GEMINI;
  },
};
