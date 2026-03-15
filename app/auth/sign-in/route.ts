import { NextResponse } from "next/server";
import { getBaseUrlFromRequest } from "@/utils/portal";
import { createRouteHandlerClient } from "@/utils/supabase/route-handler";

function toMessageUrl(request: Request, message: string) {
  const url = new URL("/login", getBaseUrlFromRequest(request));
  url.searchParams.set("message", message);
  return url;
}

export async function POST(request: Request) {
  const formData = await request.formData();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return NextResponse.redirect(
      toMessageUrl(request, "Email and password are required."),
      { status: 303 },
    );
  }

  const successUrl = new URL("/library", getBaseUrlFromRequest(request));
  const response = NextResponse.redirect(successUrl, { status: 303 });
  const supabase = createRouteHandlerClient(response);
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return NextResponse.redirect(
      toMessageUrl(request, "Invalid email or password."),
      { status: 303 },
    );
  }

  return response;
}
