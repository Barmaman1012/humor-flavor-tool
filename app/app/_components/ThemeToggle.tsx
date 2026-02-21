"use client";

import { useEffect, useState } from "react";

type ThemeMode = "system" | "light" | "dark";

const STORAGE_KEY = "humor-theme";

function applyTheme(mode: ThemeMode) {
  const root = document.documentElement;
  const systemPrefersDark = window.matchMedia(
    "(prefers-color-scheme: dark)",
  ).matches;

  const shouldUseDark = mode === "dark" || (mode === "system" && systemPrefersDark);
  root.classList.toggle("dark", shouldUseDark);
}

export default function ThemeToggle() {
  const [mode, setMode] = useState<ThemeMode>("system");

  useEffect(() => {
    const stored = (localStorage.getItem(STORAGE_KEY) as ThemeMode | null) ?? "system";
    setMode(stored);
    applyTheme(stored);

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => {
      const current = (localStorage.getItem(STORAGE_KEY) as ThemeMode | null) ?? "system";
      if (current === "system") {
        applyTheme("system");
      }
    };

    media.addEventListener("change", handler);
    return () => media.removeEventListener("change", handler);
  }, []);

  const updateMode = (next: ThemeMode) => {
    setMode(next);
    localStorage.setItem(STORAGE_KEY, next);
    applyTheme(next);
  };

  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white p-1 text-xs">
      {(["system", "light", "dark"] as ThemeMode[]).map((item) => (
        <button
          key={item}
          type="button"
          onClick={() => updateMode(item)}
          className={
            mode === item
              ? "rounded-full bg-zinc-900 px-3 py-1 text-white"
              : "rounded-full px-3 py-1 text-zinc-600 hover:text-zinc-900"
          }
        >
          {item}
        </button>
      ))}
    </div>
  );
}
