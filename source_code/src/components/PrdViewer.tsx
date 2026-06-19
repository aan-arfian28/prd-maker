"use client";

import { useState, useCallback } from "react";
import type { ChatMessage } from "@/lib/types";
import MarkdownRenderer from "./MarkdownRenderer";
import ChatPanel from "./ChatPanel";
import { getStoredSettings } from "./SettingsModal";
import { loadCustomPrompts } from "@/lib/prompt-customization";

interface PrdViewerProps {
  markdown: string;
  onRevision: (newPrd: string, messages: ChatMessage[], newMessage: string) => Promise<void>;
}

export default function PrdViewer({ markdown, onRevision }: PrdViewerProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatOpen, setChatOpen] = useState(false);
  const [isRevising, setIsRevising] = useState(false);
  const [copied, setCopied] = useState(false);
  const [downloadReady, setDownloadReady] = useState(false);
  const [saved, setSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleSendMessage = useCallback(
    async (newMessage: string) => {
      if (isRevising) return;

      const userMsg: ChatMessage = {
        id: `msg-${Date.now()}`,
        role: "user",
        content: newMessage,
        timestamp: Date.now(),
      };

      const updatedMessages = [...messages, userMsg];
      setMessages(updatedMessages);
      setIsRevising(true);

      try {
        const settings = getStoredSettings();
        const response = await fetch("/api/chat-revision", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prdContent: markdown,
            messages: messages.map((m) => ({ role: m.role, content: m.content })),
            newMessage,
            provider: settings.provider || undefined,
            apiKey: settings.apiKey || undefined,
            model: settings.model || undefined,
            customPrompts: loadCustomPrompts() || undefined,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Gagal merevisi PRD");
        }

        const aiMsg: ChatMessage = {
          id: `msg-${Date.now()}-ai`,
          role: "assistant",
          content: data.message,
          timestamp: Date.now(),
        };

        setMessages((prev) => [...prev, aiMsg]);

        // Pass the revised PRD back to parent
        await onRevision(data.prd, [...updatedMessages, aiMsg], newMessage);
      } catch (error) {
        const errorMsg: ChatMessage = {
          id: `msg-${Date.now()}-err`,
          role: "assistant",
          content: `❌ Error: ${error instanceof Error ? error.message : "Terjadi kesalahan"}`,
          timestamp: Date.now(),
        };
        setMessages((prev) => [...prev, errorMsg]);
      } finally {
        setIsRevising(false);
      }
    },
    [markdown, messages, isRevising, onRevision]
  );

  function handleCopyMarkdown() {
    navigator.clipboard.writeText(markdown);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleDownload() {
    const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `PRD-${new Date().toISOString().slice(0, 10)}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setDownloadReady(true);
    setTimeout(() => setDownloadReady(false), 2000);
  }

  async function handleSave() {
    if (isSaving) return;
    setIsSaving(true);
    try {
      const res = await fetch("/api/save-prd", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markdown }),
      });
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
        // Notify history panel to refresh
        window.dispatchEvent(new Event("prd-history-refresh"));
      }
    } catch {
      // ignore
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="relative">
      {/* Toolbar */}
      <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-sm border-b border-gray-200 px-6 py-3 mb-6 rounded-t-2xl flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
            <span className="text-sm font-medium text-gray-700">PRD Siap</span>
          </div>
          <span className="text-xs text-gray-400 border border-gray-200 rounded-full px-2 py-0.5">
            v{messages.length + 1}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleCopyMarkdown}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg transition-all active:scale-95"
            title="Salin Markdown"
          >
            {copied ? (
              <>
                <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Tersalin!
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                Salin MD
              </>
            )}
          </button>

          <button
            onClick={handleDownload}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg transition-all active:scale-95"
            title="Download PRD"
          >
            {downloadReady ? (
              <>
                <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Terdownload!
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Download .md
              </>
            )}
          </button>

          <button
            onClick={handleSave}
            disabled={isSaving}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-green-600 hover:bg-green-700 border border-green-600 rounded-lg transition-all active:scale-95 disabled:opacity-50"
            title="Simpan PRD"
          >
            {isSaving ? (
              <>
                <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Menyimpan...
              </>
            ) : saved ? (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Tersimpan!
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                </svg>
                Simpan
              </>
            )}
          </button>

          <button
            onClick={() => setChatOpen(!chatOpen)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border rounded-lg transition-all active:scale-95 ${
              chatOpen
                ? "bg-indigo-100 text-indigo-700 border-indigo-200"
                : "bg-indigo-50 text-indigo-600 hover:bg-indigo-100 border-indigo-200"
            }`}
            title="Chat Revisi"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
            Chat Revisi
          </button>
        </div>
      </div>

      {/* PRD Content */}
      <div className="px-8 pb-8">
        <MarkdownRenderer content={markdown} />
      </div>

      {/* Chat Panel */}
      <ChatPanel
        messages={messages}
        onSendMessage={handleSendMessage}
        isLoading={isRevising}
        isOpen={chatOpen}
        onToggle={() => setChatOpen(!chatOpen)}
      />
    </div>
  );
}
