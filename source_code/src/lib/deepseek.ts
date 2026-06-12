import OpenAI from "openai";
import { normalizeModel } from "./modelList";

const SYSTEM_PROMPT_PRDMaker = `Kamu adalah seorang Product Manager dan System Analyst senior yang ahli dalam membuat PRD (Product Requirements Document).

Tugasmu adalah membuat PRD yang **sangat lengkap, sangat detail(minimal 500 markdown lines), profesional, dan terstruktur** berdasarkan prompt pengguna.

## Format PRD yang Harus Dihasilkan

PRD harus dalam format Markdown dengan struktur berikut:

1. **Overview** - Penjelasan singkat tentang aplikasi, masalah yang diselesaikan, dan tujuan utama
2. **Requirements** - Persyaratan tingkat tinggi (aksesibilitas, pengguna, data input, dll)
3. **Core Features** - Fitur-fitur kunci yang harus ada, dengan penjelasan detail setiap fitur
4. **User Flow** - Alur kerja pengguna dalam bentuk langkah-langkah
5. **Architecture** - Diagram sequence Mermaid yang menggambarkan arsitektur sistem dan aliran data
6. **Database Schema** - Diagram ERD Mermaid yang menggambarkan struktur database, dan tabel deskripsi
7. **Design & Technical Constraints** - Batasan teknis dan panduan desain

## Aturan Penting

- **WAJIB** menyertakan diagram Mermaid minimal 2:
  1. **sequenceDiagram** untuk arsitektur/aliran data
  2. **erDiagram** untuk database schema
- Diagram Mermaid HARUS valid dan dapat dirender. Pastikan syntax-nya benar.
- Gunakan bahasa Indonesia untuk konten PRD.
- Buat PRD sedetail dan seprofesional mungkin.
- Gunakan tabel Markdown untuk perbandingan atau spesifikasi jika diperlukan.
- Setiap fitur harus dijelaskan dengan jelas dan terstruktur.

## Format Output

Langsung keluarkan PRD dalam format Markdown. Jangan tambahkan pembuka seperti "Berikut adalah PRD..." — langsung mulai dari "# PRD — Project Requirements Document".

Pastikan setiap diagram Mermaid dibungkus dalam code block dengan bahasa "mermaid":
\`\`\`mermaid
sequenceDiagram
    ...
\`\`\`
`;

const CHAT_REVISION_PROMPT = `Kamu adalah seorang Product Manager dan System Analyst senior. Kamu sedang membantu merevisi PRD (Product Requirements Document).

## Konteks
Berikut adalah PRD saat ini:
\`\`\`markdown
{prdContent}
\`\`\`

## Riwayat Percakapan
{chatHistory}

## Instruksi
User memberikan masukan/feedback. Tugasmu:
1. Pahami masukan user dengan seksama
2. Revisi PRD sesuai masukan tersebut
3. Berikan penjelasan singkat tentang perubahan yang kamu lakukan

## Format Output
Kamu HARUS merespon dalam format JSON yang valid dengan struktur berikut:
{
  "prd": "MARKDOWN_PRD_LENGKAP_YANG_SUDAH_DIREVISI",
  "message": "Penjelasan tentang revisi yang dilakukan, dalam bahasa Indonesia yang natural dan ramah"
}

## Aturan
- PRD yang direvisi harus TETAP dalam format Markdown lengkap
- SEMUA diagram Mermaid yang ada harus dipertahankan atau diperbarui sesuai revisi
- Jangan menghapus bagian yang tidak disebutkan dalam masukan user
- Respon HARUS JSON yang valid — jangan tambahkan teks lain di luar JSON
- Gunakan bahasa Indonesia untuk message
- Pastikan Mermaid syntax tetap valid`;

/**
 * Resolve the effective API key and model:
 * 1. Use user-provided (from browser localStorage) if available
 * 2. Fall back to environment variables
 */
function resolveConfig(userApiKey?: string, userModel?: string) {
  const apiKey = userApiKey || process.env.DEEPSEEK_API_KEY || "";
  const modelName = normalizeModel(userModel) || process.env.DEEPSEEK_MODEL || "deepseek-chat";
  return { apiKey, modelName };
}

/**
 * Create an OpenAI client configured for DeepSeek API.
 */
function createClient(apiKey: string) {
  return new OpenAI({
    apiKey,
    baseURL: "https://api.deepseek.com/v1",
  });
}

export function generatePrdStream(
  prompt: string,
  userApiKey?: string,
  userModel?: string
) {
  const { apiKey, modelName } = resolveConfig(userApiKey, userModel);
  const client = createClient(apiKey);

  return client.chat.completions.create({
    model: modelName,
    messages: [
      { role: "system", content: SYSTEM_PROMPT_PRDMaker },
      { role: "user", content: `Buatkan PRD untuk: ${prompt}` },
    ],
    stream: true,
  });
}

export async function generatePrd(
  prompt: string,
  userApiKey?: string,
  userModel?: string
): Promise<string> {
  const { apiKey, modelName } = resolveConfig(userApiKey, userModel);
  const client = createClient(apiKey);

  const result = await client.chat.completions.create({
    model: modelName,
    messages: [
      { role: "system", content: SYSTEM_PROMPT_PRDMaker },
      { role: "user", content: `Buatkan PRD untuk: ${prompt}` },
    ],
  });

  return result.choices[0]?.message?.content || "";
}

export async function chatRevision(
  prdContent: string,
  messages: { role: string; content: string }[],
  newMessage: string,
  userApiKey?: string,
  userModel?: string
): Promise<{ prd: string; message: string }> {
  const { apiKey, modelName } = resolveConfig(userApiKey, userModel);
  const client = createClient(apiKey);

  const chatHistory = messages
    .map((m) => `${m.role === "user" ? "User" : "AI"}: ${m.content}`)
    .join("\n");

  const systemPrompt = CHAT_REVISION_PROMPT
    .replace("{prdContent}", prdContent)
    .replace("{chatHistory}", chatHistory);

  // Try up to 3 times for valid JSON
  let lastError: string | null = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const result = await client.chat.completions.create({
        model: modelName,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Masukan user: ${newMessage}` },
        ],
      });

      const text = result.choices[0]?.message?.content || "";

      // Extract JSON from response (handle case where model wraps in markdown code blocks)
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
        return {
          prd: parsed.prd,
          message: parsed.message,
        };
      }

      throw new Error("Response missing required fields (prd, message)");
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
      // If it's a JSON parse error, retry; otherwise throw
      if (err instanceof SyntaxError || lastError.includes("missing required")) {
        continue;
      }
      throw err;
    }
  }

  throw new Error(`DeepSeek gagal menghasilkan respons yang valid setelah 3 percobaan: ${lastError}`);
}
