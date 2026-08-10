import { NextRequest, NextResponse } from "next/server";
import { resolveProviderType, resolveApiKey, resolveModel, getProvider } from "@/lib/providers/registry";
import { getEffectivePrompt } from "@/lib/prompt-customization";
import type { Lang } from "@/lib/i18n";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { prdContent, apiKey: userApiKey, model: userModel, provider: userProvider, customPrompts, lang } = body;
    const language: Lang = lang === "en" ? "en" : "id";

    if (!prdContent || typeof prdContent !== "string" || prdContent.trim().length === 0) {
      return NextResponse.json(
        { error: "PRD content is required" },
        { status: 400 }
      );
    }

    const providerType = resolveProviderType(userProvider);
    const apiKey = resolveApiKey(providerType, userApiKey);

    if (!apiKey) {
      return NextResponse.json(
        { error: `API Key for ${providerType} is not configured. Please set it in Settings.` },
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

        const heartbeat = setInterval(() => {
          if (!closed) {
            try {
              controller.enqueue(encoder.encode(": heartbeat\n\n"));
            } catch {
              closed = true;
              clearInterval(heartbeat);
            }
          }
        }, 15000);

        try {
          safeEnqueue({
            type: "progress",
            step: "claudeMd",
            status: "running",
            message: language === "en" ? "Generating CLAUDE.md from PRD..." : "Membuat CLAUDE.md dari PRD...",
          });

          const systemPrompt = getEffectivePrompt("claudeMd", customPrompts || null, language);

          const userPrompt = language === "en"
            ? `Based on the following PRD, create a comprehensive CLAUDE.md file:\n\n${prdContent}`
            : `Berdasarkan PRD berikut, buatlah file CLAUDE.md yang komprehensif:\n\n${prdContent}`;

          // Retry logic inline
          let text = "";
          let lastError = "";
          const maxRetries = 2;

          for (let attempt = 0; attempt <= maxRetries; attempt++) {
            try {
              text = await provider.generateText(systemPrompt, userPrompt, apiKey, model);
              break;
            } catch (err) {
              lastError = err instanceof Error ? err.message : String(err);
              if (attempt < maxRetries) {
                safeEnqueue({
                  type: "progress",
                  step: "claudeMd",
                  status: "running",
                  message: language === "en"
                    ? `Failed, retrying (${attempt + 1}/${maxRetries})...`
                    : `Gagal, mencoba ulang (${attempt + 1}/${maxRetries})...`,
                });
                await new Promise((r) => setTimeout(r, 1000));
              } else {
                throw new Error(`Generation failed after ${maxRetries + 1} attempts: ${lastError}`);
              }
            }
          }

          safeEnqueue({
            type: "progress",
            step: "claudeMd",
            status: "done",
            message: language === "en" ? "CLAUDE.md generated!" : "CLAUDE.md selesai dibuat!",
          });

          // Clean up the output: remove wrapping code blocks if AI adds them
          let cleaned = text.trim();
          const mdFenceMatch = cleaned.match(/^```(?:markdown|md)?\s*\n?([\s\S]*?)\n?```$/);
          if (mdFenceMatch) {
            cleaned = mdFenceMatch[1].trim();
          }

          safeEnqueue({ type: "result", claudeMd: cleaned });

          if (!closed) {
            try { controller.close(); } catch { /* already closed */ }
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : "Failed to generate CLAUDE.md";
          safeEnqueue({ type: "error", message });
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
    console.error("Error generating CLAUDE.md:", error);
    const message = error instanceof Error ? error.message : "Failed to generate CLAUDE.md";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
