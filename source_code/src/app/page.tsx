"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { ChatMessage, ProviderType } from "@/lib/types";
import { PROVIDER_META } from "@/lib/providers/types";
import { loadCustomPrompts } from "@/lib/prompt-customization";
import { useLanguage } from "@/lib/i18n";
import PromptInput from "@/components/PromptInput";
import PrdViewer from "@/components/PrdViewer";
import PrdHistory from "@/components/PrdHistory";
import SettingsModal, { getStoredSettings } from "@/components/SettingsModal";

type PhaseStatus = "pending" | "running" | "done" | "error";

interface PhaseState {
  key: string;
  status: PhaseStatus;
  message: string;
}

const PHASE_KEYS = ["analysis", "features", "userflow", "architecture", "database", "techreq", "assembly"] as const;

function initialPhases(): PhaseState[] {
  return PHASE_KEYS.map((key) => ({
    key,
    status: "pending" as PhaseStatus,
    message: "",
  }));
}

export default function Home() {
  const { t, toggleLang, lang } = useLanguage();

  const [prdContent, setPrdContent] = useState<string>("");
  const [loadedMessages, setLoadedMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [phases, setPhases] = useState<PhaseState[]>(initialPhases);
  const [currentProvider, setCurrentProvider] = useState<ProviderType>("deepseek");
  const [warningDismissed, setWarningDismissed] = useState(true);

  // Sync warning state from localStorage after mount (avoid hydration mismatch)
  useEffect(() => {
    setWarningDismissed(localStorage.getItem("prd-storage-warning-dismissed") === "1");
  }, []);
  const abortRef = useRef<AbortController | null>(null);

  const handleGenerate = useCallback(async (prompt: string) => {
    setIsLoading(true);
    setError(null);
    setPrdContent("");
    setLoadedMessages([]);
    setPhases(initialPhases());

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const settings = getStoredSettings();
      setCurrentProvider(settings.provider);

      const apiKey = settings.apiKeys?.[settings.provider] || (settings as unknown as Record<string, unknown>).apiKey as string || "";

      const response = await fetch("/api/generate-prd", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          provider: settings.provider || undefined,
          apiKey: apiKey || undefined,
          model: settings.model || undefined,
          customPrompts: loadCustomPrompts(lang) || undefined,
          lang,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        let errorMsg = t("error.title");
        try {
          const errData = await response.json();
          errorMsg = errData.error || errorMsg;
        } catch { /* keep default */ }
        throw new Error(errorMsg);
      }

      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split("\n\n");
        buffer = parts.pop() || "";

        for (const part of parts) {
          const dataLine = part.split("\n").find((line) => line.startsWith("data: "));
          if (!dataLine) continue;

          try {
            const data = JSON.parse(dataLine.slice(6));
            if (data.type === "progress") {
              setPhases((prev) =>
                prev.map((p) =>
                  p.key === data.step
                    ? { ...p, status: data.status as PhaseStatus, message: data.message || "" }
                    : p
                )
              );
            } else if (data.type === "result") {
              setPrdContent(data.prd);
            } else if (data.type === "error") {
              throw new Error(data.message || t("error.title"));
            }
          } catch (parseErr) {
            if (parseErr instanceof Error) throw parseErr;
          }
        }
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      setError(err instanceof Error ? err.message : t("error.title"));
    } finally {
      setIsLoading(false);
      abortRef.current = null;
    }
  }, [t]);

  const handleRevision = useCallback(
    async (newPrd: string, _messages: ChatMessage[], _newMessage: string) => {
      setPrdContent(newPrd);
    },
    []
  );

  const handleLoadExample = useCallback(async () => {
    setError(null);
    setIsLoading(true);
    setPhases(initialPhases());
    try {
      const response = await fetch("/contoh_prd.md");
      if (!response.ok) throw new Error("Failed to load example PRD");
      setPrdContent(await response.text());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setIsLoading(false);
    }
  }, [t]);

  function handleReset() {
    setPrdContent("");
    setError(null);
  }

  function dismissWarning() {
    setWarningDismissed(true);
    localStorage.setItem("prd-storage-warning-dismissed", "1");
  }

  function PhaseIcon({ status }: { status: PhaseStatus }) {
    if (status === "done") return <svg className="w-5 h-5 text-green-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>;
    if (status === "running") return <div className="w-5 h-5 flex items-center justify-center flex-shrink-0"><div className="w-4 h-4 border-2 border-indigo-400 border-t-indigo-600 rounded-full animate-spin" /></div>;
    if (status === "error") return <svg className="w-5 h-5 text-red-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>;
    return <div className="w-5 h-5 flex items-center justify-center flex-shrink-0"><div className="w-2 h-2 bg-gray-300 rounded-full" /></div>;
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <PrdHistory onLoadPrd={(markdown, chatMessages) => {
              setPrdContent(markdown);
              setLoadedMessages(chatMessages || []);
            }} />

            <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">{t("app.title")}</h1>
              <p className="text-xs text-gray-500">{t("app.subtitle")}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Language switch */}
            <button
              onClick={toggleLang}
              className="relative inline-flex items-center h-8 w-[65px] rounded-full transition-colors bg-gray-200 hover:bg-gray-300 flex-shrink-0"
              title={t("lang.switch")}
            >
              <span className="absolute left-3 text-[11px] font-medium text-gray-400 select-none pointer-events-none">EN</span>
              <span className="absolute right-3 text-[11px] font-medium text-gray-400 select-none pointer-events-none">ID</span>
              <span
                className={`absolute top-0.5 h-7 w-7 rounded-full bg-white shadow border border-gray-200 transition-transform ${
                  lang === "en" ? "translate-x-[35px]" : "translate-x-0.5"
                }`}
              />
            </button>

            {prdContent && (
              <button
                onClick={handleReset}
                className="text-sm text-gray-500 hover:text-red-600 transition-colors flex items-center gap-1 flex-shrink-0"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                {t("app.reset")}
              </button>
            )}

            <button
              onClick={() => setSettingsOpen(true)}
              className="text-sm text-gray-500 hover:text-indigo-600 transition-colors flex items-center gap-1 flex-shrink-0 min-w-[90px]"
              title={t("app.settings")}
            >
              <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              </svg>
              {t("app.settings")}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8">
        {/* Storage warning */}
        {!warningDismissed && (
          <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3 animate-fadeInUp">
            <span className="text-xl flex-shrink-0">💾</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-amber-800">{t("storageWarning.title")}</p>
              <p className="text-sm text-amber-600 mt-1">{t("storageWarning.body")} <a className="text-cyan-500 hover:text-cyan-800 underline" href="https://github.com/aan-arfian28/prd-maker" target="_blank" rel="noopener noreferrer">{t("storageWarning.repo")}</a></p>
            </div>
            <button
              onClick={dismissWarning}
              className="px-3 py-1.5 text-xs font-medium text-amber-700 bg-amber-100 hover:bg-amber-200 rounded-lg transition-colors flex-shrink-0"
            >
              {t("storageWarning.dismiss")}
            </button>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3 animate-fadeInUp">
            <div className="w-5 h-5 bg-red-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
              <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-red-800">{t("error.title")}</p>
              <p className="text-sm text-red-600 mt-1">{error}</p>
              {(error.includes("API Key") || error.includes("API key")) && (
                <button
                  onClick={() => setSettingsOpen(true)}
                  className="inline-block mt-2 text-sm text-indigo-600 hover:text-indigo-800 font-medium"
                >
                  {t("error.openSettings")}
                </button>
              )}
            </div>
            <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600 transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {/* Loading State — Phase Progress */}
        {isLoading && (
          <div className="mb-8 p-8 bg-white border border-gray-200 rounded-2xl shadow-sm animate-fadeInUp">
            <div className="max-w-md mx-auto">
              <h3 className="text-lg font-semibold text-gray-800 mb-6 text-center">
                {t("loading.heading")}
              </h3>
              <div className="space-y-3">
                {phases.map((phase) => (
                  <div
                    key={phase.key}
                    className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all duration-300 ${
                      phase.status === "running" ? "bg-indigo-50 border border-indigo-200"
                        : phase.status === "done" ? "bg-green-50/50"
                        : phase.status === "error" ? "bg-red-50 border border-red-200"
                        : "bg-gray-50"
                    }`}
                  >
                    <PhaseIcon status={phase.status} />
                    <span className={`text-sm flex-1 ${
                      phase.status === "running" ? "text-indigo-700 font-medium"
                        : phase.status === "done" ? "text-gray-600"
                        : phase.status === "error" ? "text-red-700"
                        : "text-gray-400"
                    }`}>
                      {t(`phase.${phase.key}`)}
                    </span>
                  </div>
                ))}
              </div>
              <div className="mt-6 flex flex-col items-center gap-3">
                <div className="flex gap-1.5">
                  <div className="w-2 h-2 bg-indigo-400 rounded-full animate-pulse" style={{ animationDelay: "0s" }} />
                  <div className="w-2 h-2 bg-indigo-400 rounded-full animate-pulse" style={{ animationDelay: "0.2s" }} />
                  <div className="w-2 h-2 bg-indigo-400 rounded-full animate-pulse" style={{ animationDelay: "0.4s" }} />
                </div>
                <button
                  onClick={() => abortRef.current?.abort()}
                  className="px-4 py-1.5 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg transition-colors"
                >
                  {lang === "en" ? "Stop Generation" : "Hentikan Pembuatan"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* PRD Viewer or Prompt Input */}
        {prdContent ? (
          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm animate-fadeInUp">
            <PrdViewer
              markdown={prdContent}
              initialMessages={loadedMessages}
              onRevision={handleRevision}
            />
          </div>
        ) : (
          !isLoading && (
            <div className="animate-fadeInUp">
              {/* Hero Section */}
              <div className="text-center mb-10 mt-4">
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-50 border border-indigo-200 rounded-full text-xs font-medium text-indigo-600 mb-4">
                  {t("hero.badge")}
                </div>
                <h2 className="text-3xl font-bold text-gray-900 mb-3" dangerouslySetInnerHTML={{ __html: t("hero.heading") }} />
                <p className="text-gray-500 max-w-lg mx-auto leading-relaxed" dangerouslySetInnerHTML={{ __html: t("hero.desc") }} />

                <button
                  onClick={handleLoadExample}
                  className="mt-4 inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  {t("hero.example")}
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
                  <h3 className="text-sm font-semibold text-gray-800 mb-1">{t("features.mdprd")}</h3>
                  <p className="text-xs text-gray-500">{t("features.mdprdDesc")}</p>
                </div>
                <div className="p-5 bg-white border border-gray-200 rounded-xl text-center">
                  <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                    <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zm0 8a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zm12 0a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
                    </svg>
                  </div>
                  <h3 className="text-sm font-semibold text-gray-800 mb-1">{t("features.diagram")}</h3>
                  <p className="text-xs text-gray-500">{t("features.diagramDesc")}</p>
                </div>
                <div className="p-5 bg-white border border-gray-200 rounded-xl text-center">
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                    <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                    </svg>
                  </div>
                  <h3 className="text-sm font-semibold text-gray-800 mb-1">{t("features.chat")}</h3>
                  <p className="text-xs text-gray-500">{t("features.chatDesc")}</p>
                </div>
              </div>

              {/* Multi-Provider Badge */}
              <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                {(["openai", "deepseek", "gemini", "grok", "anthropic"] as ProviderType[]).map((p) => (
                  <div key={p} className="px-3 py-1.5 bg-white border border-gray-200 rounded-full text-xs text-gray-500 flex items-center gap-1.5 shadow-sm">
                    <div className={`w-2 h-2 rounded-full ${
                      p === "openai" ? "bg-green-500" : p === "deepseek" ? "bg-blue-500"
                        : p === "gemini" ? "bg-yellow-500" : p === "grok" ? "bg-gray-800" : "bg-orange-500"
                    }`} />
                    {PROVIDER_META[p].label}
                  </div>
                ))}
              </div>
            </div>
          )
        )}
      </main>

      <footer className="border-t border-gray-200 mt-16 py-6 text-center text-xs text-gray-400">
        <p>{t("footer")}</p>
      </footer>

      <SettingsModal isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
}
