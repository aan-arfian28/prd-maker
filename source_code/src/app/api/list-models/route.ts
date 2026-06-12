import { NextRequest, NextResponse } from "next/server";
import { FALLBACK_MODELS, fetchAvailableModels } from "@/lib/modelList";

export async function POST(request: NextRequest) {
  try {
    const { apiKey } = await request.json();

    if (apiKey) {
      const models = await fetchAvailableModels(apiKey);
      return NextResponse.json({ models });
    }

    return NextResponse.json({ models: FALLBACK_MODELS });
  } catch {
    return NextResponse.json({ models: FALLBACK_MODELS });
  }
}
