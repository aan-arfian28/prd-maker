import { NextRequest, NextResponse } from "next/server";
import { chatRevision } from "@/lib/deepseek";

export async function POST(request: NextRequest) {
  try {
    const { prdContent, messages, newMessage, apiKey, model } = await request.json();

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

    // Check for API key: user-provided takes precedence, then env
    const effectiveKey = apiKey || process.env.DEEPSEEK_API_KEY || "";
    if (!effectiveKey || effectiveKey === "your_deepseek_api_key_here") {
      return NextResponse.json(
        { error: "API Key DeepSeek belum dikonfigurasi. Silakan atur di Pengaturan atau set DEEPSEEK_API_KEY di file .env.local" },
        { status: 500 }
      );
    }

    const result = await chatRevision(
      prdContent,
      messages || [],
      newMessage.trim(),
      apiKey,
      model
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error in chat revision:", error);
    const message =
      error instanceof Error ? error.message : "Terjadi kesalahan saat merevisi PRD";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
