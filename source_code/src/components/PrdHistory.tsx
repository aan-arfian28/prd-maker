"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import type { ChatMessage } from "@/lib/types";
import { listPrds, loadPrd, deletePrd as deletePrdFromDb, updatePrd, getTotalSize } from "@/lib/prd-db";
import type { PrdSummary } from "@/lib/prd-db";
import { useLanguage } from "@/lib/i18n";

interface PrdHistoryProps {
  onLoadPrd: (markdown: string, chatMessages?: ChatMessage[], prdId?: string, title?: string) => void;
}

export default function PrdHistory({ onLoadPrd }: PrdHistoryProps) {
  const { t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [prds, setPrds] = useState<PrdSummary[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [totalSize, setTotalSize] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const renameInputRef = useRef<HTMLInputElement>(null);

  // Ensure portal target is available (client-side only)
  useEffect(() => {
    setMounted(true);
  }, []);

  // Focus rename input when entering rename mode
  useEffect(() => {
    if (renamingId && renameInputRef.current) {
      renameInputRef.current.focus();
      renameInputRef.current.select();
    }
  }, [renamingId]);

  const refreshList = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await listPrds();
      setPrds(data);
      setTotalSize(await getTotalSize());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memuat daftar");
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load list when drawer opens
  useEffect(() => {
    if (isOpen) {
      refreshList();
    }
  }, [isOpen, refreshList]);

  // Reload list after external changes (e.g., save from PrdViewer)
  useEffect(() => {
    const handler = () => refreshList();
    window.addEventListener("prd-history-refresh", handler);
    return () => window.removeEventListener("prd-history-refresh", handler);
  }, [refreshList]);

  async function handleDelete(id: string, title: string) {
    if (!confirm(`Hapus "${title}"?`)) return;
    setDeleting(id);
    try {
      await deletePrdFromDb(id);
      setPrds((prev) => prev.filter((p) => p.id !== id));
      setTotalSize(await getTotalSize());
    } catch {
      // ignore
    } finally {
      setDeleting(null);
    }
  }

  async function handleLoad(id: string) {
    try {
      const entry = await loadPrd(id);
      if (entry) {
        onLoadPrd(entry.markdown, entry.chatMessages, entry.id, entry.title);
        setIsOpen(false);
      }
    } catch {
      // ignore
    }
  }

  function startRename(prd: PrdSummary) {
    setRenamingId(prd.id);
    setRenameValue(prd.title);
  }

  function cancelRename() {
    setRenamingId(null);
    setRenameValue("");
  }

  async function commitRename(id: string) {
    const newTitle = renameValue.trim();
    if (!newTitle || newTitle === prds.find((p) => p.id === id)?.title) {
      cancelRename();
      return;
    }

    // Optimistic update
    setPrds((prev) =>
      prev.map((p) => (p.id === id ? { ...p, title: newTitle } : p))
    );
    setRenamingId(null);
    setRenameValue("");

    try {
      await updatePrd(id, { title: newTitle });
    } catch {
      // Revert on failure — refresh from DB
      refreshList();
    }
  }

  function handleRenameKeyDown(e: React.KeyboardEvent, id: string) {
    if (e.key === "Enter") {
      e.preventDefault();
      commitRename(id);
    } else if (e.key === "Escape") {
      cancelRename();
    }
  }

  function handleOpenFile() {
    fileInputRef.current?.click();
  }

  function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const content = ev.target?.result;
      if (typeof content === "string") {
        onLoadPrd(content, [], undefined, file.name.replace(/\.(md|markdown)$/i, ""));
        setIsOpen(false);
      }
    };
    reader.readAsText(file);

    // Reset input so same file can be re-opened
    e.target.value = "";
  }

  function formatDate(ts: number): string {
    const d = new Date(ts);
    return d.toLocaleDateString("id-ID", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return (
    <>
      {/* Burger button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`inline-flex items-center justify-center w-9 h-9 rounded-lg transition-all border ${
          isOpen
            ? "bg-indigo-100 text-indigo-700 border-indigo-200"
            : "bg-white text-gray-600 hover:bg-gray-50 border-gray-200 hover:border-gray-300"
        }`}
        title={t("history.title")}
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 6h16M4 12h16M4 18h16"
          />
        </svg>
      </button>

      {/* Hidden file input for opening .md files */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".md,.markdown,text/markdown"
        onChange={handleFileSelected}
        className="hidden"
      />

      {/* Render backdrop + drawer via portal to escape header's stacking context */}
      {mounted &&
        createPortal(
          <>
            {/* Backdrop */}
            {isOpen && (
              <div
                className="fixed inset-0 z-[80] bg-black/30 backdrop-blur-sm transition-opacity"
                onClick={() => setIsOpen(false)}
              />
            )}

            {/* Drawer */}
            <div
              className={`fixed top-0 left-0 z-[90] h-full w-80 bg-white shadow-2xl transform transition-transform duration-300 ease-in-out ${
                isOpen ? "translate-x-0" : "-translate-x-full"
              }`}
            >
              {/* Drawer header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
                <h3 className="text-base font-semibold text-gray-900">{t("history.title")}</h3>
                <button
                  onClick={() => setIsOpen(false)}
                  className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Open file button */}
              <div className="px-4 py-3 border-b border-gray-100">
                <button
                  onClick={handleOpenFile}
                  className="w-full flex items-center gap-2 px-3 py-2.5 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg text-sm font-medium text-indigo-700 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z" />
                  </svg>
                  {t("history.openFile")}
                </button>
              </div>

              {/* PRD list */}
              <div className="flex-1 overflow-y-auto" style={{ maxHeight: "calc(100vh - 190px)" }}>
                {isLoading && (
                  <div className="flex items-center justify-center py-12">
                    <div className="w-6 h-6 border-2 border-gray-300 border-t-indigo-500 rounded-full animate-spin" />
                  </div>
                )}

                {error && (
                  <div className="px-4 py-6 text-center">
                    <p className="text-sm text-red-500 mb-2">{error}</p>
                    <button
                      onClick={refreshList}
                      className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                    >
                      {t("history.retry")}
                    </button>
                  </div>
                )}

                {!isLoading && !error && prds.length === 0 && (
                  <div className="px-4 py-12 text-center">
                    <div className="text-4xl mb-3">📭</div>
                    <p className="text-sm text-gray-500">{t("history.empty")}</p>
                    <p className="text-xs text-gray-400 mt-1">{t("history.emptyHint")}</p>
                  </div>
                )}

                {!isLoading &&
                  !error &&
                  prds.map((prd) => (
                    <div
                      key={prd.id}
                      className="px-4 py-3 border-b border-gray-50 hover:bg-gray-50/50 transition-colors group"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          {renamingId === prd.id ? (
                            <input
                              ref={renameInputRef}
                              type="text"
                              value={renameValue}
                              onChange={(e) => setRenameValue(e.target.value)}
                              onKeyDown={(e) => handleRenameKeyDown(e, prd.id)}
                              onBlur={() => commitRename(prd.id)}
                              className="w-full text-sm font-medium text-gray-800 bg-white border border-indigo-300 rounded px-2 py-0.5 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30"
                              placeholder="Nama PRD..."
                            />
                          ) : (
                            <div className="flex items-center gap-1.5">
                              <h4
                                className="text-sm font-medium text-gray-800 truncate cursor-pointer hover:text-indigo-600 transition-colors"
                                title={`${prd.title} — klik untuk ubah nama`}
                                onClick={() => startRename(prd)}
                              >
                                {prd.title}
                              </h4>
                              <button
                                onClick={(e) => { e.stopPropagation(); startRename(prd); }}
                                className="flex-shrink-0 w-5 h-5 flex items-center justify-center rounded text-gray-300 hover:text-indigo-500 hover:bg-indigo-50 opacity-0 group-hover:opacity-100 transition-all"
                                title="Ubah nama"
                              >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                </svg>
                              </button>
                            </div>
                          )}
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs text-gray-400">{formatDate(prd.createdAt)}</span>
                            <span className="text-xs text-gray-300">·</span>
                            <span className="text-xs text-gray-400">{formatSize(prd.size)}</span>
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1.5 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleLoad(prd.id)}
                          className="flex-1 px-2 py-1.5 text-xs font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded transition-colors"
                        >
                          {t("history.open")}
                        </button>
                        <button
                          onClick={() => handleDelete(prd.id, prd.title)}
                          disabled={deleting === prd.id}
                          className="px-2 py-1.5 text-xs font-medium text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
                          title="Hapus"
                        >
                          {deleting === prd.id ? (
                            <div className="w-3 h-3 border-2 border-red-300 border-t-red-500 rounded-full animate-spin" />
                          ) : (
                            "🗑️"
                          )}
                        </button>
                      </div>
                    </div>
                  ))}
              </div>

              {/* Storage indicator */}
              {prds.length > 0 && (
                <div className="px-4 py-2.5 border-t border-gray-100 bg-gray-50/50">
                  <div className="flex items-center gap-2 text-xs text-gray-400">
                    <span>💾</span>
                    <span>
                      {t("history.storageLabel", { count: String(prds.length), size: formatSize(totalSize) })}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </>,
          document.body
        )}
    </>
  );
}
