import { NextRequest, NextResponse } from "next/server";

import { createSupabaseServerRouteClient } from "./lib/supabase/server-route";

export async function proxy(request: NextRequest) {
  const response = NextResponse.next();
  const supabase = createSupabaseServerRouteClient(request, response);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;
  if (pathname.startsWith("/app") && !user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return response;
}

export const config = {
  matcher: ["/app/:path*", "/((?!_next/static|_next/image|favicon.ico).*)"],
};
