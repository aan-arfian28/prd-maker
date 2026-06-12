"use client";

import { useState, useEffect, useRef, useCallback } from "react";

interface PrdInfo {
  filename: string;
  title: string;
  createdAt: string;
  size: number;
}

interface PrdHistoryProps {
  onLoadPrd: (markdown: string) => void;
}

export default function PrdHistory({ onLoadPrd }: PrdHistoryProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [prds, setPrds] = useState<PrdInfo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchList = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/list-prds");
      const data = await res.json();
      if (res.ok) {
        setPrds(data.prds);
      } else {
        setError(data.error || "Gagal memuat daftar");
      }
    } catch {
      setError("Gagal terhubung ke server");
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load list on mount and when drawer opens
  useEffect(() => {
    if (isOpen) {
      fetchList();
    }
  }, [isOpen, fetchList]);

  // Reload list after external changes (e.g., save from PrdViewer)
  // Expose refresh via a simple event-based mechanism
  useEffect(() => {
    const handler = () => fetchList();
    window.addEventListener("prd-history-refresh", handler);
    return () => window.removeEventListener("prd-history-refresh", handler);
  }, [fetchList]);

  async function handleDelete(filename: string) {
    if (!confirm(`Hapus "${filename}"?`)) return;
    setDeleting(filename);
    try {
      const res = await fetch(`/api/delete-prd?filename=${encodeURIComponent(filename)}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setPrds((prev) => prev.filter((p) => p.filename !== filename));
      }
    } catch {
      // ignore
    } finally {
      setDeleting(null);
    }
  }

  async function handleLoad(filename: string) {
    try {
      const res = await fetch(`/api/load-prd?filename=${encodeURIComponent(filename)}`);
      const data = await res.json();
      if (res.ok) {
        onLoadPrd(data.markdown);
        setIsOpen(false);
      }
    } catch {
      // ignore
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
        onLoadPrd(content);
        setIsOpen(false);
      }
    };
    reader.readAsText(file);

    // Reset input so same file can be re-opened
    e.target.value = "";
  }

  function formatDate(iso: string): string {
    const d = new Date(iso);
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
        title="Riwayat PRD"
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

      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm transition-opacity"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Drawer */}
      <div
        className={`fixed top-0 left-0 z-50 h-full w-80 bg-white shadow-2xl transform transition-transform duration-300 ease-in-out ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Drawer header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <h3 className="text-base font-semibold text-gray-900">📋 Riwayat PRD</h3>
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
            Buka File .md
          </button>
        </div>

        {/* PRD list */}
        <div className="flex-1 overflow-y-auto" style={{ maxHeight: "calc(100vh - 140px)" }}>
          {isLoading && (
            <div className="flex items-center justify-center py-12">
              <div className="w-6 h-6 border-2 border-gray-300 border-t-indigo-500 rounded-full animate-spin" />
            </div>
          )}

          {error && (
            <div className="px-4 py-6 text-center">
              <p className="text-sm text-red-500 mb-2">{error}</p>
              <button
                onClick={fetchList}
                className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
              >
                Coba lagi
              </button>
            </div>
          )}

          {!isLoading && !error && prds.length === 0 && (
            <div className="px-4 py-12 text-center">
              <div className="text-4xl mb-3">📭</div>
              <p className="text-sm text-gray-500">Belum ada PRD tersimpan</p>
              <p className="text-xs text-gray-400 mt-1">
                Buat PRD baru dan simpan untuk melihatnya di sini
              </p>
            </div>
          )}

          {!isLoading &&
            !error &&
            prds.map((prd) => (
              <div
                key={prd.filename}
                className="px-4 py-3 border-b border-gray-50 hover:bg-gray-50/50 transition-colors group"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-medium text-gray-800 truncate" title={prd.title}>
                      {prd.title}
                    </h4>
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
                    onClick={() => handleLoad(prd.filename)}
                    className="flex-1 px-2 py-1.5 text-xs font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded transition-colors"
                  >
                    📖 Buka
                  </button>
                  <button
                    onClick={() => handleDelete(prd.filename)}
                    disabled={deleting === prd.filename}
                    className="px-2 py-1.5 text-xs font-medium text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
                    title="Hapus"
                  >
                    {deleting === prd.filename ? (
                      <div className="w-3 h-3 border-2 border-red-300 border-t-red-500 rounded-full animate-spin" />
                    ) : (
                      "🗑️"
                    )}
                  </button>
                </div>
              </div>
            ))}
        </div>
      </div>
    </>
  );
}
