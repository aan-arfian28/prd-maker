import { NextRequest, NextResponse } from "next/server";
import { resolveProviderType, resolveApiKey, resolveModel, getProvider } from "@/lib/providers/registry";
import { getEffectivePrompt } from "@/lib/prompt-customization";
import type { ProviderType } from "@/lib/types";
import type { Lang } from "@/lib/i18n";
import {
  chunkPrd,
  isChunkable,
  formatChunksForPrompt,
  parseChunkUpdates,
  reassemblePrd,
  type ChunkUpdate,
} from "@/lib/prd-chunker";

/* ------------------------------------------------------------------ */
/*  Delimiter-based output parser (full PRD revision)                  */
/* ------------------------------------------------------------------ */

/**
 * Parse the AI response which uses delimiter format:
 *   ===MESSAGE===
 *   …penjelasan revisi…
 *   ===PRD===
 *   …seluruh markdown PRD…
 *
 * Fallbacks are tried in order:
 *  1. XML  <message>/<prd>   (legacy & some models prefer this)
 *  2. JSON {"prd":"...","message":"..."}
 *  3. Raw markdown (use directly, auto-generate message)
 */
function parseResponse(text: string): { prd: string; message: string } | null {
  const raw = text.trim();

  // Strategy 1: ===MESSAGE=== / ===PRD=== delimiters
  const msgDelim = raw.match(/===MESSAGE===\s*\n?([\s\S]*?)(?=\n?===PRD===)/i);
  const prdDelim = raw.match(/===PRD===\s*\n?([\s\S]*)/i);
  if (prdDelim) {
    return {
      message: (msgDelim ? msgDelim[1].trim() : "PRD telah direvisi sesuai masukan Anda."),
      prd: prdDelim[1].trim(),
    };
  }

  // Strategy 2: <message> / <prd> XML-style (legacy format)
  const xmlMsg = raw.match(/<message>\s*([\s\S]*?)\s*<\/message>/i);
  const xmlPrd = raw.match(/<prd>\s*([\s\S]*?)\s*<\/prd>/i);
  if (xmlPrd) {
    return {
      message: xmlMsg ? xmlMsg[1].trim() : "PRD telah direvisi sesuai masukan Anda.",
      prd: xmlPrd[1].trim(),
    };
  }
  // Handle truncated XML (missing closing tag)
  const xmlPrdOpen = raw.match(/<prd>\s*([\s\S]*)/i);
  if (xmlPrdOpen) {
    let prd = xmlPrdOpen[1].trim();
    prd = prd.replace(/<\/prd>/, "").replace(/<\/message>/, "");
    const msgFromXml = raw.match(/<message>\s*([\s\S]*?)\s*<\/message>/i);
    return {
      message: msgFromXml ? msgFromXml[1].trim() : "PRD telah direvisi sesuai masukan Anda.",
      prd,
    };
  }

  // Strategy 3: JSON format (legacy)
  const jsonCodeBlock = raw.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
  const jsonStr = jsonCodeBlock ? jsonCodeBlock[1].trim() : raw;
  if (jsonStr.startsWith("{")) {
    try {
      const objStart = jsonStr.indexOf("{");
      const objEnd = jsonStr.lastIndexOf("}");
      if (objEnd > objStart) {
        const parsed = JSON.parse(jsonStr.slice(objStart, objEnd + 1));
        if (parsed.prd && parsed.message) {
          return { prd: parsed.prd, message: parsed.message };
        }
      }
    } catch {
      // continue
    }
  }

  // Strategy 4: Raw text that looks like markdown (headings present)
  if (raw.length > 500 && (raw.includes("# ") || raw.includes("## "))) {
    const lines = raw.split("\n");
    const firstLine = lines[0].trim();
    if (firstLine.length > 0 && firstLine.length < 200 && !firstLine.startsWith("#") && !firstLine.startsWith("```") && !firstLine.startsWith("===")) {
      return {
        message: firstLine,
        prd: lines.slice(1).join("\n").trim(),
      };
    }
    return {
      message: "PRD telah direvisi sesuai masukan Anda.",
      prd: raw,
    };
  }

  return null;
}

