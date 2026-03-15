import { NextResponse } from "next/server";
import { createRouteHandlerClient } from "@/utils/supabase/route-handler";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim() ?? "";
  const response = NextResponse.json({ results: [] });
  const supabase = createRouteHandlerClient(response);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (query.length < 2) {
    return response;
  }

  const escapedQuery = query.replace(/[%_,]/g, "\\$&");
  const { data, error } = await supabase
    .from("profiles")
    .select("id, email, full_name")
    .or(`full_name.ilike.%${escapedQuery}%,email.ilike.%${escapedQuery}%`)
    .order("created_at", { ascending: false })
    .limit(8);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    results: (data ?? []).map((result) => ({
      id: result.id,
      email: result.email,
      fullName: result.full_name,
    })),
  });
}
