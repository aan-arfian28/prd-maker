"use client";

import React, { useState, useEffect, useCallback } from "react";
import type { AiModelInfo, AppSettings, ProviderType } from "@/lib/types";
import { FALLBACK_MODELS } from "@/lib/modelList";
import { PROVIDER_META, ALL_PROVIDERS } from "@/lib/providers/types";
import PromptEditor from "./PromptEditor";
import { useLanguage } from "@/lib/i18n";

/* ------------------------------------------------------------------ */
/*  Storage helpers                                                    */
/* ------------------------------------------------------------------ */

const STORAGE_KEY = "ai-prd-maker-settings";

const DEFAULT_SETTINGS: AppSettings = {
  provider: "deepseek",
  apiKeys: {},
  model: "deepseek-chat",
};

function loadSettings(): AppSettings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      // Backward compat: migrate old single-apiKey format to per-provider apiKeys
      let apiKeys = parsed.apiKeys || {};
      if (parsed.apiKey && typeof parsed.apiKey === "string" && parsed.apiKey.trim()) {
        const provider = parsed.provider || DEFAULT_SETTINGS.provider;
        if (!apiKeys[provider]) {
          apiKeys = { ...apiKeys, [provider]: parsed.apiKey };
        }
      }
      return {
        provider: parsed.provider || DEFAULT_SETTINGS.provider,
        apiKeys,
        model: parsed.model || DEFAULT_SETTINGS.model,
      };
    }
  } catch {
    // ignore
  }
  return DEFAULT_SETTINGS;
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
/*  Shared settings state                                              */
/* ------------------------------------------------------------------ */

let cachedSettings: AppSettings | null = null;
const listeners = new Set<() => void>();

export function getStoredSettings(): AppSettings {
  if (!cachedSettings) cachedSettings = loadSettings();
  return cachedSettings;
}

export function useSettings(): {
  settings: AppSettings;
  setProvider: (provider: ProviderType) => void;
  setApiKey: (provider: ProviderType, key: string) => void;
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

  const update = useCallback((patch: Partial<AppSettings>) => {
    const current = getStoredSettings();
    const updated = { ...current, ...patch };
    cachedSettings = updated;
    saveSettings(updated);
    listeners.forEach((l) => l());
  }, []);

  const setProvider = useCallback(
    (provider: ProviderType) => {
      const meta = PROVIDER_META[provider];
      update({ provider, model: meta.defaultModel });
    },
    [update]
  );

  const setApiKey = useCallback(
    (provider: ProviderType, apiKey: string) => {
      const current = getStoredSettings();
      const updatedKeys = { ...current.apiKeys, [provider]: apiKey };
      // Clean up empty keys
      if (!apiKey) delete updatedKeys[provider];
      update({ apiKeys: updatedKeys });
    },
    [update]
  );

  const setModel = useCallback(
    (model: string) => update({ model }),
    [update]
  );

  const clearAll = useCallback(() => {
    cachedSettings = DEFAULT_SETTINGS;
    clearSettings();
    listeners.forEach((l) => l());
  }, []);

  return { settings, setProvider, setApiKey, setModel, clearAll };
}

/* ------------------------------------------------------------------ */
/*  Provider icon helper                                               */
/* ------------------------------------------------------------------ */

function ProviderIcon({ provider }: { provider: ProviderType }) {
  const icons: Record<ProviderType, React.ReactNode> = {
    openai: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
        <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2z" fill="currentColor" opacity="0.15" />
        <path d="M12 6a6 6 0 100 12 6 6 0 000-12z" fill="currentColor" />
      </svg>
    ),
    deepseek: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
    gemini: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="3" />
        <circle cx="12" cy="5" r="1.5" />
        <circle cx="12" cy="19" r="1.5" />
        <circle cx="5" cy="8" r="1.5" />
        <circle cx="19" cy="8" r="1.5" />
        <circle cx="5" cy="16" r="1.5" />
        <circle cx="19" cy="16" r="1.5" />
      </svg>
    ),
    grok: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="9" />
        <path strokeLinecap="round" d="M8 12l3 3 5-6" />
      </svg>
    ),
    anthropic: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="6" width="18" height="12" rx="2" />
        <path strokeLinecap="round" d="M7 10v4M12 10v4M17 10v4" />
      </svg>
    ),
  };
  return icons[provider] || icons.deepseek;
}

