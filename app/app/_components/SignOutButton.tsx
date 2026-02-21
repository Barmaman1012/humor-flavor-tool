"use client";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type SignOutButtonProps = {
  className?: string;
  label?: string;
};

export default function SignOutButton({
  className,
  label = "Sign out",
}: SignOutButtonProps) {
  const handleSignOut = async () => {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    window.location.href = "/login?message=signed-out";
  };

  return (
    <button
      type="button"
      onClick={handleSignOut}
      className={
        className ??
        "rounded-lg border border-zinc-200 px-3 py-2 text-sm font-medium text-zinc-700 transition hover:border-zinc-300 hover:text-zinc-900"
      }
    >
      {label}
    </button>
  );
}
