import type { AiProvider } from "./providers/types";
import { getEffectivePrompt } from "./prompt-customization";
import type { CustomPromptMap } from "./prompt-customization";
import type { Lang } from "./i18n";

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

export interface PipelineProgress {
  step: string; // "analysis" | "features" | "userflow" | "architecture" | "database" | "techreq" | "assembly"
  status: "running" | "done" | "error";
  message: string;
}

export type ProgressCallback = (progress: PipelineProgress) => void;

interface ProductAnalysis {
  productName: string;
  elevatorPitch: string;
  targetUsers: string[];
  coreProblem: string;
  keyValueProposition: string;
  useCases: { title: string; description: string; priority: string }[];
  successMetrics: string[];
  competitiveLandscape: string;
  technicalComplexity: string;
  recommendedTechStack: string[];
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

function extractJsonFromResponse(text: string): string {
  let jsonStr = text.trim();

  // Remove markdown code block if present
  const codeBlockMatch = jsonStr.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
  if (codeBlockMatch) {
    jsonStr = codeBlockMatch[1].trim();
  }

  // Try to find JSON object boundaries
  const objStart = jsonStr.indexOf("{");
  const objEnd = jsonStr.lastIndexOf("}");
  if (objStart !== -1 && objEnd > objStart) {
    jsonStr = jsonStr.slice(objStart, objEnd + 1);
  }

  return jsonStr;
}

async function generateWithRetry(
  provider: AiProvider,
  systemPrompt: string,
  userPrompt: string,
  apiKey: string,
  model: string,
  maxRetries: number = 2
): Promise<string> {
  let lastError: string | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await provider.generateText(systemPrompt, userPrompt, apiKey, model);
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
      if (attempt < maxRetries) {
        // Brief pause before retry
        await new Promise((r) => setTimeout(r, 1000));
      }
    }
  }

  throw new Error(`Generation failed after ${maxRetries + 1} attempts: ${lastError}`);
}

/* ------------------------------------------------------------------ */
/*  Pipeline stages                                                   */
/* ------------------------------------------------------------------ */

async function runAnalysis(
  provider: AiProvider,
  prompt: string,
  apiKey: string,
  model: string,
  onProgress: ProgressCallback,
  lang: Lang,
  customPrompts?: CustomPromptMap | null
): Promise<ProductAnalysis> {
  onProgress({
    step: "analysis",
    status: "running",
    message: "Menganalisis ide produk secara mendalam...",
  });

  const userPrompt = lang === "en"
    ? `Deeply analyze the following application idea:\n\n"${prompt}"\n\nProvide specific, detailed, and in-depth analysis. Do not be generic.`
    : `Analisis ide aplikasi berikut secara mendalam:\n\n"${prompt}"\n\nBerikan analisis yang spesifik, detail, dan mendalam. Jangan generik.`;

  const systemPrompt = getEffectivePrompt("analysis", customPrompts, lang);

  const text = await generateWithRetry(provider, systemPrompt, userPrompt, apiKey, model);
  const jsonStr = extractJsonFromResponse(text);

  let analysis: ProductAnalysis;
  try {
    analysis = JSON.parse(jsonStr);
  } catch {
    // If JSON parse fails, create a minimal analysis from raw text
    analysis = {
      productName: prompt.slice(0, 60),
      elevatorPitch: text.slice(0, 200),
      targetUsers: ["Pengguna utama"],
      coreProblem: text.slice(0, 500),
      keyValueProposition: "Lihat deskripsi",
      useCases: [{ title: "Use case utama", description: text.slice(0, 300), priority: "high" }],
      successMetrics: ["User adoption", "User satisfaction"],
      competitiveLandscape: "Lihat analisis",
      technicalComplexity: "medium",
      recommendedTechStack: ["React", "Node.js", "PostgreSQL"],
    };
  }

  onProgress({
    step: "analysis",
    status: "done",
    message: `Analisis selesai: ${analysis.productName}`,
  });

  return analysis;
}

