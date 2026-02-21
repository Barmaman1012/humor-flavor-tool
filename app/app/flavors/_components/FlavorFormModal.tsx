"use client";

import { useEffect, useMemo, useState } from "react";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export type Flavor = {
  id: number;
  slug: string;
  description: string | null;
  created_datetime_utc: string;
};

type FlavorFormModalProps = {
  open: boolean;
  mode: "create" | "edit";
  initialFlavor?: Flavor | null;
  onClose: () => void;
  onSuccess: () => void;
};

function getFriendlyError(message: string) {
  if (message.toLowerCase().includes("duplicate key")) {
    return "That slug is already in use. Please choose another.";
  }
  return message;
}

export default function FlavorFormModal({
  open,
  mode,
  initialFlavor,
  onClose,
  onSuccess,
}: FlavorFormModalProps) {
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setSlug(initialFlavor?.slug ?? "");
      setDescription(initialFlavor?.description ?? "");
      setError(null);
      setIsSaving(false);
    }
  }, [open, initialFlavor]);

  const title = useMemo(
    () => (mode === "create" ? "New Flavor" : "Edit Flavor"),
    [mode],
  );

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!slug.trim()) {
      setError("Slug is required.");
      return;
    }

    setIsSaving(true);
    setError(null);

    const supabase = createSupabaseBrowserClient();

    if (mode === "create") {
      const { error: insertError } = await supabase
        .from("humor_flavors")
        .insert({
          slug: slug.trim(),
          description: description.trim() || null,
        });

      if (insertError) {
        setError(getFriendlyError(insertError.message));
        setIsSaving(false);
        return;
      }
    } else if (initialFlavor) {
      const { error: updateError } = await supabase
        .from("humor_flavors")
        .update({
          slug: slug.trim(),
          description: description.trim() || null,
        })
        .eq("id", initialFlavor.id);

      if (updateError) {
        setError(getFriendlyError(updateError.message));
        setIsSaving(false);
        return;
      }
    }

    setIsSaving(false);
    onSuccess();
    onClose();
  };

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-zinc-900">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full px-3 py-1 text-sm text-zinc-500 hover:bg-zinc-100"
          >
            Close
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-700">Slug</label>
            <input
              type="text"
              value={slug}
              onChange={(event) => setSlug(event.target.value)}
              className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-400"
              placeholder="e.g. dry-wit"
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-700">
              Description
            </label>
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              className="min-h-[120px] w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-400"
              placeholder="Optional description"
            />
          </div>

          {error ? (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          ) : null}

          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-zinc-200 px-4 py-2 text-sm text-zinc-700 hover:border-zinc-300 hover:text-zinc-900"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="rounded-lg bg-black px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isSaving ? "Saving..." : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
