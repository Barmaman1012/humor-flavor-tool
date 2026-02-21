import { createSupabaseServerClient } from "@/lib/supabase/server";
import AppShell from "../_components/AppShell";
import ResultsClient from "./_components/ResultsClient";

export default async function ResultsPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: flavors } = await supabase
    .from("humor_flavors")
    .select("id,slug")
    .order("slug", { ascending: true });

  return (
    <AppShell email={user?.email}>
      <ResultsClient flavors={flavors ?? []} />
    </AppShell>
  );
}
