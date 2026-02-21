"use client";

import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/app/flavors", label: "Flavors" },
  { href: "/app/test", label: "Test" },
  { href: "/app/results", label: "Results" },
];

export default function AppNav() {
  const pathname = usePathname();

  return (
    <nav className="space-y-3 text-sm">
      {NAV_ITEMS.map((item) => {
        const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <a
            key={item.href}
            href={item.href}
            className={
              isActive
                ? "block rounded-lg bg-zinc-100 px-3 py-2 font-medium text-zinc-900"
                : "block rounded-lg px-3 py-2 text-zinc-700 transition hover:bg-zinc-100 hover:text-zinc-900"
            }
          >
            {item.label}
          </a>
        );
      })}
    </nav>
  );
}