/* ------------------------------------------------------------------ */
/*  Chunked revision helpers                                           */
/* ------------------------------------------------------------------ */

/**
 * Parse the AI's chunked revision response.
 * Returns { message, chunks } or null if parsing fails.
 */
function parseChunkedResponse(text: string): { message: string; chunks: ChunkUpdate[] } | null {
  const raw = text.trim();

  // Extract message from ===MESSAGE=== section
  const msgMatch = raw.match(/===MESSAGE===\s*\n?([\s\S]*?)(?=\n?===CHUNKS===)/i);
  const message = msgMatch ? msgMatch[1].trim() : "PRD telah direvisi sesuai masukan Anda.";

  // Extract chunks from ===CHUNKS=== section
  const chunks = parseChunkUpdates(raw);

  if (chunks && chunks.length > 0) {
    return { message, chunks };
  }

  return null;
}

/* ------------------------------------------------------------------ */
/*  Route handler                                                       */
/* ------------------------------------------------------------------ */

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
      lang,
    } = body;
    const language: Lang = lang === "en" ? "en" : "id";

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

    const chatMessages: { role: "user" | "assistant"; content: string }[] = [
      ...(messages || []).map((m: { role: string; content: string }) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
      { role: "user" as const, content: newMessage.trim() },
    ];

    /* -------------------------------------------------------------- */
    /*  Try chunked revision first (faster, cheaper)                  */
    /* -------------------------------------------------------------- */

    const canChunk = isChunkable(prdContent);

    if (canChunk) {
      const chunks = chunkPrd(prdContent);
      const chunkedPrdText = formatChunksForPrompt(chunks);

      const chunkedSystemPrompt = getEffectivePrompt(
        "chatRevisionChunked",
        customPrompts || null,
        language
      )
        .replace("{chunkedPrd}", chunkedPrdText)
        .replace("{chatHistory}", chatHistory);

      // Try chunked revision up to 2 times
      let chunkedLastError: string | null = null;

      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          const text = await provider.chatCompletion(
            chunkedSystemPrompt,
            chatMessages,
            apiKey,
            model
          );

          const parsed = parseChunkedResponse(text);

          if (parsed && parsed.chunks.length > 0) {
            // Reassemble the PRD with updated chunks
            const updatedPrd = reassemblePrd(prdContent, chunks, parsed.chunks);

            return NextResponse.json({
              prd: updatedPrd,
              message: parsed.message,
            });
          }

          chunkedLastError = "Response chunked tidak mengandung format yang dikenali (===CHUNKS=== dengan JSON array)";
          // Continue retry
        } catch (err) {
          chunkedLastError = err instanceof Error ? err.message : String(err);
          // Only retry on parse failures, not hard errors
          if (err instanceof SyntaxError || (chunkedLastError && chunkedLastError.includes("format yang dikenali"))) continue;
          throw err;
        }
      }

      // Chunked revision failed — fall through to full revision below
      console.warn("Chunked revision failed, falling back to full revision:", chunkedLastError);
    }

    /* -------------------------------------------------------------- */
    /*  Full revision fallback                                          */
    /* -------------------------------------------------------------- */

    const chatRevisionPrompt = getEffectivePrompt("chatRevision", customPrompts || null, language);
    const systemPrompt = chatRevisionPrompt
      .replace("{prdContent}", prdContent)
      .replace("{chatHistory}", chatHistory);

    // Try up to 3 times
    let lastError: string | null = null;

    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const text = await provider.chatCompletion(
          systemPrompt,
          chatMessages,
          apiKey,
          model
        );

        const parsed = parseResponse(text);

        if (parsed && parsed.prd) {
          return NextResponse.json({
            prd: parsed.prd,
            message: parsed.message,
          });
        }

        lastError = "Response tidak mengandung format yang dikenali (===MESSAGE===/===PRD===, XML, atau JSON)";
        // Continue retry
      } catch (err) {
        lastError = err instanceof Error ? err.message : String(err);
        // Only retry on parse failures, not hard errors
        if (err instanceof SyntaxError || lastError.includes("format yang dikenali")) continue;
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
