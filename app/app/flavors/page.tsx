import { createSupabaseServerClient } from "@/lib/supabase/server";
import AppShell from "../_components/AppShell";
import FlavorsClient from "./_components/FlavorsClient";

export default async function FlavorsPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: flavors, error } = await supabase
    .from("humor_flavors")
    .select("id,created_datetime_utc,slug,description")
    .order("created_datetime_utc", { ascending: false });

  return (
    <AppShell email={user?.email}>
      <FlavorsClient
        flavors={flavors ?? []}
        loadError={error?.message ?? null}
      />
    </AppShell>
  );
}
