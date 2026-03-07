import { NextResponse } from "next/server";
import { createRouteHandlerClient } from "@/utils/supabase/route-handler";

function toMessageUrl(requestUrl: string, message: string) {
  const url = new URL("/forgot-password", requestUrl);
  url.searchParams.set("message", message);
  return url;
}

export async function POST(request: Request) {
  const formData = await request.formData();
  const email = String(formData.get("email") ?? "").trim();

  if (!email) {
    return NextResponse.redirect(
      toMessageUrl(request.url, "Email is required."),
      { status: 303 },
    );
  }

  const response = NextResponse.redirect(
    toMessageUrl(request.url, "If that email exists, a reset link has been sent."),
    { status: 303 },
  );
  const supabase = createRouteHandlerClient(response);
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${new URL(request.url).origin}/auth/callback?next=/reset-password`,
  });

  if (error) {
    console.error("Password reset request failed", {
      code: error.code,
      message: error.message,
      email,
    });

    const message = error.message.toLowerCase().includes("rate limit")
      ? "Too many reset requests. Wait a minute, then try again once."
      : "Password reset email could not be sent. Check Supabase email settings and allowed redirect URLs.";

    return NextResponse.redirect(toMessageUrl(request.url, message), {
      status: 303,
    });
  }

  return response;
}
