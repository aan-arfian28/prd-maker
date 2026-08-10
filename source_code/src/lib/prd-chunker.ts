/* ------------------------------------------------------------------ */
/*  PRD Chunking Utility                                               */
/*                                                                     */
/*  Splits a PRD markdown document into semantic chunks based on       */
/*  ##-level headings, and reassembles after partial updates.          */
/* ------------------------------------------------------------------ */

export interface PrdChunk {
  /** Stable ID derived from heading text (e.g. "core-features") */
  id: string;
  /** The full heading line including ## prefix (e.g. "## 3. Core Features") */
  heading: string;
  /** Heading level (always 2 for ## chunks) */
  level: number;
  /** Body content after the heading line, up to the next ## heading */
  body: string;
  /** Byte offset where this chunk's heading starts in the original markdown */
  startOffset: number;
  /** Byte offset where this chunk ends (start of next chunk, or end of string) */
  endOffset: number;
}

export interface ChunkUpdate {
  /** ID of the chunk to replace */
  id: string;
  /** New full content for this chunk (heading + body) */
  content: string;
}

/* ------------------------------------------------------------------ */
/*  Heading → ID conversion                                            */
/* ------------------------------------------------------------------ */

function headingToId(heading: string): string {
  // Strip leading ## and any whitespace
  let text = heading.replace(/^##\s+/, "").trim();

  // Remove numbering like "1.", "3.", "2a." etc.
  text = text.replace(/^[\d]+[a-z]?\.\s*/, "");

  // Lowercase, replace non-alphanumeric with hyphens, collapse hyphens
  text = text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");

  return text || "section";
}

/* ------------------------------------------------------------------ */
/*  Split PRD into chunks                                              */
/* ------------------------------------------------------------------ */

/**
 * Split a PRD markdown string into chunks by ##-level headings.
 * Content before the first ## heading becomes a special "header" chunk.
 *
 * Mermaid code blocks (```mermaid) are handled: ## lines inside them
 * are NOT treated as heading boundaries.
 */
export function chunkPrd(markdown: string): PrdChunk[] {
  const chunks: PrdChunk[] = [];
  const headingRegex = /^##\s+.+$/gm;

  // Find all heading positions, skipping those inside mermaid blocks
  const headingPositions: { index: number; heading: string }[] = [];
  const mermaidBlockRegex = /```mermaid[\s\S]*?```/g;
  const mermaidRanges: [number, number][] = [];

  let mermaidMatch: RegExpExecArray | null;
  while ((mermaidMatch = mermaidBlockRegex.exec(markdown)) !== null) {
    mermaidRanges.push([mermaidMatch.index, mermaidMatch.index + mermaidMatch[0].length]);
  }

  function isInsideMermaid(pos: number): boolean {
    return mermaidRanges.some(([start, end]) => pos >= start && pos < end);
  }

  let headingMatch: RegExpExecArray | null;
  while ((headingMatch = headingRegex.exec(markdown)) !== null) {
    if (!isInsideMermaid(headingMatch.index)) {
      headingPositions.push({ index: headingMatch.index, heading: headingMatch[0] });
    }
  }

  if (headingPositions.length === 0) {
    // No ## headings found — treat entire document as one chunk
    chunks.push({
      id: "full-prd",
      heading: "",
      level: 0,
      body: markdown,
      startOffset: 0,
      endOffset: markdown.length,
    });
    return chunks;
  }

  // Preamble before first ## heading
  if (headingPositions[0].index > 0) {
    const preamble = markdown.slice(0, headingPositions[0].index).trim();
    if (preamble) {
      chunks.push({
        id: "header",
        heading: "",
        level: 0,
        body: preamble,
        startOffset: 0,
        endOffset: headingPositions[0].index,
      });
    }
  }

  // Process each heading and its body
  for (let i = 0; i < headingPositions.length; i++) {
    const { index, heading } = headingPositions[i];
    const headingLineEnd = markdown.indexOf("\n", index);
    const bodyStart = headingLineEnd !== -1 ? headingLineEnd + 1 : index + heading.length;
    const bodyEnd =
      i < headingPositions.length - 1
        ? headingPositions[i + 1].index
        : markdown.length;

    // Skip the heading line itself in the body
    let body = markdown.slice(bodyStart, bodyEnd).trim();

    chunks.push({
      id: headingToId(heading),
      heading,
      level: 2,
      body,
      startOffset: index,
      endOffset: bodyEnd,
    });
  }

  return chunks;
}

/* ------------------------------------------------------------------ */
/*  Reassemble PRD with updated chunks                                 */
/* ------------------------------------------------------------------ */

/**
 * Apply chunk updates to the original markdown string.
 * Only chunks whose IDs match the updates are replaced; others stay intact.
 *
 * Returns the reassembled full PRD markdown.
 */
export function reassemblePrd(
  originalMarkdown: string,
  chunks: PrdChunk[],
  updates: ChunkUpdate[]
): string {
  const updateMap = new Map(updates.map((u) => [u.id, u.content]));

  // Build the new document by splicing in updated chunks
  const parts: string[] = [];
  let cursor = 0;

  for (const chunk of chunks) {
    // Copy everything from cursor to chunk start (gaps between chunks)
    if (chunk.startOffset > cursor) {
      parts.push(originalMarkdown.slice(cursor, chunk.startOffset));
    }

    if (updateMap.has(chunk.id)) {
      // Use updated content
      const newContent = updateMap.get(chunk.id)!;
      // Ensure the updated content starts with the original heading if it doesn't already
      if (chunk.heading && !newContent.trimStart().startsWith("##")) {
        parts.push(chunk.heading + "\n\n" + newContent.trim());
      } else {
        parts.push(newContent);
      }
    } else {
      // Keep original: heading + body
      if (chunk.heading) {
        parts.push(chunk.heading + "\n\n" + chunk.body);
      } else {
        parts.push(chunk.body);
      }
    }

    cursor = chunk.endOffset;
  }

  // Append any trailing content after the last chunk
  if (cursor < originalMarkdown.length) {
    parts.push(originalMarkdown.slice(cursor));
  }

  // Clean up: collapse triple+ newlines
  let result = parts.join("");
  result = result.replace(/\n{4,}/g, "\n\n\n");

  return result;
}

/* ------------------------------------------------------------------ */
/*  Format chunks for AI consumption                                    */
/* ------------------------------------------------------------------ */

/**
 * Format chunks into a structured text block that the AI can parse
 * to identify which sections need updating.
 */
export function formatChunksForPrompt(chunks: PrdChunk[]): string {
  if (chunks.length === 0) return "";

  const lines: string[] = [];

  for (const chunk of chunks) {
    if (chunk.id === "header") {
      lines.push(`---CHUNK:header---`);
      lines.push(chunk.body);
      lines.push(`---END---`);
      lines.push("");
      continue;
    }

    lines.push(`---CHUNK:${chunk.id}---`);
    lines.push(`**Heading**: ${chunk.heading}`);
    lines.push("");
    lines.push(chunk.body);
    lines.push(`---END---`);
    lines.push("");
  }

  return lines.join("\n");
}

/* ------------------------------------------------------------------ */
/*  Parse AI chunk update response                                      */
/* ------------------------------------------------------------------ */

/**
 * Parse the AI's chunk update response from the ===CHUNKS=== section.
 * Expects a JSON array of {id, content} objects.
 *
 * Returns null if parsing fails (caller should fall back to full revision).
 */
export function parseChunkUpdates(text: string): ChunkUpdate[] | null {
  // Try ===CHUNKS=== delimiter first
  const chunksMatch = text.match(/===CHUNKS===\s*\n?([\s\S]*)/i);
  if (!chunksMatch) {
    // Try JSON code block
    const jsonBlock = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
    if (!jsonBlock) {
      // Try raw JSON array anywhere
      const arrMatch = text.match(/\[\s*\{[\s\S]*\}\s*\]/);
      if (!arrMatch) return null;
      try {
        const parsed = JSON.parse(arrMatch[0]);
        if (Array.isArray(parsed) && parsed.every((i: unknown) => typeof (i as ChunkUpdate).id === "string")) {
          return parsed as ChunkUpdate[];
        }
      } catch {
        return null;
      }
      return null;
    }
    try {
      const parsed = JSON.parse(jsonBlock[1].trim());
      if (Array.isArray(parsed)) return parsed as ChunkUpdate[];
    } catch {
      return null;
    }
    return null;
  }

  const jsonStr = chunksMatch[1].trim();

  // Try direct JSON parse
  try {
    const parsed = JSON.parse(jsonStr);
    if (Array.isArray(parsed)) return parsed as ChunkUpdate[];
  } catch {
    // JSON might be malformed — try to extract just the array
    const arrMatch = jsonStr.match(/\[\s*\{[\s\S]*\}\s*\]/);
    if (!arrMatch) return null;
    try {
      const parsed = JSON.parse(arrMatch[0]);
      if (Array.isArray(parsed)) return parsed as ChunkUpdate[];
    } catch {
      return null;
    }
  }

  return null;
}

/* ------------------------------------------------------------------ */
/*  Determine if a document is chunkable                                */
/* ------------------------------------------------------------------ */

/**
 * Returns true if the markdown has enough ## headings to make
 * chunking worthwhile (at least 2 sections).
 */
export function isChunkable(markdown: string): boolean {
  const chunks = chunkPrd(markdown);
  // Need at least 2 non-header chunks for chunking to be useful
  const sectionChunks = chunks.filter((c) => c.id !== "header");
  return sectionChunks.length >= 2;
}
