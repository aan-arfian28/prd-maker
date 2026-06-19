import { NextRequest, NextResponse } from "next/server";
import { resolveProviderType, resolveApiKey, resolveModel, getProvider } from "@/lib/providers/registry";
import { getEffectivePrompt } from "@/lib/prompt-customization";
import type { ProviderType } from "@/lib/types";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      prdContent,
      messages,
      newMessage,
      apiKey: userApiKey,
      model: userModel,
      provider: userProvider,
      customPrompts,
    } = body;

    if (!prdContent || typeof prdContent !== "string") {
      return NextResponse.json(
        { error: "Konten PRD tidak boleh kosong" },
        { status: 400 }
      );
    }

    if (!newMessage || typeof newMessage !== "string" || newMessage.trim().length === 0) {
      return NextResponse.json(
        { error: "Pesan tidak boleh kosong" },
        { status: 400 }
      );
    }

    const providerType: ProviderType = resolveProviderType(userProvider);
    const apiKey = resolveApiKey(providerType, userApiKey);

    if (!apiKey) {
      return NextResponse.json(
        {
          error: `API Key untuk ${providerType} belum dikonfigurasi. Silakan atur di Pengaturan.`,
        },
        { status: 500 }
      );
    }

    const model = resolveModel(providerType, userModel);
    const provider = getProvider(providerType);

    const chatHistory = (messages || [])
      .map((m: { role: string; content: string }) =>
        `${m.role === "user" ? "User" : "AI"}: ${m.content}`
      )
      .join("\n");

    const chatRevisionPrompt = getEffectivePrompt("chatRevision", customPrompts || null);
    const systemPrompt = chatRevisionPrompt
      .replace("{prdContent}", prdContent)
      .replace("{chatHistory}", chatHistory);

    // Convert messages to provider format
    const chatMessages: { role: "user" | "assistant"; content: string }[] = [
      ...(messages || []).map((m: { role: string; content: string }) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
      { role: "user" as const, content: newMessage.trim() },
    ];

    // Try up to 3 times for valid JSON
    let lastError: string | null = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const text = await provider.chatCompletion(
          systemPrompt,
          chatMessages,
          apiKey,
          model
        );

        // Extract JSON from response
        let jsonStr = text.trim();

        // Remove markdown code block if present
        if (jsonStr.startsWith("```")) {
          const match = jsonStr.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
          if (match) {
            jsonStr = match[1].trim();
          }
        }

        const parsed = JSON.parse(jsonStr);

        if (parsed.prd && parsed.message) {
          return NextResponse.json({
            prd: parsed.prd,
            message: parsed.message,
          });
        }

        throw new Error("Response missing required fields (prd, message)");
      } catch (err) {
        lastError = err instanceof Error ? err.message : String(err);
        if (err instanceof SyntaxError || lastError.includes("missing required")) {
          continue;
        }
        throw err;
      }
    }

    throw new Error(`Gagal menghasilkan respons yang valid setelah 3 percobaan: ${lastError}`);
  } catch (error) {
    console.error("Error in chat revision:", error);
    const message =
      error instanceof Error ? error.message : "Terjadi kesalahan saat merevisi PRD";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
