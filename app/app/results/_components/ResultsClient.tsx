"use client";

import { useEffect, useMemo, useState } from "react";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type FlavorOption = {
  id: number;
  slug: string;
};

type CaptionRow = {
  id: number;
  content: string | null;
  image_id: number | null;
  created_datetime_utc: string | null;
  like_count?: number | null;
  humor_flavor_id?: number | null;
  images?: { url?: string | null } | null;
};

type ResultsClientProps = {
  flavors: FlavorOption[];
};

function formatDate(value: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

export default function ResultsClient({ flavors }: ResultsClientProps) {
  const [selectedFlavorId, setSelectedFlavorId] = useState<string>(
    flavors[0]?.id ? String(flavors[0].id) : "",
  );
  const [captions, setCaptions] = useState<CaptionRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedFlavor = useMemo(
    () => flavors.find((flavor) => String(flavor.id) === selectedFlavorId),
    [flavors, selectedFlavorId],
  );

  useEffect(() => {
    const fetchCaptions = async () => {
      if (!selectedFlavorId) {
        setCaptions([]);
        return;
      }

      setIsLoading(true);
      setError(null);

      const supabase = createSupabaseBrowserClient();
      const { data, error: queryError } = await supabase
        .from("captions")
        .select(
          "id,content,image_id,created_datetime_utc,like_count,humor_flavor_id,images(url)",
        )
        .eq("humor_flavor_id", Number(selectedFlavorId))
        .order("created_datetime_utc", { ascending: false })
        .limit(50);

      if (queryError) {
        setError(queryError.message);
        setCaptions([]);
      } else {
        setCaptions((data ?? []) as CaptionRow[]);
      }

      setIsLoading(false);
    };

    fetchCaptions();
  }, [selectedFlavorId]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Results</h1>
          <p className="text-sm text-zinc-500">
            Review generated captions by flavor.
          </p>
        </div>
        <div className="min-w-[240px]">
          <label className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
            Humor flavor
          </label>
          <select
            value={selectedFlavorId}
            onChange={(event) => setSelectedFlavorId(event.target.value)}
            className="mt-2 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900"
          >
            <option value="">Select flavor</option>
            {flavors.map((flavor) => (
              <option key={flavor.id} value={flavor.id}>
                {flavor.slug}
              </option>
            ))}
          </select>
        </div>
      </div>

      {selectedFlavor ? (
        <div className="text-sm text-zinc-500">
          Showing latest captions for <span className="font-medium">{selectedFlavor.slug}</span>.
        </div>
      ) : null}

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <div className="rounded-2xl border border-zinc-200 bg-white">
        <div className="grid grid-cols-12 gap-3 border-b border-zinc-200 bg-zinc-50 px-6 py-3 text-xs font-semibold uppercase tracking-wide text-zinc-500">
          <div className="col-span-5">Caption</div>
          <div className="col-span-2">Image</div>
          <div className="col-span-2">Created</div>
          <div className="col-span-1">Likes</div>
          <div className="col-span-2">Image ID</div>
        </div>
        <div className="divide-y divide-zinc-100">
          {isLoading ? (
            <div className="px-6 py-10 text-center text-sm text-zinc-500">
              Loading captions...
            </div>
          ) : captions.length === 0 ? (
            <div className="px-6 py-10 text-center text-sm text-zinc-500">
              No captions found for this flavor.
            </div>
          ) : (
            captions.map((caption) => (
              <div
                key={caption.id}
                className="grid grid-cols-12 gap-3 px-6 py-4 text-sm text-zinc-700"
              >
                <div className="col-span-5 text-zinc-800">
                  {caption.content ?? "—"}
                </div>
                <div className="col-span-2">
                  {caption.images?.url ? (
                    <img
                      src={caption.images.url}
                      alt="Thumbnail"
                      className="h-16 w-24 rounded-lg object-cover"
                    />
                  ) : (
                    <div className="h-16 w-24 rounded-lg border border-dashed border-zinc-200 text-[11px] text-zinc-400 flex items-center justify-center">
                      No image
                    </div>
                  )}
                </div>
                <div className="col-span-2 text-zinc-500">
                  {formatDate(caption.created_datetime_utc)}
                </div>
                <div className="col-span-1 text-zinc-500">
                  {caption.like_count ?? "—"}
                </div>
                <div className="col-span-2 text-zinc-500">
                  {caption.image_id ?? "—"}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
