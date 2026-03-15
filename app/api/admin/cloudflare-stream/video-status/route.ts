import { NextResponse } from "next/server";
import { getPortalSlugFromHost } from "@/utils/portal";
import { createRouteHandlerClient } from "@/utils/supabase/route-handler";

type CloudflareVideoStatusResponse = {
  result?: {
    readyToStream?: boolean;
    status?: {
      state?: string;
      step?: string;
      pctComplete?: string | number;
      errorReasonCode?: string;
      errorReasonText?: string;
    };
    thumbnail?: string;
    preview?: string;
  };
  success: boolean;
  errors?: Array<{
    code: number;
    message: string;
  }>;
};

async function requireAdmin(request: Request) {
  const response = NextResponse.json({});
  const supabase = createRouteHandlerClient(response);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: NextResponse.json({ error: "Unauthorized." }, { status: 401 }) };
  }

  const portalSlug = getPortalSlugFromHost(request.headers.get("x-forwarded-host") ?? request.headers.get("host"));
  const { data: portal } = await supabase
    .from("portals")
    .select("id")
    .eq("slug", portalSlug)
    .maybeSingle();

  if (!portal) {
    return { error: NextResponse.json({ error: "Portal not found." }, { status: 404 }) };
  }

  const { data: membership } = await supabase
    .from("portal_memberships")
    .select("role")
    .eq("portal_id", portal.id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membership || (membership.role !== "owner" && membership.role !== "admin")) {
    return { error: NextResponse.json({ error: "Forbidden." }, { status: 403 }) };
  }

  return { user };
}

export async function GET(request: Request) {
  const accountId = process.env.CLOUDFLARE_STREAM_ACCOUNT_ID;
  const apiToken = process.env.CLOUDFLARE_STREAM_API_TOKEN;

  if (!accountId || !apiToken) {
    return NextResponse.json(
      { error: "Cloudflare Stream environment variables are missing." },
      { status: 500 },
    );
  }

  const adminState = await requireAdmin(request);

  if ("error" in adminState) {
    return adminState.error;
  }

  const { searchParams } = new URL(request.url);
  const mediaId = searchParams.get("mediaId");

  if (!mediaId) {
    return NextResponse.json({ error: "mediaId is required." }, { status: 400 });
  }

  const cloudflareResponse = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${accountId}/stream/${mediaId}`,
    {
      headers: {
        Authorization: `Bearer ${apiToken}`,
      },
      cache: "no-store",
    },
  );

  const payload =
    (await cloudflareResponse.json()) as CloudflareVideoStatusResponse;

  if (!cloudflareResponse.ok || !payload.success || !payload.result) {
    return NextResponse.json(
      {
        error: payload.errors?.[0]?.message ?? "Could not fetch Cloudflare video status.",
      },
      { status: cloudflareResponse.status || 500 },
    );
  }

  return NextResponse.json({
    pctComplete: payload.result.status?.pctComplete ?? null,
    previewUrl: payload.result.preview ?? null,
    readyToStream: payload.result.readyToStream ?? false,
    state: payload.result.status?.state ?? null,
    step: payload.result.status?.step ?? null,
    thumbnailUrl: payload.result.thumbnail ?? null,
    errorReasonCode: payload.result.status?.errorReasonCode ?? null,
    errorReasonText: payload.result.status?.errorReasonText ?? null,
  });
}
