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
}

export interface ChatRevisionRequest {
  prdContent: string;
  messages: ChatMessage[];
  newMessage: string;
}

export interface AiResponse {
  prd: string;
  message: string;
}
