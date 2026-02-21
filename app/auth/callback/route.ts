import { NextRequest, NextResponse } from "next/server";

import { createSupabaseServerRouteClient } from "@/lib/supabase/server-route";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(new URL("/login?message=missing-code", url));
  }

  const response = NextResponse.redirect(new URL("/app", url));
  const supabase = createSupabaseServerRouteClient(request, response);

  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(new URL("/login?message=auth-error", url));
  }

  return response;
}
