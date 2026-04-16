import { NextRequest, NextResponse } from "next/server";

import { createSupabaseServerRouteClient } from "@/lib/supabase/server-route";

export async function POST(request: NextRequest) {
  const response = NextResponse.json({ ok: false }, { status: 400 });

  let body: { flavorId?: number } = {};
  try {
    body = await request.json();
  } catch {
    return response;
  }

  const flavorId = body.flavorId;
  if (!flavorId) {
    return response;
  }

  const supabase = createSupabaseServerRouteClient(request, response);
  const { count, error } = await supabase
    .from("humor_flavor_steps")
    .select("id", { count: "exact", head: true })
    .eq("humor_flavor_id", flavorId);

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
  }

  if (!count || count === 0) {
    return NextResponse.json(
      { ok: false, error: "This flavor has no steps. Add steps first." },
      { status: 400 },
    );
  }

  return NextResponse.json({ ok: true });
}
