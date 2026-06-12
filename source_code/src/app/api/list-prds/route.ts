import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const SAVED_PRD_DIR = path.resolve(process.cwd(), "..", "saved_prds");

interface PrdInfo {
  filename: string;
  title: string;
  createdAt: string;
  size: number;
}

function extractTitle(md: string): string {
  const match = md.match(/^#\s+(.+)$/m);
  return match ? match[1].trim() : "Untitled PRD";
}

export async function GET() {
  try {
    if (!fs.existsSync(SAVED_PRD_DIR)) {
      return NextResponse.json({ prds: [] });
    }

    const files = fs.readdirSync(SAVED_PRD_DIR);
    const prds: PrdInfo[] = [];

    for (const file of files) {
      if (!file.endsWith(".md")) continue;

      const filePath = path.join(SAVED_PRD_DIR, file);
      const stat = fs.statSync(filePath);

      // Read first few lines to extract title
      let title = "Untitled PRD";
      try {
        const content = fs.readFileSync(filePath, "utf-8");
        title = extractTitle(content);
      } catch {
        // If we can't read, just use filename
        title = file.replace(/\.md$/, "");
      }

      prds.push({
        filename: file,
        title,
        createdAt: stat.birthtime.toISOString(),
        size: stat.size,
      });
    }

    // Sort by creation date, newest first
    prds.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    return NextResponse.json({ prds });
  } catch (error) {
    console.error("List PRDs error:", error);
    return NextResponse.json(
      { error: "Gagal membaca daftar PRD" },
      { status: 500 }
    );
  }
}
