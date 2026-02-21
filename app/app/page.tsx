import { createSupabaseServerClient } from "@/lib/supabase/server";
import AppShell from "./_components/AppShell";

export default async function AppPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <AppShell email={user?.email}>
      <div className="rounded-2xl border border-dashed border-zinc-300 bg-white p-10 text-center text-sm text-zinc-500">
        Dashboard shell. Add content here.
      </div>
    </AppShell>
  );
}