/* ------------------------------------------------------------------ */
/*  Modal component                                                    */
/* ------------------------------------------------------------------ */

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const { t } = useLanguage();
  const { settings, setProvider, setApiKey, setModel, clearAll } = useSettings();
  const [apiKeyInput, setApiKeyInput] = useState(settings.apiKeys[settings.provider] || "");
  const [showKey, setShowKey] = useState(false);
  const [models, setModels] = useState<AiModelInfo[]>(
    FALLBACK_MODELS[settings.provider] || []
  );
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [saved, setSaved] = useState(false);
  const [promptEditorOpen, setPromptEditorOpen] = useState(false);

  const meta = PROVIDER_META[settings.provider];

  // Sync local input when provider or settings change
  useEffect(() => {
    setApiKeyInput(settings.apiKeys[settings.provider] || "");
  }, [settings.provider, settings.apiKeys]);

  // Fetch model list when modal opens or provider changes
  useEffect(() => {
    const currentKey = settings.apiKeys[settings.provider];
    if (isOpen && currentKey) {
      fetchModels(settings.provider, currentKey);
    } else if (isOpen) {
      setModels(FALLBACK_MODELS[settings.provider] || []);
    }
  }, [isOpen, settings.provider, settings.apiKeys]); // eslint-disable-line react-hooks/exhaustive-deps

  async function fetchModels(provider: ProviderType, apiKey: string) {
    if (!apiKey) {
      setModels(FALLBACK_MODELS[provider] || []);
      return;
    }
    setIsLoadingModels(true);
    try {
      const res = await fetch("/api/list-models", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey, provider }),
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
    setApiKey(settings.provider, apiKeyInput.trim());
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function handleClear() {
    setApiKeyInput("");
    clearAll();
    setModels(FALLBACK_MODELS.deepseek);
  }

  function handleProviderChange(provider: ProviderType) {
    setProvider(provider);
    setModels(FALLBACK_MODELS[provider] || []);
    // Clear the model to the new provider's default
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
            <h2 className="text-lg font-semibold text-white">{t("settings.title")}</h2>
          </div>
          <button
            onClick={onClose}
            className="text-white/70 hover:text-white transition-colors"
            title={t("settings.close")}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          {/* AI Provider Selector */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              {t("settings.provider")}
            </label>
            <div className="grid grid-cols-1 gap-1.5">
              {ALL_PROVIDERS.map((p) => {
                const pMeta = PROVIDER_META[p];
                const isActive = settings.provider === p;
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => handleProviderChange(p)}
                    className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm transition-all text-left ${
                      isActive
                        ? "bg-indigo-50 border-2 border-indigo-500 text-indigo-700 font-medium"
                        : "bg-gray-50 border-2 border-transparent text-gray-600 hover:bg-gray-100"
                    }`}
                  >
                    <span className={isActive ? "text-indigo-600" : "text-gray-400"}>
                      <ProviderIcon provider={p} />
                    </span>
                    <span>{pMeta.label}</span>
                    {isActive && (
                      <svg className="w-4 h-4 ml-auto text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* API Key */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              {meta.label} {t("settings.apiKeyLabel")}
            </label>
            <div className="relative">
              <input
                type={showKey ? "text" : "password"}
                value={apiKeyInput}
                onChange={(e) => setApiKeyInput(e.target.value)}
                placeholder={t("settings.apiKeyPlaceholder", { provider: meta.label })}
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
                href={meta.apiKeyHelpUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-indigo-600 hover:text-indigo-800 underline"
              >
                {t("settings.apiKeyHelpPrefix")}
              </a>
              {" "}{t("settings.apiKeyHelpSuffix", { provider: meta.label })}
            </p>
            <p className="mt-1.5 text-xs text-red-700">
              {t("settings.apiKeyHelpWarning")}
            </p>
          </div>

          {/* Model Selector */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              {t("settings.model")}
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
                onClick={() => fetchModels(settings.provider, settings.apiKeys[settings.provider] || apiKeyInput)}
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
            {(() => {
              const selected = models.find((m) => m.name === settings.model);
              return selected?.description ? (
                <p className="mt-1.5 text-xs text-gray-400">{selected.description}</p>
              ) : null;
            })()}
          </div>

          {/* Prompt Editor trigger */}
          <div>
            <button
              type="button"
              onClick={() => setPromptEditorOpen(true)}
              className="w-full flex items-center justify-between px-4 py-3 bg-gradient-to-r from-gray-50 to-indigo-50 hover:from-gray-100 hover:to-indigo-100 border border-gray-200 hover:border-indigo-300 rounded-xl transition-all group"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-gray-800 rounded-lg flex items-center justify-center group-hover:scale-105 transition-transform">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                  </svg>
                </div>
                <div className="text-left">
                  <p className="text-sm font-medium text-gray-700">{t("settings.customPrompt")}</p>
                  <p className="text-xs text-gray-400">{t("settings.customPromptDesc")}</p>
                </div>
              </div>
              <svg className="w-4 h-4 text-gray-400 group-hover:text-indigo-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          {/* Status indicator */}
          <div className="flex items-center gap-2 text-xs">
            {settings.apiKeys[settings.provider] ? (
              <>
                <div className="w-2 h-2 bg-green-500 rounded-full" />
                <span className="text-green-600">
                  {t("settings.statusSaved", { provider: meta.label })}
                </span>
              </>
            ) : (
              <>
                <div className="w-2 h-2 bg-yellow-500 rounded-full" />
                <span className="text-yellow-600">
                  {t("settings.statusNotSet")}
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
            {t("settings.clearAll")}
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 bg-white border border-gray-200 rounded-lg hover:bg-gray-100 transition-all"
            >
              {t("settings.cancel")}
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
                  {t("settings.saved")}
                </>
              ) : (
                t("settings.save")
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Prompt Editor (separate modal, higher z-index) */}
      <PromptEditor
        isOpen={promptEditorOpen}
        onClose={() => setPromptEditorOpen(false)}
      />
    </div>
  );
}
