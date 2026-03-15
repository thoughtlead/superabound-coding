import { NextResponse } from "next/server";
import { getBaseUrlFromRequest } from "@/utils/portal";
import { createRouteHandlerClient } from "@/utils/supabase/route-handler";

function getSubmittedOrigin(formData: FormData) {
  const value = String(formData.get("redirectOrigin") ?? "").trim();

  if (!value) {
    return null;
  }

  try {
    const url = new URL(value);

    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return null;
    }

    return url.origin;
  } catch {
    return null;
  }
}

function toMessageUrl(baseUrl: string, message: string) {
  const url = new URL("/forgot-password", baseUrl);
  url.searchParams.set("message", message);
  return url;
}

export async function POST(request: Request) {
  const formData = await request.formData();
  const email = String(formData.get("email") ?? "").trim();
  const baseUrl = getSubmittedOrigin(formData) ?? getBaseUrlFromRequest(request);

  if (!email) {
    return NextResponse.redirect(
      toMessageUrl(baseUrl, "Email is required."),
      { status: 303 },
    );
  }

  const response = NextResponse.redirect(
    toMessageUrl(baseUrl, "If that email exists, a reset link has been sent."),
    { status: 303 },
  );
  const supabase = createRouteHandlerClient(response);
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${baseUrl}/auth/callback?next=/reset-password`,
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

    return NextResponse.redirect(toMessageUrl(baseUrl, message), {
      status: 303,
    });
  }

  return response;
}