/**
 * Truncate a section output to fit within context limits for subsequent
 * prompts. Each section can be large; we keep the first ~3000 chars
 * to prevent blowing up the token budget while preserving key info.
 */
function truncateForContext(markdown: string, maxChars: number = 50000): string {
  if (markdown.length <= maxChars) return markdown;
  const cutoff = markdown.lastIndexOf("\n", maxChars);
  const end = cutoff > maxChars / 2 ? cutoff : maxChars;
  return markdown.slice(0, end) + "\n\n... (lanjutan tersedia di hasil final)";
}

/**
 * Stage 2: Sequential section generation with accumulating context.
 *
 * Each section receives:
 *   1. The original user prompt
 *   2. The product analysis JSON
 *   3. The full output of ALL previously generated sections
 *
 * This ensures every section is aware of the user's original request
 * and builds consistently on what came before — no more disconnected
 * sections generated from just {analysis} alone.
 *
 * Order: Features → UserFlow → Architecture → Database → TechReq
 */
async function runSectionGeneration(
  provider: AiProvider,
  userPrompt: string,
  analysis: ProductAnalysis,
  apiKey: string,
  model: string,
  onProgress: ProgressCallback,
  lang: Lang,
  customPrompts?: CustomPromptMap | null
) {
  const analysisJson = JSON.stringify(analysis, null, 2);

  // ── 2a: Features ──────────────────────────────────────────────
  onProgress({ step: "features", status: "running", message: "Merancang fitur-fitur inti..." });
  const featuresSysPrompt = getEffectivePrompt("features", customPrompts, lang)
    .replace("{userPrompt}", userPrompt)
    .replace("{analysis}", analysisJson)
    .replace("{previousSections}", "_Ini adalah section pertama — belum ada section sebelumnya_");
  const features = await generateWithRetry(
    provider,
    featuresSysPrompt,
    lang === "en"
      ? `Create core features for: ${analysis.productName}. Ensure they match the user request: "${userPrompt}"`
      : `Buat daftar fitur inti untuk: ${analysis.productName}. Pastikan sesuai dengan permintaan user: "${userPrompt}"`,
    apiKey,
    model
  );
  onProgress({ step: "features", status: "done", message: "Fitur inti selesai" });

  // ── 2b: User Flow (sees: userPrompt + analysis + features) ────
  onProgress({ step: "userflow", status: "running", message: "Merancang alur pengguna..." });
  const userFlowSysPrompt = getEffectivePrompt("userflow", customPrompts, lang)
    .replace("{userPrompt}", userPrompt)
    .replace("{analysis}", analysisJson)
    .replace("{features}", truncateForContext(features));
  const userFlow = await generateWithRetry(
    provider,
    userFlowSysPrompt,
    lang === "en"
      ? `Create user flows for: ${analysis.productName}. Ensure the flows cover all previously defined features.`
      : `Buat user flow untuk: ${analysis.productName}. Pastikan alur mencakup semua fitur yang sudah didefinisikan.`,
    apiKey,
    model
  );
  onProgress({ step: "userflow", status: "done", message: "User flow selesai" });

  // Accumulate: features + userFlow
  const accForArchitecture = [
    "## Core Features",
    truncateForContext(features),
    "",
    "## User Flow",
    truncateForContext(userFlow),
  ].join("\n");

  // ── 2c: Architecture (sees: userPrompt + analysis + features + userFlow)
  onProgress({ step: "architecture", status: "running", message: "Merancang arsitektur sistem..." });
  const archSysPrompt = getEffectivePrompt("architecture", customPrompts, lang)
    .replace("{userPrompt}", userPrompt)
    .replace("{analysis}", analysisJson)
    .replace("{features}", accForArchitecture);
  const architecture = await generateWithRetry(
    provider,
    archSysPrompt,
    lang === "en"
      ? `Create architecture diagram for: ${analysis.productName}. Ensure the architecture supports all features and user flows above.`
      : `Buat diagram arsitektur untuk: ${analysis.productName}. Pastikan arsitektur mendukung semua fitur dan user flow di atas.`,
    apiKey,
    model
  );
  onProgress({ step: "architecture", status: "done", message: "Arsitektur sistem selesai" });

  // Accumulate: features + userFlow + architecture
  const accForDatabase = [
    "## Core Features",
    truncateForContext(features),
    "",
    "## User Flow",
    truncateForContext(userFlow),
    "",
    "## Architecture",
    truncateForContext(architecture),
  ].join("\n");

  // ── 2d: Database (sees: userPrompt + analysis + features + userFlow + architecture)
  onProgress({ step: "database", status: "running", message: "Merancang skema database..." });
  const dbSysPrompt = getEffectivePrompt("database", customPrompts, lang)
    .replace("{userPrompt}", userPrompt)
    .replace("{analysis}", analysisJson)
    .replace("{features}", accForDatabase);
  const database = await generateWithRetry(
    provider,
    dbSysPrompt,
    lang === "en"
      ? `Create database schema for: ${analysis.productName}. Ensure the schema supports the architecture and features defined above.`
      : `Buat skema database untuk: ${analysis.productName}. Pastikan skema mendukung arsitektur dan fitur yang sudah didefinisikan.`,
    apiKey,
    model
  );
  onProgress({ step: "database", status: "done", message: "Skema database selesai" });

  // Accumulate: features + userFlow + architecture + database
  const accForTechReq = [
    "## Core Features",
    truncateForContext(features),
    "",
    "## User Flow",
    truncateForContext(userFlow),
    "",
    "## Architecture",
    truncateForContext(architecture),
    "",
    "## Database Schema",
    truncateForContext(database),
  ].join("\n");

  // ── 2e: TechReq (sees: ALL previous sections)
  onProgress({ step: "techreq", status: "running", message: "Mendefinisikan persyaratan teknis..." });
  const techReqSysPrompt = getEffectivePrompt("techreq", customPrompts, lang)
    .replace("{userPrompt}", userPrompt)
    .replace("{analysis}", analysisJson)
    .replace("{features}", accForTechReq);
  const techRequirements = await generateWithRetry(
    provider,
    techReqSysPrompt,
    lang === "en"
      ? `Create technical requirements for: ${analysis.productName}. Ensure the requirements cover all sections above.`
      : `Buat technical requirements untuk: ${analysis.productName}. Pastikan requirements mencakup semua section di atas.`,
    apiKey,
    model
  );
  onProgress({ step: "techreq", status: "done", message: "Persyaratan teknis selesai" });

  return { features, userFlow, architecture, database, techRequirements };
}

