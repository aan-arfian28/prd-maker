"use client";

import { useState, useCallback } from "react";
import type { ChatMessage } from "@/lib/types";
import PromptInput from "@/components/PromptInput";
import PrdViewer from "@/components/PrdViewer";
import PrdHistory from "@/components/PrdHistory";
import SettingsModal, { getStoredSettings } from "@/components/SettingsModal";

export default function Home() {
  const [prdContent, setPrdContent] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const handleGenerate = useCallback(async (prompt: string) => {
    setIsLoading(true);
    setError(null);
    setPrdContent("");

    try {
      const settings = getStoredSettings();

      const response = await fetch("/api/generate-prd", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          apiKey: settings.apiKey || undefined,
          model: settings.model || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Gagal membuat PRD");
      }

      setPrdContent(data.prd);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Terjadi kesalahan yang tidak diketahui";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleRevision = useCallback(
    async (newPrd: string, _messages: ChatMessage[], _newMessage: string) => {
      setPrdContent(newPrd);
    },
    []
  );

  const handleLoadExample = useCallback(async () => {
    setError(null);
    setIsLoading(true);
    try {
      const response = await fetch("/contoh_prd.md");
      if (!response.ok) {
        throw new Error("Gagal memuat contoh PRD");
      }
      const markdown = await response.text();
      setPrdContent(markdown);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Terjadi kesalahan saat memuat contoh PRD";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  function handleReset() {
    setPrdContent("");
    setError(null);
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <PrdHistory onLoadPrd={(markdown) => setPrdContent(markdown)} />

            <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">AI PRD Maker</h1>
              <p className="text-xs text-gray-500">Powered by DeepSeek AI</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {prdContent && (
              <button
                onClick={handleReset}
                className="text-sm text-gray-500 hover:text-red-600 transition-colors flex items-center gap-1"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Reset
              </button>
            )}

            {/* Settings button */}
            <button
              onClick={() => setSettingsOpen(true)}
              className="text-sm text-gray-500 hover:text-indigo-600 transition-colors flex items-center gap-1"
              title="Pengaturan API Key & Model"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              </svg>
              Pengaturan
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8">
        {/* Error Alert */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3 animate-fadeInUp">
            <div className="w-5 h-5 bg-red-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
              <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-red-800">Gagal membuat PRD</p>
              <p className="text-sm text-red-600 mt-1">{error}</p>
              {(error.includes("API Key") || error.includes("API key")) && (
                <button
                  onClick={() => setSettingsOpen(true)}
                  className="inline-block mt-2 text-sm text-indigo-600 hover:text-indigo-800 font-medium"
                >
                  Buka Pengaturan untuk memasukkan API Key DeepSeek
                </button>
              )}
            </div>
            <button
              onClick={() => setError(null)}
              className="text-red-400 hover:text-red-600 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="mb-8 p-8 bg-white border border-gray-200 rounded-2xl shadow-sm animate-fadeInUp">
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-indigo-100 rounded-2xl flex items-center justify-center mb-4">
                <div className="w-8 h-8 border-3 border-indigo-300 border-t-indigo-600 rounded-full animate-spin" />
              </div>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">Membuat PRD Anda...</h3>
              <p className="text-sm text-gray-500 max-w-md">
                AI sedang menganalisis kebutuhan Anda dan membuat PRD profesional lengkap dengan diagram.
                Ini mungkin memerlukan waktu beberapa detik.
              </p>
              <div className="mt-4 flex gap-1.5">
                <div className="w-2 h-2 bg-indigo-400 rounded-full animate-pulse" style={{ animationDelay: "0s" }} />
                <div className="w-2 h-2 bg-indigo-400 rounded-full animate-pulse" style={{ animationDelay: "0.2s" }} />
                <div className="w-2 h-2 bg-indigo-400 rounded-full animate-pulse" style={{ animationDelay: "0.4s" }} />
              </div>
            </div>
          </div>
        )}

        {/* PRD Viewer or Prompt Input */}
        {prdContent ? (
          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm animate-fadeInUp">
            <PrdViewer
              markdown={prdContent}
              onRevision={handleRevision}
            />
          </div>
        ) : (
          !isLoading && (
            <div className="animate-fadeInUp">
              {/* Hero Section */}
              <div className="text-center mb-10 mt-4">
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-50 border border-indigo-200 rounded-full text-xs font-medium text-indigo-600 mb-4">
                  ✨ Powered by DeepSeek AI
                </div>
                <h2 className="text-3xl font-bold text-gray-900 mb-3">
                  Buat PRD Profesional dengan AI
                </h2>
                <p className="text-gray-500 max-w-lg mx-auto leading-relaxed">
                  Deskripsikan aplikasi yang ingin Anda bangun, dan AI akan membuatkan{" "}
                  <strong>Product Requirements Document</strong> lengkap dengan diagram UML,
                  database schema, user flow, dan spesifikasi teknis.
                </p>

                <button
                  onClick={handleLoadExample}
                  className="mt-4 inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  Lihat Contoh PRD
                </button>
              </div>

              <PromptInput onSubmit={handleGenerate} isLoading={isLoading} />

              {/* Features Grid */}
              <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-4 max-w-3xl mx-auto">
                <div className="p-5 bg-white border border-gray-200 rounded-xl text-center">
                  <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                    <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <h3 className="text-sm font-semibold text-gray-800 mb-1">Markdown PRD</h3>
                  <p className="text-xs text-gray-500">Dokumen PRD terstruktur dalam format Markdown profesional</p>
                </div>
                <div className="p-5 bg-white border border-gray-200 rounded-xl text-center">
                  <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                    <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zm0 8a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zm12 0a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
                    </svg>
                  </div>
                  <h3 className="text-sm font-semibold text-gray-800 mb-1">Diagram UML</h3>
                  <p className="text-xs text-gray-500">Sequence diagram & ERD otomatis dalam format Mermaid</p>
                </div>
                <div className="p-5 bg-white border border-gray-200 rounded-xl text-center">
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                    <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                    </svg>
                  </div>
                  <h3 className="text-sm font-semibold text-gray-800 mb-1">Chat Revisi</h3>
                  <p className="text-xs text-gray-500">Diskusikan & revisi PRD melalui chat interaktif dengan AI</p>
                </div>
              </div>
            </div>
          )
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 mt-16 py-6 text-center text-xs text-gray-400">
        <p>AI PRD Maker — Dibuat dengan Next.js + DeepSeek AI</p>
      </footer>

      {/* Settings Modal */}
      <SettingsModal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />
    </div>
  );
}
