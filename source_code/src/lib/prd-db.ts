"use client";

import type { ChatMessage } from "./types";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface PrdEntry {
  id: string;
  title: string;
  markdown: string;
  createdAt: number;
  updatedAt: number;
  chatMessages: ChatMessage[];
}

export type PrdSummary = Omit<PrdEntry, "markdown" | "chatMessages"> & {
  size: number; // bytes
};

/* ------------------------------------------------------------------ */
/*  Database init (lazy, singleton)                                    */
/* ------------------------------------------------------------------ */

const DB_NAME = "prd-maker-db";
const DB_VERSION = 1;
const STORE_NAME = "prds";

let dbPromise: Promise<IDBDatabase> | null = null;

function openDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB tidak didukung di browser ini"));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: "id" });
        store.createIndex("createdAt", "createdAt", { unique: false });
        store.createIndex("title", "title", { unique: false });
      }
    };

    request.onsuccess = (event) => {
      resolve((event.target as IDBOpenDBRequest).result);
    };

    request.onerror = (event) => {
      reject((event.target as IDBOpenDBRequest).error);
    };
  });

  return dbPromise;
}

function getStore(
  db: IDBDatabase,
  mode: IDBTransactionMode = "readonly"
): IDBObjectStore {
  const tx = db.transaction(STORE_NAME, mode);
  return tx.objectStore(STORE_NAME);
}

/* ------------------------------------------------------------------ */
/*  CRUD operations                                                    */
/* ------------------------------------------------------------------ */

export async function savePrd(
  title: string,
  markdown: string,
  chatMessages: ChatMessage[] = []
): Promise<PrdSummary> {
  const db = await openDB();
  const store = getStore(db, "readwrite");

  const now = Date.now();
  const id = crypto.randomUUID?.() || `${now}-${Math.random().toString(36).slice(2, 10)}`;

  const entry: PrdEntry = {
    id,
    title,
    markdown,
    createdAt: now,
    updatedAt: now,
    chatMessages,
  };

  return new Promise((resolve, reject) => {
    const request = store.add(entry);
    request.onsuccess = () => {
      resolve({ id, title, size: new Blob([markdown]).size, createdAt: now, updatedAt: now });
    };
    request.onerror = () => reject(request.error);
  });
}

export async function updatePrd(
  id: string,
  updates: { title?: string; markdown?: string; chatMessages?: ChatMessage[] }
): Promise<void> {
  const db = await openDB();
  const store = getStore(db, "readwrite");

  return new Promise((resolve, reject) => {
    const getRequest = store.get(id);
    getRequest.onsuccess = () => {
      const existing = getRequest.result as PrdEntry | undefined;
      if (!existing) {
        reject(new Error("PRD tidak ditemukan"));
        return;
      }
      const updated: PrdEntry = {
        ...existing,
        ...updates,
        updatedAt: Date.now(),
      };
      const putRequest = store.put(updated);
      putRequest.onsuccess = () => resolve();
      putRequest.onerror = () => reject(putRequest.error);
    };
    getRequest.onerror = () => reject(getRequest.error);
  });
}

export async function listPrds(): Promise<PrdSummary[]> {
  const db = await openDB();
  const store = getStore(db, "readonly");
  const index = store.index("createdAt");

  return new Promise((resolve, reject) => {
    const results: PrdSummary[] = [];
    const request = index.openCursor(null, "prev"); // newest first
    request.onsuccess = () => {
      const cursor = request.result;
      if (cursor) {
        const val = cursor.value as PrdEntry;
        results.push({
          id: val.id,
          title: val.title,
          size: new Blob([val.markdown]).size,
          createdAt: val.createdAt,
          updatedAt: val.updatedAt,
        });
        cursor.continue();
      } else {
        resolve(results);
      }
    };
    request.onerror = () => reject(request.error);
  });
}

export async function loadPrd(id: string): Promise<PrdEntry | null> {
  const db = await openDB();
  const store = getStore(db, "readonly");

  return new Promise((resolve, reject) => {
    const request = store.get(id);
    request.onsuccess = () => {
      resolve(request.result as PrdEntry | undefined ?? null);
    };
    request.onerror = () => reject(request.error);
  });
}

export async function deletePrd(id: string): Promise<void> {
  const db = await openDB();
  const store = getStore(db, "readwrite");

  return new Promise((resolve, reject) => {
    const request = store.delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function getPrdCount(): Promise<number> {
  const db = await openDB();
  const store = getStore(db, "readonly");

  return new Promise((resolve, reject) => {
    const request = store.count();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function getTotalSize(): Promise<number> {
  const prds = await listPrds();
  return prds.reduce((sum, p) => sum + p.size, 0);
}
