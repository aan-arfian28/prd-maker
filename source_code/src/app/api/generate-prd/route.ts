import { NextRequest, NextResponse } from "next/server";
import { resolveProviderType, resolveApiKey, resolveModel, getProvider } from "@/lib/providers/registry";
import { generatePrdModular } from "@/lib/prd-generator";
import type { ProviderType } from "@/lib/types";
import type { PipelineProgress } from "@/lib/prd-generator";
import type { Lang } from "@/lib/i18n";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { prompt, apiKey: userApiKey, model: userModel, provider: userProvider, customPrompts, lang } = body;
    const language: Lang = lang === "en" ? "en" : "id";

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
        let closed = false;
        function safeEnqueue(data: Record<string, unknown>): void {
          if (!closed) {
            try {
              controller.enqueue(sseEvent(data));
            } catch {
              closed = true;
            }
          }
        }

        // Heartbeat: send a comment every 15s to keep proxies (nginx) and
        // browsers from killing the connection during long AI calls.
        const heartbeat = setInterval(() => {
          if (!closed) {
            try {
              // SSE comment — ignored by clients, keeps TCP connection alive
              controller.enqueue(encoder.encode(": heartbeat\n\n"));
            } catch {
              closed = true;
              clearInterval(heartbeat);
            }
          }
        }, 15000);

        // Track the current step so we can report which step failed
        let currentStep = "";

        try {
          const onProgress = (progress: PipelineProgress) => {
            if (progress.status === "running") currentStep = progress.step;
            safeEnqueue({ type: "progress", ...progress });
          };

          const prd = await generatePrdModular(
            provider,
            prompt.trim(),
            apiKey,
            model,
            onProgress,
            language,
            customPrompts || null
          );

          safeEnqueue({ type: "result", prd, provider: providerType });
          if (!closed) {
            try { controller.close(); } catch { /* already closed */ }
          }
        } catch (error) {
          const message =
            error instanceof Error ? error.message : "Terjadi kesalahan saat membuat PRD";
          safeEnqueue({ type: "error", message, step: currentStep || undefined });
          if (!closed) {
            try { controller.close(); } catch { /* already closed */ }
          }
        } finally {
          clearInterval(heartbeat);
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
