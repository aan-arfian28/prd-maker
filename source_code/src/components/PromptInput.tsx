"use client";

import { useState } from "react";
import { useLanguage } from "@/lib/i18n";

interface PromptInputProps {
  onSubmit: (prompt: string) => void;
  isLoading: boolean;
}

const EXAMPLE_KEYS = ["example.1", "example.2", "example.3"];
const DETAILED_EXAMPLE_KEYS = ["example.4", "example.5"];

export default function PromptInput({ onSubmit, isLoading }: PromptInputProps) {
  const { t } = useLanguage();
  const [prompt, setPrompt] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (prompt.trim() && !isLoading) {
      onSubmit(prompt.trim());
    }
  }

  function handleExampleClick(exampleKey: string) {
    setPrompt(t(exampleKey));
  }

  return (
    <div className="w-full max-w-3xl mx-auto">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="relative">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={t("input.placeholder")}
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
            {t("input.ctrlHint")}
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="text-xs text-gray-500">{t("input.featureHint")}</div>
          <button
            type="submit"
            disabled={!prompt.trim() || isLoading}
            className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white font-medium rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-indigo-600/20 hover:shadow-indigo-600/30 active:scale-[0.98]"
          >
            {isLoading ? t("input.loading") : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                {t("input.submit")}
              </>
            )}
          </button>
        </div>
      </form>

      <div className="mt-8">
        <h3 className="text-sm font-medium text-gray-500 mb-3">{t("input.examples")}</h3>
        <div className="grid gap-2">
          {EXAMPLE_KEYS.map((key, i) => (
            <button
              key={i}
              onClick={() => handleExampleClick(key)}
              disabled={isLoading}
              className="text-left px-4 py-3 bg-gray-50 hover:bg-indigo-50 border border-gray-200 hover:border-indigo-200 rounded-lg text-sm text-gray-600 hover:text-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="text-indigo-400 mr-2">→</span>
              {t(key)}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-8">
        <h3 className="text-sm font-medium text-gray-500 mb-3">{t("input.detailedExamples")}</h3>
        <div className="grid gap-2">
          {DETAILED_EXAMPLE_KEYS.map((key, i) => (
            <button
              key={i}
              onClick={() => handleExampleClick(key)}
              disabled={isLoading}
              className="text-left px-4 py-3 bg-gray-50 hover:bg-indigo-50 border border-gray-200 hover:border-indigo-200 rounded-lg text-sm text-gray-600 hover:text-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="text-indigo-400 mr-2">→</span>
              {String(t(key)).substring(0, 90) + "..."}
            </button>
          ))}
        </div>
      </div>
    </div>

    
  );
}
