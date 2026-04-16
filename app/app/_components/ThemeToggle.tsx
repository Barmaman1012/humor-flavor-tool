"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";

const MODES = ["system", "light", "dark"] as const;

export default function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  const activeTheme = theme ?? resolvedTheme ?? "system";

  const handleThemeClick = (nextTheme: string) => {
    setTheme(nextTheme);
    setTimeout(() => {
      console.log(
        "[theme] set to:",
        nextTheme,
        "html.className:",
        document.documentElement.className,
        "storage:",
        localStorage.getItem("theme"),
      );
    }, 0);
  };

  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white p-1 text-xs">
      {MODES.map((item) => (
        <button
          key={item}
          type="button"
          onClick={() => handleThemeClick(item)}
          className={
            activeTheme === item
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
