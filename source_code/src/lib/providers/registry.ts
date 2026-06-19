import type { AiProvider, ProviderType } from "./types";
import { openaiProvider, deepseekProvider, grokProvider } from "./openai-compatible";
import { geminiProvider } from "./gemini";
import { anthropicProvider } from "./anthropic";

/* ------------------------------------------------------------------ */
/*  Provider registry                                                 */
/* ------------------------------------------------------------------ */

const registry: Record<ProviderType, AiProvider> = {
  openai: openaiProvider,
  deepseek: deepseekProvider,
  gemini: geminiProvider,
  grok: grokProvider,
  anthropic: anthropicProvider,
};

/**
 * Get an AiProvider by type. Throws for unknown providers.
 */
export function getProvider(type: ProviderType): AiProvider {
  const provider = registry[type];
  if (!provider) {
    throw new Error(`Unknown AI provider: ${type}`);
  }
  return provider;
}

/**
 * Resolve which provider to use.
 * 1. User-provided (from browser localStorage) if available
 * 2. Fall back to environment variable DEFAULT_AI_PROVIDER
 * 3. Hard default to "deepseek"
 */
export function resolveProviderType(userProvider?: string): ProviderType {
  const valid = ["openai", "deepseek", "gemini", "grok", "anthropic"] as const;
  if (userProvider && valid.includes(userProvider as ProviderType)) {
    return userProvider as ProviderType;
  }
  const envDefault = process.env.DEFAULT_AI_PROVIDER;
  if (envDefault && valid.includes(envDefault as ProviderType)) {
    return envDefault as ProviderType;
  }
  return "deepseek";
}

/**
 * Resolve the effective API key:
 * 1. User-provided (from browser localStorage)
 * 2. Provider-specific env variable
 * 3. Generic DEEPSEEK_API_KEY (backward compat)
 */
export function resolveApiKey(
  provider: ProviderType,
  userApiKey?: string
): string {
  if (userApiKey) return userApiKey;

  const envVarMap: Record<ProviderType, string> = {
    openai: "OPENAI_API_KEY",
    deepseek: "DEEPSEEK_API_KEY",
    gemini: "GEMINI_API_KEY",
    grok: "GROK_API_KEY",
    anthropic: "ANTHROPIC_API_KEY",
  };

  return process.env[envVarMap[provider]] || "";
}

/**
 * Resolve the effective model:
 * 1. User-provided (from browser localStorage)
 * 2. Provider default
 */
export function resolveModel(
  provider: ProviderType,
  userModel?: string
): string {
  if (userModel) return userModel;
  return getProvider(provider).defaultModel;
}
