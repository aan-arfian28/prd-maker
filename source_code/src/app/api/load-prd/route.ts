import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const SAVED_PRD_DIR = path.resolve(process.cwd(), "..", "saved_prds");

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const filename = searchParams.get("filename");

    if (!filename) {
      return NextResponse.json(
        { error: "Filename parameter is required" },
        { status: 400 }
      );
    }

    // Security: prevent directory traversal
    const safeName = path.basename(filename);
    const filePath = path.join(SAVED_PRD_DIR, safeName);

    if (!fs.existsSync(filePath)) {
      return NextResponse.json(
        { error: "File tidak ditemukan" },
        { status: 404 }
      );
    }

    const markdown = fs.readFileSync(filePath, "utf-8");

    return NextResponse.json({ markdown, filename: safeName });
  } catch (error) {
    console.error("Load PRD error:", error);
    return NextResponse.json(
      { error: "Gagal membaca file PRD" },
      { status: 500 }
    );
  }
}
