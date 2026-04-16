import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import AppShell from "../../../_components/AppShell";

export default async function FlavorResultsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const numericId = Number(id);
  if (Number.isNaN(numericId)) {
    redirect("/app/flavors");
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: flavor } = await supabase
    .from("humor_flavors")
    .select("id,slug")
    .eq("id", numericId)
    .maybeSingle();

  const { data: captions } = await supabase
    .from("captions")
    .select("*")
    .eq("humor_flavor_id", numericId)
    .order("created_datetime_utc", { ascending: false })
    .limit(50);

  return (
    <AppShell email={user?.email}>
      <div className="space-y-6">
        <div className="space-y-2">
          <div className="text-sm text-zinc-500">
            <a href="/app/flavors" className="hover:underline">
              Flavors
            </a>
            <span className="px-2">/</span>
            <a
              href={`/app/flavors/${numericId}`}
              className="hover:underline"
            >
              {flavor?.slug ?? "Flavor"}
            </a>
            <span className="px-2">/</span>
            <span>Results</span>
          </div>
          <h1 className="text-2xl font-semibold text-zinc-900">
            Results for {flavor?.slug ?? "Flavor"}
          </h1>
          <p className="text-sm text-zinc-500">
            Latest captions generated for this humor flavor.
          </p>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white">
          <div className="grid grid-cols-12 gap-3 border-b border-zinc-200 bg-zinc-50 px-6 py-3 text-xs font-semibold uppercase tracking-wide text-zinc-500">
            <div className="col-span-5">Caption</div>
            <div className="col-span-2">Created</div>
            <div className="col-span-1">Image ID</div>
            <div className="col-span-2">Caption Request</div>
            <div className="col-span-2">Prompt Chain</div>
          </div>
          <div className="divide-y divide-zinc-100">
            {captions && captions.length > 0 ? (
              captions.map((caption) => (
                <div
                  key={caption.id}
                  className="grid grid-cols-12 gap-3 px-6 py-4 text-sm text-zinc-700"
                >
                  <div className="col-span-5 text-zinc-800">
                    {caption.content ?? "—"}
                  </div>
                  <div className="col-span-2 text-zinc-500">
                    {caption.created_datetime_utc ?? "—"}
                  </div>
                  <div className="col-span-1 text-zinc-500">
                    {caption.image_id ?? "—"}
                  </div>
                  <div className="col-span-2 text-zinc-500">
                    {caption.caption_request_id ?? "—"}
                  </div>
                  <div className="col-span-2 text-zinc-500">
                    {caption.llm_prompt_chain_id ?? "—"}
                  </div>
                </div>
              ))
            ) : (
              <div className="px-6 py-10 text-center text-sm text-zinc-500">
                No captions found.
              </div>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
