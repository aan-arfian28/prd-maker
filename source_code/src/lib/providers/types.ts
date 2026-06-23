import type { ChatMessage, AiModelInfo } from "@/lib/types";

/* ------------------------------------------------------------------ */
/*  Provider identifiers                                              */
/* ------------------------------------------------------------------ */

export type ProviderType = "openai" | "deepseek" | "gemini" | "grok" | "anthropic";

export const ALL_PROVIDERS: ProviderType[] = [
  "openai",
  "deepseek",
  "gemini",
  "grok",
  "anthropic",
];

export interface ProviderMeta {
  id: ProviderType;
  label: string; // display name
  baseURL: string; // API base URL
  defaultModel: string;
  modelsEndpoint: string | null; // null = no public models endpoint → use fallback
  apiKeyHelpUrl: string; // where user can get an API key
  apiKeyEnvVar: string;
}

export const PROVIDER_META: Record<ProviderType, ProviderMeta> = {
  openai: {
    id: "openai",
    label: "OpenAI (ChatGPT)",
    baseURL: "https://api.openai.com/v1",
    defaultModel: "gpt-4o",
    modelsEndpoint: "https://api.openai.com/v1/models",
    apiKeyHelpUrl: "https://platform.openai.com/api-keys",
    apiKeyEnvVar: "OPENAI_API_KEY",
  },
  deepseek: {
    id: "deepseek",
    label: "DeepSeek",
    baseURL: "https://api.deepseek.com/v1",
    defaultModel: "deepseek-chat",
    modelsEndpoint: "https://api.deepseek.com/v1/models",
    apiKeyHelpUrl: "https://platform.deepseek.com/api_keys",
    apiKeyEnvVar: "DEEPSEEK_API_KEY",
  },
  gemini: {
    id: "gemini",
    label: "Google Gemini",
    baseURL: "https://generativelanguage.googleapis.com/v1beta/models",
    defaultModel: "gemini-2.5-flash",
    modelsEndpoint: null, // Gemini uses a different models.list approach
    apiKeyHelpUrl: "https://aistudio.google.com/app/apikey",
    apiKeyEnvVar: "GEMINI_API_KEY",
  },
  grok: {
    id: "grok",
    label: "Grok (xAI)",
    baseURL: "https://api.x.ai/v1",
    defaultModel: "grok-3",
    modelsEndpoint: "https://api.x.ai/v1/models",
    apiKeyHelpUrl: "https://x.ai/api",
    apiKeyEnvVar: "GROK_API_KEY",
  },
  anthropic: {
    id: "anthropic",
    label: "Anthropic Claude",
    baseURL: "https://api.anthropic.com/v1",
    defaultModel: "claude-sonnet-4-6-20250514",
    modelsEndpoint: null, // Anthropic has no public models list endpoint
    apiKeyHelpUrl: "https://console.anthropic.com/settings/keys",
    apiKeyEnvVar: "ANTHROPIC_API_KEY",
  },
};

/* ------------------------------------------------------------------ */
/*  Common provider interface                                         */
/* ------------------------------------------------------------------ */

/**
 * Every AI provider must implement this interface.
 * OpenAI-compatible providers (OpenAI, DeepSeek, Grok) share a single
 * implementation since they all speak the same protocol.
 */
export interface AiProvider {
  /** Human-readable name for display */
  readonly name: string;

  /** Default model for this provider */
  readonly defaultModel: string;

  /**
   * Generate text (non-streaming). Used by the modular PRD pipeline
   * and by chat revision.
   */
  generateText(
    systemPrompt: string,
    userPrompt: string,
    apiKey: string,
    model: string
  ): Promise<string>;

  /**
   * Generate text with streaming. Returns an async iterable of token strings.
   */
  generateStream(
    systemPrompt: string,
    userPrompt: string,
    apiKey: string,
    model: string
  ): AsyncIterable<string>;

  /**
   * Multi-turn chat completion (non-streaming). Used by chat revision.
   * `messages` are the conversation history (alternating user/assistant),
   * `newMessage` is the latest user input.
   */
  chatCompletion(
    systemPrompt: string,
    messages: { role: "user" | "assistant"; content: string }[],
    apiKey: string,
    model: string
  ): Promise<string>;

  /**
   * Fetch the list of available models from the provider API.
   * Falls back to a static fallback list on failure.
   */
  fetchModels(apiKey: string): Promise<AiModelInfo[]>;
}
