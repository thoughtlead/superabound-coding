import { NextResponse } from "next/server";
import { createRouteHandlerClient } from "@/utils/supabase/route-handler";

function toMessageUrl(requestUrl: string, path: string, message: string) {
  const url = new URL(path, requestUrl);
  url.searchParams.set("message", message);
  return url;
}

export async function POST(request: Request) {
  return NextResponse.redirect(
    toMessageUrl(request.url, "/login", "Account creation is invite-only."),
    { status: 303 },
  );
}
