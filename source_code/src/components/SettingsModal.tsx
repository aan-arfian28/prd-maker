"use client";

import { useState, useEffect, useCallback } from "react";
import type { AiModelInfo } from "@/lib/modelList";
import { FALLBACK_MODELS } from "@/lib/modelList";

export interface AppSettings {
  apiKey: string;
  model: string; // model name e.g. "deepseek-chat"
}

const STORAGE_KEY = "ai-prd-maker-settings";

function loadSettings(): AppSettings {
  if (typeof window === "undefined") {
    return { apiKey: "", model: "deepseek-chat" };
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        apiKey: parsed.apiKey || "",
        model: parsed.model || "deepseek-chat",
      };
    }
  } catch {
    // ignore
  }
  return { apiKey: "", model: "deepseek-chat" };
}

function saveSettings(settings: AppSettings) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // ignore
  }
}

function clearSettings() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

/* ------------------------------------------------------------------ */
/*  Hook to share settings across components                          */
/* ------------------------------------------------------------------ */

let cachedSettings: AppSettings | null = null;
const listeners = new Set<() => void>();

export function getStoredSettings(): AppSettings {
  if (!cachedSettings) cachedSettings = loadSettings();
  return cachedSettings;
}

export function useSettings(): {
  settings: AppSettings;
  setApiKey: (key: string) => void;
  setModel: (model: string) => void;
  clearAll: () => void;
} {
  const [settings, setSettings] = useState<AppSettings>(getStoredSettings);

  useEffect(() => {
    const handler = () => setSettings(getStoredSettings());
    listeners.add(handler);
    return () => {
      listeners.delete(handler);
    };
  }, []);

  const setApiKey = useCallback((apiKey: string) => {
    const current = getStoredSettings();
    const updated = { ...current, apiKey };
    cachedSettings = updated;
    saveSettings(updated);
    listeners.forEach((l) => l());
  }, []);

  const setModel = useCallback((model: string) => {
    const current = getStoredSettings();
    const updated = { ...current, model };
    cachedSettings = updated;
    saveSettings(updated);
    listeners.forEach((l) => l());
  }, []);

  const clearAll = useCallback(() => {
    cachedSettings = { apiKey: "", model: "deepseek-chat" };
    clearSettings();
    listeners.forEach((l) => l());
  }, []);

  return { settings, setApiKey, setModel, clearAll };
}

/* ------------------------------------------------------------------ */
/*  Modal component                                                   */
/* ------------------------------------------------------------------ */

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const { settings, setApiKey, setModel, clearAll } = useSettings();
  const [apiKeyInput, setApiKeyInput] = useState(settings.apiKey);
  const [showKey, setShowKey] = useState(false);
  const [models, setModels] = useState<AiModelInfo[]>(FALLBACK_MODELS);
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [saved, setSaved] = useState(false);

  // Sync local input when settings change externally
  useEffect(() => {
    setApiKeyInput(settings.apiKey);
  }, [settings.apiKey]);

  // Fetch model list when modal opens with a key
  useEffect(() => {
    if (isOpen && settings.apiKey) {
      fetchModels(settings.apiKey);
    } else if (isOpen) {
      setModels(FALLBACK_MODELS);
    }
  }, [isOpen, settings.apiKey]);

  async function fetchModels(apiKey: string) {
    if (!apiKey) {
      setModels(FALLBACK_MODELS);
      return;
    }
    setIsLoadingModels(true);
    try {
      const res = await fetch("/api/list-models", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey }),
      });
      const data = await res.json();
      if (data.models && Array.isArray(data.models)) {
        setModels(data.models);
      }
    } catch {
      // keep current list
    } finally {
      setIsLoadingModels(false);
    }
  }

  function handleSave() {
    setApiKey(apiKeyInput.trim());
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function handleClear() {
    setApiKeyInput("");
    clearAll();
    setModels(FALLBACK_MODELS);
  }

  function handleOverlayClick(e: React.MouseEvent) {
    if (e.target === e.currentTarget) onClose();
  }

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={handleOverlayClick}
    >
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-md overflow-hidden animate-fadeInUp">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            </svg>
            <h2 className="text-lg font-semibold text-white">Pengaturan</h2>
          </div>
          <button
            onClick={onClose}
            className="text-white/70 hover:text-white transition-colors"
            title="Tutup"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          {/* API Key */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              DeepSeek API Key
            </label>
            <div className="relative">
              <input
                type={showKey ? "text" : "password"}
                value={apiKeyInput}
                onChange={(e) => setApiKeyInput(e.target.value)}
                placeholder="Masukkan DeepSeek API Key..."
                className="w-full px-4 py-2.5 pr-20 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/20 transition-all font-mono"
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-gray-400 hover:text-gray-600 transition-colors"
                title={showKey ? "Sembunyikan" : "Tampilkan"}
              >
                {showKey ? (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243a9.99 9.99 0 01-4.243-4.243M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>
            <p className="mt-1.5 text-xs text-gray-400">
              <a
                href="https://platform.deepseek.com/api_keys"
                target="_blank"
                rel="noopener noreferrer"
                className="text-indigo-600 hover:text-indigo-800 underline"
              >
                Dapatkan API Key
              </a>
              {" "}dari DeepSeek Platform. Key disimpan di browser Anda.
            </p>
          </div>

          {/* Model Selector */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              Model AI
            </label>
            <div className="flex gap-2">
              <select
                value={settings.model}
                onChange={(e) => setModel(e.target.value)}
                className="flex-1 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-700 focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/20 transition-all"
              >
                {models.map((m) => (
                  <option key={m.name} value={m.name}>
                    {m.displayName}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => fetchModels(settings.apiKey || apiKeyInput)}
                disabled={isLoadingModels}
                className="px-3 py-2 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-xl text-gray-500 hover:text-gray-700 transition-all disabled:opacity-50"
                title="Refresh model list"
              >
                {isLoadingModels ? (
                  <div className="w-5 h-5 border-2 border-gray-300 border-t-indigo-500 rounded-full animate-spin" />
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                )}
              </button>
            </div>
            {/* Show selected model description */}
            {(() => {
              const selected = models.find((m) => m.name === settings.model);
              return selected?.description ? (
                <p className="mt-1.5 text-xs text-gray-400">{selected.description}</p>
              ) : null;
            })()}
          </div>

          {/* Status indicator */}
          <div className="flex items-center gap-2 text-xs">
            {settings.apiKey ? (
              <>
                <div className="w-2 h-2 bg-green-500 rounded-full" />
                <span className="text-green-600">API Key tersimpan</span>
              </>
            ) : (
              <>
                <div className="w-2 h-2 bg-yellow-500 rounded-full" />
                <span className="text-yellow-600">
                  API Key belum diatur — menggunakan key dari server (.env)
                </span>
              </>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
          <button
            onClick={handleClear}
            className="px-4 py-2 text-sm font-medium text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors"
          >
            Hapus Semua
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 bg-white border border-gray-200 rounded-lg hover:bg-gray-100 transition-all"
            >
              Batal
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
                  Tersimpan
                </>
              ) : (
                "Simpan"
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
