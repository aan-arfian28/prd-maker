import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const SAVED_PRD_DIR = path.resolve(process.cwd(), "..", "saved_prds");

function extractTitle(md: string): string {
  const match = md.match(/^#\s+(.+)$/m);
  return match ? match[1].trim() : "untitled-prd";
}

function sanitizeFilename(title: string): string {
  return title
    .replace(/[^a-zA-Z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .slice(0, 80)
    .toLowerCase() || "untitled-prd";
}

export async function POST(request: Request) {
  try {
    const { markdown } = await request.json();

    if (!markdown || typeof markdown !== "string") {
      return NextResponse.json(
        { error: "Markdown content is required" },
        { status: 400 }
      );
    }

    // Ensure directory exists
    if (!fs.existsSync(SAVED_PRD_DIR)) {
      fs.mkdirSync(SAVED_PRD_DIR, { recursive: true });
    }

    const title = extractTitle(markdown);
    const baseFilename = sanitizeFilename(title);
    const dateStr = new Date().toISOString().slice(0, 10);
    let filename = `${dateStr}-${baseFilename}.md`;

    // Avoid overwriting — append counter if file exists
    let counter = 1;
    while (fs.existsSync(path.join(SAVED_PRD_DIR, filename))) {
      filename = `${dateStr}-${baseFilename}-${counter}.md`;
      counter++;
    }

    fs.writeFileSync(path.join(SAVED_PRD_DIR, filename), markdown, "utf-8");

    return NextResponse.json({ success: true, filename });
  } catch (error) {
    console.error("Save PRD error:", error);
    return NextResponse.json(
      { error: "Gagal menyimpan PRD" },
      { status: 500 }
    );
  }
}
