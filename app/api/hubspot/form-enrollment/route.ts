import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import {
  provisionHubspotCourseAccess,
  verifyHubspotWebhookRequest,
  type HubspotEnrollmentPayload,
} from "@/utils/hubspot-enrollment";

export async function POST(request: Request) {
  const bodyText = await request.text();

  if (!verifyHubspotWebhookRequest(request, bodyText)) {
    return NextResponse.json({ error: "Unauthorized webhook request." }, { status: 401 });
  }

  let payload: HubspotEnrollmentPayload;

  try {
    payload = JSON.parse(bodyText) as HubspotEnrollmentPayload;
  } catch {
    return NextResponse.json({ error: "Webhook body must be valid JSON." }, { status: 400 });
  }

  try {
    const result = await provisionHubspotCourseAccess({ request, payload });

    revalidatePath("/library");
    revalidatePath("/admin/enrollments");

    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not provision course access.";
    const status =
      message.includes("requires an email") ||
      message.includes("requires courseSlug") ||
      message.includes("must be valid JSON")
        ? 400
        : message.includes("not found")
          ? 404
          : message.includes("not published")
            ? 409
            : 500;

    return NextResponse.json({ error: message }, { status });
  }
}
