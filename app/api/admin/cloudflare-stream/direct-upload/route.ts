import { NextResponse } from "next/server";
import { getPortalSlugFromHost } from "@/utils/portal";
import { createRouteHandlerClient } from "@/utils/supabase/route-handler";

const TUS_VERSION = "1.0.0";

function getCloudflareUploadErrorMessage(payloadText: string) {
  try {
    const payload = JSON.parse(payloadText) as {
      errors?: Array<{ code?: number; message?: string }>;
      messages?: Array<{ code?: number; message?: string }>;
    };
    const quotaError = payload.errors?.find((error) => error.code === 10011);
    const quotaMessage = payload.messages?.find((message) => message.code === 10011)?.message;

    if (quotaError) {
      return quotaMessage
        ? `Cloudflare Stream is still reporting your account as over storage quota. ${quotaMessage} If you just added capacity, wait a few minutes and retry. If the limit still has not updated, refresh Cloudflare billing/usage or delete unused videos.`
        : "Cloudflare Stream is still reporting your account as over storage quota. If you just added capacity, wait a few minutes and retry. If the limit still has not updated, refresh Cloudflare billing/usage or delete unused videos.";
    }
  } catch {
    // Fall back to the raw error text below.
  }

  return payloadText || "Could not create Cloudflare upload URL.";
}

async function getAdminUser(request: Request) {
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

export async function POST(request: Request) {
  const accountId = process.env.CLOUDFLARE_STREAM_ACCOUNT_ID;
  const apiToken = process.env.CLOUDFLARE_STREAM_API_TOKEN;
  const customerCode = process.env.CLOUDFLARE_STREAM_CUSTOMER_CODE;

  if (!accountId || !apiToken || !customerCode) {
    return NextResponse.json(
      { error: "Cloudflare Stream environment variables are missing." },
      { status: 500 },
    );
  }

  const adminState = await getAdminUser(request);

  if ("error" in adminState) {
    return adminState.error;
  }

  const uploadLength = request.headers.get("upload-length");
  const uploadMetadata = request.headers.get("upload-metadata");
  const tusResumable = request.headers.get("tus-resumable") ?? TUS_VERSION;

  if (!uploadLength) {
    return new NextResponse("Upload-Length header is required.", { status: 400 });
  }

  const cloudflareResponse = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${accountId}/stream?direct_user=true`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiToken}`,
        "Tus-Resumable": tusResumable,
        "Upload-Length": uploadLength,
        ...(uploadMetadata ? { "Upload-Metadata": uploadMetadata } : {}),
      },
    },
  );

  if (!cloudflareResponse.ok) {
    const errorText = await cloudflareResponse.text();
    return new NextResponse(getCloudflareUploadErrorMessage(errorText), {
      status: cloudflareResponse.status,
    });
  }

  const location = cloudflareResponse.headers.get("Location");
  const mediaId = cloudflareResponse.headers.get("stream-media-id");

  if (!location || !mediaId) {
    return new NextResponse("Cloudflare did not return upload metadata.", {
      status: 502,
    });
  }

  return new NextResponse(null, {
    status: cloudflareResponse.status,
    headers: {
      Location: location,
      "Tus-Resumable": cloudflareResponse.headers.get("Tus-Resumable") ?? tusResumable,
      "stream-media-id": mediaId,
      "x-cloudflare-embed-url": `https://customer-${customerCode}.cloudflarestream.com/${mediaId}/iframe`,
      "Cache-Control": "no-store",
    },
  });
}
