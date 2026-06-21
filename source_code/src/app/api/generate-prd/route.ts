import { NextRequest, NextResponse } from "next/server";
import { resolveProviderType, resolveApiKey, resolveModel, getProvider } from "@/lib/providers/registry";
import { generatePrdModular } from "@/lib/prd-generator";
import type { ProviderType } from "@/lib/types";
import type { PipelineProgress } from "@/lib/prd-generator";

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

    // ── SSE Streaming Response ───────────────────────────────────────
    const encoder = new TextEncoder();

    function sseEvent(data: Record<string, unknown>): Uint8Array {
      return encoder.encode(`data: ${JSON.stringify(data)}\n\n`);
    }

    const stream = new ReadableStream({
      async start(controller) {
        try {
          const onProgress = (progress: PipelineProgress) => {
            controller.enqueue(sseEvent({ type: "progress", ...progress }));
          };

          const prd = await generatePrdModular(
            provider,
            prompt.trim(),
            apiKey,
            model,
            onProgress,
            customPrompts || null
          );

          controller.enqueue(sseEvent({ type: "result", prd, provider: providerType }));
          controller.close();
        } catch (error) {
          const message =
            error instanceof Error ? error.message : "Terjadi kesalahan saat membuat PRD";
          controller.enqueue(sseEvent({ type: "error", message }));
          controller.close();
        }
      },
    });

    return new NextResponse(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    });
  } catch (error) {
    console.error("Error generating PRD:", error);
    const message =
      error instanceof Error ? error.message : "Terjadi kesalahan saat membuat PRD";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
