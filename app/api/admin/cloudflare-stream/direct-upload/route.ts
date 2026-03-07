import { NextResponse } from "next/server";
import { createRouteHandlerClient } from "@/utils/supabase/route-handler";

const TUS_VERSION = "1.0.0";

async function getAdminUser() {
  const response = NextResponse.json({});
  const supabase = createRouteHandlerClient(response);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: NextResponse.json({ error: "Unauthorized." }, { status: 401 }) };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role !== "admin") {
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

  const adminState = await getAdminUser();

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
    return new NextResponse(errorText || "Could not create Cloudflare upload URL.", {
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
