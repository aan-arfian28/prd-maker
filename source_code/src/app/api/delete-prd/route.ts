import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const SAVED_PRD_DIR = path.resolve(process.cwd(), "..", "saved_prds");

export async function DELETE(request: Request) {
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

    fs.unlinkSync(filePath);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete PRD error:", error);
    return NextResponse.json(
      { error: "Gagal menghapus PRD" },
      { status: 500 }
    );
  }
}
