import { NextResponse } from "next/server";
import { createRouteHandlerClient } from "@/utils/supabase/route-handler";

function toMessageUrl(requestUrl: string, path: string, message: string) {
  const url = new URL(path, requestUrl);
  url.searchParams.set("message", message);
  return url;
}

export async function POST(request: Request) {
  const formData = await request.formData();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const fullName = String(formData.get("fullName") ?? "").trim();

  if (!email || !password) {
    return NextResponse.redirect(
      toMessageUrl(request.url, "/signup", "Email and password are required."),
      { status: 303 },
    );
  }

  if (password.length < 8) {
    return NextResponse.redirect(
      toMessageUrl(request.url, "/signup", "Use a password with at least 8 characters."),
      { status: 303 },
    );
  }

  const successUrl = new URL("/library", request.url);
  const response = NextResponse.redirect(successUrl, { status: 303 });
  const supabase = createRouteHandlerClient(response);
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName || email,
      },
    },
  });

  if (error) {
    return NextResponse.redirect(
      toMessageUrl(request.url, "/signup", error.message),
      { status: 303 },
    );
  }

  if (!data.session) {
    return NextResponse.redirect(
      toMessageUrl(
        request.url,
        "/login",
        "Account created. Confirm your email before signing in.",
      ),
      { status: 303 },
    );
  }

  return response;
}
