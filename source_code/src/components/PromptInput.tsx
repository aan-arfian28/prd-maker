"use client";

import { useState } from "react";

interface PromptInputProps {
  onSubmit: (prompt: string) => void;
  isLoading: boolean;
}

const EXAMPLE_PROMPTS = [
  "Aplikasi inventaris gudang dengan pencatatan stok masuk/keluar, manajemen batch, dan peringatan stok rendah untuk admin tunggal",
  "Aplikasi manajemen proyek dengan fitur Kanban board, time tracking, dan laporan progres untuk tim kecil 5-10 orang",
  "Aplikasi e-learning dengan fitur kursus video, kuis interaktif, dan sertifikat kelulusan untuk platform pendidikan online",
];

export default function PromptInput({ onSubmit, isLoading }: PromptInputProps) {
  const [prompt, setPrompt] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (prompt.trim() && !isLoading) {
      onSubmit(prompt.trim());
    }
  }

  function handleExampleClick(example: string) {
    setPrompt(example);
  }

  return (
    <div className="w-full max-w-3xl mx-auto">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="relative">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Deskripsikan aplikasi yang ingin Anda buat PRD-nya...&#10;&#10;Contoh: Aplikasi inventaris gudang dengan pencatatan stok masuk/keluar, manajemen batch, dan peringatan stok rendah untuk admin tunggal"
            className="w-full h-36 px-5 py-4 bg-white border-2 border-gray-200 rounded-xl text-gray-700 placeholder-gray-400 resize-none focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all text-base leading-relaxed"
            disabled={isLoading}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
          />
          <div className="absolute bottom-3 right-3 text-xs text-gray-400">
            Ctrl+Enter untuk kirim
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="text-xs text-gray-500">
            ✨ AI akan membuatkan PRD lengkap dengan diagram Mermaid
          </div>
          <button
            type="submit"
            disabled={!prompt.trim() || isLoading}
            className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white font-medium rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-indigo-600/20 hover:shadow-indigo-600/30 active:scale-[0.98]"
          >
            {isLoading ? (
              "Membuat PRD..."
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Buat PRD
              </>
            )}
          </button>
        </div>
      </form>

      {/* Example prompts */}
      <div className="mt-8">
        <h3 className="text-sm font-medium text-gray-500 mb-3">
          💡 Contoh prompt:
        </h3>
        <div className="grid gap-2">
          {EXAMPLE_PROMPTS.map((example, i) => (
            <button
              key={i}
              onClick={() => handleExampleClick(example)}
              disabled={isLoading}
              className="text-left px-4 py-3 bg-gray-50 hover:bg-indigo-50 border border-gray-200 hover:border-indigo-200 rounded-lg text-sm text-gray-600 hover:text-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="text-indigo-400 mr-2">→</span>
              {example}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
