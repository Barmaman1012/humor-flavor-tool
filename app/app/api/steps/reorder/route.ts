import { NextRequest, NextResponse } from "next/server";

import { createSupabaseServerRouteClient } from "@/lib/supabase/server-route";

export async function POST(request: NextRequest) {
  const response = NextResponse.json({ ok: false }, { status: 400 });

  let body: { stepId?: number; direction?: "up" | "down" } = {};
  try {
    body = await request.json();
  } catch {
    return response;
  }

  const stepId = body.stepId;
  const direction = body.direction;

  if (!stepId || (direction !== "up" && direction !== "down")) {
    return response;
  }

  const supabase = createSupabaseServerRouteClient(request, response);

  const { data: step, error: stepError } = await supabase
    .from("humor_flavor_steps")
    .select("id,humor_flavor_id,order_by")
    .eq("id", stepId)
    .maybeSingle();

  if (stepError || !step) {
    return NextResponse.json({ ok: false, error: stepError?.message }, { status: 404 });
  }

  const targetOrder = direction === "up" ? step.order_by - 1 : step.order_by + 1;
  if (targetOrder < 1) {
    return NextResponse.json({ ok: true });
  }

  const { data: adjacent, error: adjacentError } = await supabase
    .from("humor_flavor_steps")
    .select("id,order_by")
    .eq("humor_flavor_id", step.humor_flavor_id)
    .eq("order_by", targetOrder)
    .maybeSingle();

  if (adjacentError) {
    return NextResponse.json({ ok: false, error: adjacentError.message }, { status: 400 });
  }

  if (!adjacent) {
    return NextResponse.json({ ok: true });
  }

  const tempOrder = -999999;
  const { error: bumpError } = await supabase
    .from("humor_flavor_steps")
    .update({ order_by: tempOrder })
    .eq("id", adjacent.id);

  if (bumpError) {
    return NextResponse.json({ ok: false, error: bumpError.message }, { status: 400 });
  }

  const { error: updateCurrentError } = await supabase
    .from("humor_flavor_steps")
    .update({ order_by: targetOrder })
    .eq("id", step.id);

  if (updateCurrentError) {
    return NextResponse.json({ ok: false, error: updateCurrentError.message }, { status: 400 });
  }

  const { error: updateAdjacentError } = await supabase
    .from("humor_flavor_steps")
    .update({ order_by: step.order_by })
    .eq("id", adjacent.id);

  if (updateAdjacentError) {
    return NextResponse.json({ ok: false, error: updateAdjacentError.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