/**
 * Extract a brief summary from the tech requirements section.
 * We only send this (not the full content) to the assembly AI
 * so its context window stays small.
 */
function summarizeTechReq(techReqMarkdown: string): string {
  // Take the first ~2000 chars — that covers the intro and key NFRs
  const maxLen = 2000;
  if (techReqMarkdown.length <= maxLen) return techReqMarkdown;
  return techReqMarkdown.slice(0, maxLen) + "\n\n... (ringkasan, lihat bagian lengkap di bawah)";
}

/**
 * Normalize markdown headings: ensure sections start at ## level
 * inside the final PRD (since # is the document title).
 * If a section has its own # heading, demote it one level.
 */
function normalizeHeadings(markdown: string): string {
  return markdown
    .split("\n")
    .map((line) => {
      // If line starts with # heading, demote by one level
      if (/^# /.test(line)) return "##" + line.slice(1);
      return line;
    })
    .join("\n");
}

/**
 * Programmatically compose the final PRD from all sections.
 * Only Overview and Design Constraints come from the AI call;
 * everything else is used as-is from the parallel Stage 2 generation.
 */
function composeFinalPrd(
  analysis: ProductAnalysis,
  overview: string,
  features: string,
  userFlow: string,
  architecture: string,
  database: string,
  techRequirements: string,
  designConstraints: string
): string {
  const techStack = analysis.recommendedTechStack?.length
    ? analysis.recommendedTechStack.join(", ")
    : "Modern web technologies";

  return [
    `# PRD — Product Requirements Document`,
    ``,
    `**Produk:** ${analysis.productName}`,
    ``,
    `> ${analysis.elevatorPitch}`,
    ``,
    `---`,
    ``,
    normalizeHeadings(overview),
    ``,
    `---`,
    ``,
    `## Requirements`,
    ``,
    normalizeHeadings(techRequirements),
    ``,
    `---`,
    ``,
    `## Core Features`,
    ``,
    normalizeHeadings(features),
    ``,
    `---`,
    ``,
    `## User Flow`,
    ``,
    normalizeHeadings(userFlow),
    ``,
    `---`,
    ``,
    `## Architecture`,
    ``,
    normalizeHeadings(architecture),
    ``,
    `---`,
    ``,
    `## Database Schema`,
    ``,
    normalizeHeadings(database),
    ``,
    `---`,
    ``,
    normalizeHeadings(designConstraints),
  ].join("\n");
}

async function runAssembly(
  provider: AiProvider,
  analysis: ProductAnalysis,
  sections: {
    features: string;
    userFlow: string;
    architecture: string;
    database: string;
    techRequirements: string;
  },
  apiKey: string,
  model: string,
  onProgress: ProgressCallback,
  lang: Lang,
  customPrompts?: CustomPromptMap | null
): Promise<string> {
  onProgress({
    step: "assembly",
    status: "running",
    message: "Menyusun overview dan technical constraints...",
  });

  const assemblyPrompt = getEffectivePrompt("assembly", customPrompts, lang)
    .replace("{analysis}", JSON.stringify(analysis, null, 2))
    .replace("{techReqSummary}", summarizeTechReq(sections.techRequirements));

  const userPrompt = lang === "en"
    ? `Create Overview and Design & Technical Constraints for: ${analysis.productName}.`
    : `Buat Overview dan Design & Technical Constraints untuk: ${analysis.productName}.`;

  const text = await generateWithRetry(provider, assemblyPrompt, userPrompt, apiKey, model);

  // Parse JSON response
  let overview = "";
  let designConstraints = "";
  try {
    const jsonStr = extractJsonFromResponse(text);
    const parsed = JSON.parse(jsonStr);
    overview = parsed.overview || "";
    designConstraints = parsed.designConstraints || "";
  } catch {
    // If JSON parsing fails, use the raw text as overview
    overview = text;
    designConstraints = "";
  }

  // Programmatically assemble the final PRD.
  // Stage 2 sections go in directly — they're already detailed, well-formatted markdown.
  // This avoids the AI having to re-output thousands of tokens it already generated.
  const finalPrd = composeFinalPrd(
    analysis,
    overview,
    sections.features,
    sections.userFlow,
    sections.architecture,
    sections.database,
    sections.techRequirements,
    designConstraints
  );

  onProgress({ step: "assembly", status: "done", message: "PRD final selesai!" });

  return finalPrd;
}

/* ------------------------------------------------------------------ */
/*  Main pipeline entry point                                         */
/* ------------------------------------------------------------------ */

/**
 * Generate a comprehensive PRD using the modular pipeline:
 * Stage 1: Product Analysis (1 call)
 * Stage 2: Sequential Section Generation (5 sequential calls)
 * Stage 3: Final Assembly (1 call)
 *
 * Total: 7 AI calls, significantly more detailed output.
 */
export async function generatePrdModular(
  provider: AiProvider,
  prompt: string,
  apiKey: string,
  model: string,
  onProgress: ProgressCallback,
  lang: Lang,
  customPrompts?: CustomPromptMap | null
): Promise<string> {
  // Stage 1: Analysis
  const analysis = await runAnalysis(provider, prompt, apiKey, model, onProgress, lang, customPrompts);

  // Stage 2: Sequential section generation with accumulating context
  const sections = await runSectionGeneration(provider, prompt, analysis, apiKey, model, onProgress, lang, customPrompts);

  // Stage 3: Assembly
  const finalPrd = await runAssembly(provider, analysis, sections, apiKey, model, onProgress, lang, customPrompts);

  return finalPrd;
}
