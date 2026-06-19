import { NextRequest, NextResponse } from "next/server";
import { resolveProviderType, resolveApiKey, resolveModel, getProvider } from "@/lib/providers/registry";
import { generatePrdModular } from "@/lib/prd-generator";
import type { ProviderType } from "@/lib/types";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { prompt, apiKey: userApiKey, model: userModel, provider: userProvider, customPrompts } = body;

    if (!prompt || typeof prompt !== "string" || prompt.trim().length === 0) {
      return NextResponse.json(
        { error: "Prompt tidak boleh kosong" },
        { status: 400 }
      );
    }

    const providerType: ProviderType = resolveProviderType(userProvider);
    const apiKey = resolveApiKey(providerType, userApiKey);

    if (!apiKey) {
      return NextResponse.json(
        {
          error: `API Key untuk ${providerType} belum dikonfigurasi. Silakan atur di Pengaturan atau set environment variable.`,
        },
        { status: 500 }
      );
    }

    const model = resolveModel(providerType, userModel);
    const provider = getProvider(providerType);

    // Use the modular pipeline for more detailed PRD generation
    const prd = await generatePrdModular(
      provider,
      prompt.trim(),
      apiKey,
      model,
      (progress) => {
        console.log(`[PRD Pipeline] ${progress.step}: ${progress.status} — ${progress.message}`);
      },
      customPrompts || null
    );

    return NextResponse.json({ prd, provider: providerType });
  } catch (error) {
    console.error("Error generating PRD:", error);
    const message =
      error instanceof Error ? error.message : "Terjadi kesalahan saat membuat PRD";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
