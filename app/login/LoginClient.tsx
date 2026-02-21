"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";

const MESSAGE_COPY: Record<string, string> = {
  "not-authorized": "Your account is not authorized to access this tool.",
  "auth-error": "We couldn't complete the sign-in. Please try again.",
  "missing-code": "We couldn't complete the sign-in. Please try again.",
  "signed-out": "You have been signed out.",
};

export default function LoginClient() {
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const message = useMemo(() => {
    const key = searchParams.get("message") ?? "";
    return MESSAGE_COPY[key] ?? "";
  }, [searchParams]);

  const handleSignIn = async () => {
    setIsLoading(true);
    setError(null);
    const supabase = createSupabaseBrowserClient();

    const { error: signInError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (signInError) {
      setError(signInError.message);
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-6 text-zinc-900">
      <div className="w-full max-w-md space-y-6 rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold">Sign in</h1>
          <p className="text-sm text-zinc-600">
            Use your Google account to access the tool.
          </p>
        </div>

        {message ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            {message}
          </div>
        ) : null}

        {error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <button
          type="button"
          onClick={handleSignIn}
          disabled={isLoading}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-black px-4 py-3 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isLoading ? "Redirecting..." : "Sign in with Google"}
        </button>
      </div>
    </div>
  );
}
