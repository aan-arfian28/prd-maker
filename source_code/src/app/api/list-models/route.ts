import { NextRequest, NextResponse } from "next/server";
import { FALLBACK_MODELS, fetchAvailableModels } from "@/lib/modelList";
import type { ProviderType } from "@/lib/types";

export async function POST(request: NextRequest) {
  try {
    const { apiKey, provider } = await request.json();

    const providerType: ProviderType =
      provider && ["openai", "deepseek", "gemini", "grok", "anthropic"].includes(provider)
        ? provider
        : "deepseek";

    if (apiKey) {
      const models = await fetchAvailableModels(providerType, apiKey);
      return NextResponse.json({ models });
    }

    // No API key → return static fallback for the selected provider
    const fallback = FALLBACK_MODELS[providerType] || FALLBACK_MODELS.deepseek;
    return NextResponse.json({ models: fallback });
  } catch {
    return NextResponse.json({ models: FALLBACK_MODELS.deepseek });
  }
}
