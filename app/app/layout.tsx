import { ReactNode } from "react";
import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import NotAuthorized from "./_components/NotAuthorized";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("is_superadmin,is_matrix_admin")
    .eq("id", user.id)
    .maybeSingle();

  const isAuthorized =
    !error && !!profile && (profile.is_superadmin || profile.is_matrix_admin);

  if (!isAuthorized) {
    return <NotAuthorized email={user.email} />;
  }

  return <>{children}</>;
}
