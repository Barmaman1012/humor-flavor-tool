import { createSupabaseServerClient } from "@/lib/supabase/server";
import AppShell from "../_components/AppShell";
import TestClient from "./_components/TestClient";

export default async function TestPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: flavors } = await supabase
    .from("humor_flavors")
    .select("id,slug")
    .order("slug", { ascending: true });

  const { data: commonImages } = await supabase
    .from("images")
    .select("id,url,is_common_use,created_datetime_utc")
    .eq("is_common_use", true)
    .order("created_datetime_utc", { ascending: false })
    .limit(20);

  const images =
    commonImages && commonImages.length > 0
      ? commonImages
      : (
          await supabase
            .from("images")
            .select("id,url,is_common_use,created_datetime_utc")
            .order("created_datetime_utc", { ascending: false })
            .limit(20)
        ).data ?? [];

  return (
    <AppShell email={user?.email}>
      <TestClient flavors={flavors ?? []} images={images} />
    </AppShell>
  );
}
