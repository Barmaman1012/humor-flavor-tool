import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import AppShell from "../../_components/AppShell";
import FlavorStepsClient from "./_components/FlavorStepsClient";

export default async function FlavorStepsPage({
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

  const { data: flavor, error: flavorError } = await supabase
    .from("humor_flavors")
    .select("id,slug,description")
    .eq("id", numericId)
    .maybeSingle();

  const { data: steps, error: stepsError } = await supabase
    .from("humor_flavor_steps")
    .select(
      "id,humor_flavor_id,order_by,description,system_prompt,user_prompt,temperature,humor_flavor_step_type_id,llm_model_id,llm_input_type_id,llm_output_type_id",
    )
    .eq("humor_flavor_id", flavor?.id ?? -1)
    .order("order_by", { ascending: true });

  const [{ data: stepTypes }, { data: models }, { data: inputTypes }, { data: outputTypes }] =
    await Promise.all([
      supabase.from("humor_flavor_step_types").select("id,name").order("name"),
      supabase.from("llm_models").select("id,name").order("name"),
      supabase.from("llm_input_types").select("id,name").order("name"),
      supabase.from("llm_output_types").select("id,name").order("name"),
    ]);

  if (flavorError || !flavor) {
    return (
      <AppShell email={user?.email}>
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-800">
          <h1 className="mb-3 text-lg font-semibold text-red-900">
            Flavor fetch failed
          </h1>
          <div className="space-y-2">
            <div>numericId: {numericId}</div>
            <div>user email: {user?.email ?? "unknown"}</div>
            <div>
              flavorError:
              <pre className="mt-2 whitespace-pre-wrap rounded-lg border border-red-200 bg-white p-3 text-xs text-red-800">
                {JSON.stringify(flavorError, null, 2)}
              </pre>
            </div>
            <div>
              flavor:
              <pre className="mt-2 whitespace-pre-wrap rounded-lg border border-red-200 bg-white p-3 text-xs text-red-800">
                {JSON.stringify(flavor, null, 2)}
              </pre>
            </div>
            <div>
              stepsError:
              <pre className="mt-2 whitespace-pre-wrap rounded-lg border border-red-200 bg-white p-3 text-xs text-red-800">
                {JSON.stringify(stepsError, null, 2)}
              </pre>
            </div>
            <a href="/app/flavors" className="inline-block underline">
              Back to flavors
            </a>
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell email={user?.email}>
      <FlavorStepsClient
        flavor={flavor}
        steps={steps ?? []}
        stepTypes={stepTypes ?? []}
        models={models ?? []}
        inputTypes={inputTypes ?? []}
        outputTypes={outputTypes ?? []}
      />
    </AppShell>
  );
}
