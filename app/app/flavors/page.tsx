import { createSupabaseServerClient } from "@/lib/supabase/server";
import AppShell from "../_components/AppShell";
import FlavorsClient from "./_components/FlavorsClient";

export default async function FlavorsPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [
    { data: flavors, error },
    { data: stepTypes, error: stepTypesError },
    { data: models, error: modelsError },
    { data: inputTypes, error: inputTypesError },
    { data: outputTypes, error: outputTypesError },
  ] = await Promise.all([
      supabase
        .from("humor_flavors")
        .select("id,created_datetime_utc,slug,description")
        .order("created_datetime_utc", { ascending: false }),
      supabase
        .from("humor_flavor_step_types")
        .select("id,slug,description")
        .order("slug"),
      supabase
        .from("llm_models")
        .select("id,name,is_temperature_supported")
        .order("name"),
      supabase
        .from("llm_input_types")
        .select("id,slug,description")
        .order("slug"),
      supabase
        .from("llm_output_types")
        .select("id,slug,description")
        .order("slug"),
    ]);

  return (
    <AppShell email={user?.email}>
      <FlavorsClient
        flavors={flavors ?? []}
        loadError={error?.message ?? null}
        stepTypes={stepTypes ?? []}
        models={models ?? []}
        inputTypes={inputTypes ?? []}
        outputTypes={outputTypes ?? []}
        stepTypesError={stepTypesError?.message ?? null}
        modelsError={modelsError?.message ?? null}
        inputTypesError={inputTypesError?.message ?? null}
        outputTypesError={outputTypesError?.message ?? null}
      />
    </AppShell>
  );
}
