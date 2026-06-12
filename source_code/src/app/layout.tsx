import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI PRD Maker — Buat PRD Profesional dengan AI",
  description:
    "Buat Product Requirements Document (PRD) profesional dengan bantuan AI DeepSeek. Dilengkapi diagram UML (Mermaid), chat revisi, dan export markdown.",
  keywords: ["PRD", "Product Requirements Document", "AI", "DeepSeek", "Mermaid", "UML"],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      <body className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50">
        {children}
      </body>
    </html>
  );
}
