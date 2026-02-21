"use client";

import SignOutButton from "./SignOutButton";

type AppHeaderProps = {
  email?: string | null;
};

export default function AppHeader({ email }: AppHeaderProps) {
  return (
    <header className="flex items-center justify-between border-b border-zinc-200 bg-white px-6 py-4">
      <div>
        <p className="text-sm text-zinc-500">Signed in as</p>
        <p className="text-sm font-semibold text-zinc-900">
          {email ?? "Unknown"}
        </p>
      </div>
      <SignOutButton />
    </header>
  );
}
