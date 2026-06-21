export type ProviderType = "openai" | "deepseek" | "gemini" | "grok" | "anthropic";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
}

export interface PrdState {
  markdown: string;
  history: ChatMessage[];
  isLoading: boolean;
  error: string | null;
}

export interface GeneratePrdRequest {
  prompt: string;
  context?: string;
  provider?: ProviderType;
  apiKey?: string;
  model?: string;
}

export interface ChatRevisionRequest {
  prdContent: string;
  messages: ChatMessage[];
  newMessage: string;
  provider?: ProviderType;
  apiKey?: string;
  model?: string;
}

export interface AiResponse {
  prd: string;
  message: string;
}

export interface AiModelInfo {
  name: string;
  displayName: string;
  description: string;
}

// Keep old alias for backward compatibility
export type GeminiModelInfo = AiModelInfo;

// App settings stored in localStorage
export interface AppSettings {
  provider: ProviderType;
  /** @deprecated — use apiKeys instead. Kept for backward compat migration. */
  apiKey?: string;
  apiKeys: Partial<Record<ProviderType, string>>;
  model: string;
}
