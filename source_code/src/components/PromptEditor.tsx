"use client";

import React, { useState, useEffect } from "react";
import { PROMPT_METADATA, getDefaultPrompts } from "@/lib/prompts";
import type { PromptMeta } from "@/lib/prompts";
import { loadCustomPrompts, saveCustomPrompts, clearCustomPrompts } from "@/lib/prompt-customization";
import type { CustomPromptMap } from "@/lib/prompt-customization";
import { useLanguage } from "@/lib/i18n";

/* ------------------------------------------------------------------ */
/*  Props                                                             */
/* ------------------------------------------------------------------ */

interface PromptEditorProps {
  isOpen: boolean;
  onClose: () => void;
}

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */

export default function PromptEditor({ isOpen, onClose }: PromptEditorProps) {
  const { t, lang, toggleLang } = useLanguage();
  const [activeTab, setActiveTab] = useState<string>(PROMPT_METADATA[0]?.key || "");
  const [edits, setEdits] = useState<CustomPromptMap>({});
  const [saved, setSaved] = useState(false);
  const [resetKey, setResetKey] = useState("");

  // Load custom prompts from localStorage when opened
  useEffect(() => {
    if (isOpen) {
      setEdits(loadCustomPrompts(lang));
      setActiveTab(PROMPT_METADATA[0]?.key || "");
    }
  }, [isOpen, lang]);

  const activeMeta: PromptMeta | undefined = PROMPT_METADATA.find(
    (m) => m.key === activeTab
  );

  const defaults = getDefaultPrompts(lang);
  const currentText =
    edits[activeTab] !== undefined
      ? edits[activeTab]
      : defaults[activeTab] || "";

  const isModified = currentText !== (defaults[activeTab] || "");

  function handleTextChange(value: string) {
    setEdits((prev) => ({ ...prev, [activeTab]: value }));
    setSaved(false);
  }

  function handleSave() {
    saveCustomPrompts(lang, edits);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function handleResetCurrent() {
    setEdits((prev) => {
      const next = { ...prev };
      delete next[activeTab];
      return next;
    });
    setResetKey(activeTab);
    setTimeout(() => setResetKey(""), 100);
  }

  function handleResetAll() {
    if (window.confirm(t("promptEditor.reset") + "?")) {
      clearCustomPrompts(lang);
      setEdits({});
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
  }

  function handleOverlayClick(e: React.MouseEvent) {
    if (e.target === e.currentTarget) onClose();
  }

  // Count how many prompts are customized
  const customizedCount = Object.keys(edits).length;

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[110] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={handleOverlayClick}
    >
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-4xl h-[85vh] flex flex-col overflow-hidden animate-fadeInUp">
        {/* Header */}
        <div className="bg-gradient-to-r from-gray-800 to-gray-900 px-6 py-4 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-white/10 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Prompt Editor</h2>
              <p className="text-xs text-gray-400">
                Kustomisasi prompt AI untuk setiap tahap pipeline
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Language toggle inside editor */}
            <button
              onClick={toggleLang}
              className="relative inline-flex items-center h-7 w-[60px] rounded-full transition-colors bg-white/20 hover:bg-white/30 flex-shrink-0"
              title={t("lang.switch")}
            >
              <span className="absolute left-3 text-[10px] font-medium text-white/50 select-none pointer-events-none">EN</span>
              <span className="absolute right-3 text-[10px] font-medium text-white/50 select-none pointer-events-none">ID</span>
              <span
                className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform ${
                  lang === "en" ? "translate-x-[34px]" : "translate-x-0.5"
                }`}
              />
            </button>
            {customizedCount > 0 && (
              <span className="text-xs text-yellow-400 bg-yellow-400/10 px-2 py-1 rounded-full">
                {customizedCount} {t("promptEditor.custom")}
              </span>
            )}
            <button
              onClick={onClose}
              className="text-white/50 hover:text-white transition-colors"
              title={t("settings.close")}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Body: sidebar tabs + editor */}
        <div className="flex flex-1 min-h-0">
          {/* Left: Tab list */}
          <div className="w-56 bg-gray-50 border-r border-gray-200 overflow-y-auto flex-shrink-0 p-2 space-y-1">
            {PROMPT_METADATA.map((meta) => {
              const isActive = meta.key === activeTab;
              const mod = edits[meta.key] !== undefined;
              return (
                <button
                  key={meta.key}
                  onClick={() => setActiveTab(meta.key)}
                  className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-all ${
                    isActive
                      ? "bg-indigo-600 text-white font-medium shadow-sm"
                      : "text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="truncate">{meta.name}</span>
                    {mod && !isActive && (
                      <span className="w-1.5 h-1.5 bg-yellow-500 rounded-full flex-shrink-0" title="Dikustomisasi" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Right: Editor */}
          <div className="flex-1 flex flex-col min-w-0">
            {/* Tab info bar */}
            {activeMeta && (
              <div className="px-6 py-3 bg-white border-b border-gray-200 flex-shrink-0">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="text-sm font-semibold text-gray-800">
                    {activeMeta.name}
                  </h3>
                  <div className="flex items-center gap-2">
                    {isModified && (
                      <span className="text-[10px] text-yellow-600 bg-yellow-50 px-2 py-0.5 rounded-full font-medium">
                        Dimodifikasi
                      </span>
                    )}
                    <span className="text-[10px] text-gray-400">
                      {currentText.length.toLocaleString()} karakter
                    </span>
                  </div>
                </div>
                <p className="text-xs text-gray-500">{activeMeta.description}</p>
                {activeMeta.variables.length > 0 && (
                  <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                    <span className="text-[10px] text-gray-400">Variabel:</span>
                    {activeMeta.variables.map((v) => (
                      <code
                        key={v}
                        className="text-[10px] bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded font-mono"
                      >
                        {v}
                      </code>
                    ))}
                    <span className="text-[10px] text-gray-400 ml-1">
                      — jangan hapus variabel ini
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Textarea */}
            <div className="flex-1 p-4 min-h-0">
              <textarea
                key={activeTab + resetKey}
                value={currentText}
                onChange={(e) => handleTextChange(e.target.value)}
                className="w-full h-full resize-none px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/20 transition-all font-mono leading-relaxed"
                spellCheck={false}
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-gray-50 border-t border-gray-200 flex items-center justify-between flex-shrink-0">
          <button
            onClick={handleResetAll}
            className="px-4 py-2 text-sm font-medium text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors"
          >
            {t("promptEditor.reset")}
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={handleResetCurrent}
              disabled={!isModified}
              className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 bg-white border border-gray-200 rounded-lg hover:bg-gray-100 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {t("promptEditor.reset")}
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 bg-white border border-gray-200 rounded-lg hover:bg-gray-100 transition-all"
            >
              {t("promptEditor.cancel")}
            </button>
            <button
              onClick={handleSave}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-all active:scale-95 shadow-sm"
            >
              {saved ? (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  {t("promptEditor.save")}
                </>
              ) : (
                t("promptEditor.save")
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
