import { NextRequest, NextResponse } from "next/server";
import { generatePrd } from "@/lib/deepseek";

export async function POST(request: NextRequest) {
  try {
    const { prompt, apiKey, model } = await request.json();

    if (!prompt || typeof prompt !== "string" || prompt.trim().length === 0) {
      return NextResponse.json(
        { error: "Prompt tidak boleh kosong" },
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

    const prd = await generatePrd(prompt.trim(), apiKey, model);

    return NextResponse.json({ prd });
  } catch (error) {
    console.error("Error generating PRD:", error);
    const message =
      error instanceof Error ? error.message : "Terjadi kesalahan saat membuat PRD";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
