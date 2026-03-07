import { NextResponse } from "next/server";
import { createRouteHandlerClient } from "@/utils/supabase/route-handler";

type CloudflareDirectUploadResponse = {
  result?: {
    uid: string;
    uploadURL: string;
  };
  success: boolean;
  errors?: Array<{
    code: number;
    message: string;
  }>;
};

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

  const response = NextResponse.json({});
  const supabase = createRouteHandlerClient(response);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const cloudflareResponse = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${accountId}/stream/direct_upload`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        maxDurationSeconds: 7200,
      }),
    },
  );

  const payload =
    (await cloudflareResponse.json()) as CloudflareDirectUploadResponse;

  if (!cloudflareResponse.ok || !payload.success || !payload.result) {
    return NextResponse.json(
      {
        error:
          payload.errors?.[0]?.message ?? "Could not create Cloudflare upload URL.",
      },
      { status: 500 },
    );
  }

  return NextResponse.json({
    embedUrl: `https://customer-${customerCode}.cloudflarestream.com/${payload.result.uid}/iframe`,
    mediaProvider: "cloudflare-stream",
    mediaUrl: payload.result.uid,
    uploadUrl: payload.result.uploadURL,
  });
}
