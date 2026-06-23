"use client";

/* ------------------------------------------------------------------ */
/*  Anonymous Session ID                                               */
/*  Generated once per browser, stored in localStorage.                */
/*  Every user gets a unique ID without auth.                          */
/* ------------------------------------------------------------------ */

const STORAGE_KEY = "prd-user-id";

function generateId(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let id = "usr_";
  for (let i = 0; i < 20; i++) {
    id += chars[Math.floor(Math.random() * chars.length)];
  }
  return id;
}

export function getUserId(): string {
  if (typeof window === "undefined") return "anon";
  try {
    let id = localStorage.getItem(STORAGE_KEY);
    if (!id) {
      id = generateId();
      localStorage.setItem(STORAGE_KEY, id);
    }
    return id;
  } catch {
    return "anon";
  }
}
