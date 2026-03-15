import { NextResponse } from "next/server";
import { getPortalSlugFromHost } from "@/utils/portal";
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

  const portalSlug = getPortalSlugFromHost(request.headers.get("x-forwarded-host") ?? request.headers.get("host"));
  const { data: portal } = await supabase
    .from("portals")
    .select("id")
    .eq("slug", portalSlug)
    .maybeSingle();

  if (!portal) {
    return NextResponse.json({ error: "Portal not found" }, { status: 404 });
  }

  const { data: membership } = await supabase
    .from("portal_memberships")
    .select("role")
    .eq("portal_id", portal.id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membership || (membership.role !== "owner" && membership.role !== "admin")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (query.length < 2) {
    return response;
  }

  const escapedQuery = query.replace(/[%_,]/g, "\\$&");
  const { data, error } = await supabase
    .from("profiles")
    .select("id, email, full_name, portal_memberships!inner(portal_id)")
    .eq("portal_memberships.portal_id", portal.id)
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
