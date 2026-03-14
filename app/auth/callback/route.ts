import { type EmailOtpType } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { createRouteHandlerClient } from "@/utils/supabase/route-handler";

async function syncCurrentProfileEmail(
  supabase: ReturnType<typeof createRouteHandlerClient>,
) {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    return;
  }

  await supabase.from("profiles").update({ email: user.email }).eq("id", user.id);
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/library";

  if (tokenHash && type) {
    const response = NextResponse.redirect(`${origin}${next}`);
    const supabase = createRouteHandlerClient(response);
    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash: tokenHash,
    });

    if (!error) {
      await syncCurrentProfileEmail(supabase);
      return response;
    }
  }

  if (code) {
    const response = NextResponse.redirect(`${origin}${next}`);
    const supabase = createRouteHandlerClient(response);
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      await syncCurrentProfileEmail(supabase);
      return response;
    }
  }

  return NextResponse.redirect(`${origin}/login?message=Could+not+authenticate`);
}
