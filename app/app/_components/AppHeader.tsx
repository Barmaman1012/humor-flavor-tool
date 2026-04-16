"use client";

import SignOutButton from "./SignOutButton";
import ThemeToggle from "./ThemeToggle";

type AppHeaderProps = {
  email?: string | null;
};

export default function AppHeader({ email }: AppHeaderProps) {
  return (
    <header className="flex flex-col gap-3 border-b border-zinc-200 bg-white px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-sm text-zinc-500">Signed in as</p>
        <p className="text-sm font-semibold text-zinc-900">
          {email ?? "Unknown"}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <ThemeToggle />
        <SignOutButton />
      </div>
    </header>
  );
}
