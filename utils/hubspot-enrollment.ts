import crypto from "node:crypto";
import { createAdminClient } from "@/utils/supabase/admin";
import { getPortalSlugFromHost } from "@/utils/portal";

const DEFAULT_PORTAL_ROLE = "member" as const;
const WELCOME_NEXT_PATH = encodeURIComponent(
  "/create-account?message=Create+your+password+to+finish+setting+up+your+account.",
);

export type HubspotEnrollmentPayload = {
  email?: string | null;
  fullName?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  firstname?: string | null;
  lastname?: string | null;
  courseSlug?: string | null;
  course_slug?: string | null;
};

export function getHubspotWebhookCourseSlug(payload: HubspotEnrollmentPayload) {
  return String(
    payload.courseSlug ?? payload.course_slug ?? process.env.HUBSPOT_DEFAULT_COURSE_SLUG ?? "",
  )
    .trim()
    .toLowerCase();
}

export function getHubspotWebhookBaseUrl(request: Request) {
  const forwardedProto = request.headers.get("x-forwarded-proto");
  const forwardedHost = request.headers.get("x-forwarded-host");
  const host = forwardedHost ?? request.headers.get("host");

  if (host) {
    return `${forwardedProto ?? "https"}://${host}`;
  }

  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL;
  }

  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }

  return "http://localhost:3000";
}

export function getHubspotPayloadEmail(payload: HubspotEnrollmentPayload) {
  return String(payload.email ?? "")
    .trim()
    .toLowerCase();
}

export function getHubspotPayloadFullName(payload: HubspotEnrollmentPayload) {
  const explicitFullName = String(payload.fullName ?? "").trim();

  if (explicitFullName) {
    return explicitFullName;
  }

  const firstName = String(payload.firstName ?? payload.firstname ?? "").trim();
  const lastName = String(payload.lastName ?? payload.lastname ?? "").trim();
  const combinedName = `${firstName} ${lastName}`.trim();

  return combinedName || null;
}

function getFirstName(fullName: string | null) {
  return String(fullName ?? "")
    .trim()
    .split(/\s+/)[0] ?? "";
}

function timingSafeEqualHex(left: string, right: string) {
  try {
    const leftBuffer = Buffer.from(left, "hex");
    const rightBuffer = Buffer.from(right, "hex");

    if (leftBuffer.length === 0 || leftBuffer.length !== rightBuffer.length) {
      return false;
    }

    return crypto.timingSafeEqual(leftBuffer, rightBuffer);
  } catch {
    return false;
  }
}

function verifyHubspotV2Signature(request: Request, bodyText: string) {
  const clientSecret = process.env.HUBSPOT_WEBHOOK_CLIENT_SECRET;
  const signature = request.headers.get("x-hubspot-signature");
  const signatureVersion = request.headers.get("x-hubspot-signature-version");

  if (!clientSecret || !signature || signatureVersion !== "v2") {
    return false;
  }

  const source = `${clientSecret}${request.method}${request.url}${bodyText}`;
  const expected = crypto.createHash("sha256").update(source).digest("hex");

  return timingSafeEqualHex(expected, signature);
}

function verifySharedSecret(request: Request) {
  const sharedSecret = process.env.HUBSPOT_WEBHOOK_SECRET;

  if (!sharedSecret) {
    return false;
  }

  const authorization = request.headers.get("authorization")?.trim();
  const xWebhookSecret = request.headers.get("x-webhook-secret")?.trim();

  return (
    authorization === `Bearer ${sharedSecret}` ||
    xWebhookSecret === sharedSecret
  );
}

export function verifyHubspotWebhookRequest(request: Request, bodyText: string) {
  return verifySharedSecret(request) || verifyHubspotV2Signature(request, bodyText);
}

export async function provisionHubspotCourseAccess({
  request,
  payload,
}: {
  request: Request;
  payload: HubspotEnrollmentPayload;
}) {
  const adminSupabase = createAdminClient();
  const email = getHubspotPayloadEmail(payload);
  const fullName = getHubspotPayloadFullName(payload);
  const courseSlug = getHubspotWebhookCourseSlug(payload);
  const baseUrl = getHubspotWebhookBaseUrl(request);
  const portalSlug = getPortalSlugFromHost(
    request.headers.get("x-forwarded-host") ?? request.headers.get("host"),
  );

  if (!email) {
    throw new Error("Webhook payload requires an email field.");
  }

  if (!courseSlug) {
    throw new Error(
      "Webhook payload requires courseSlug, or HUBSPOT_DEFAULT_COURSE_SLUG must be configured.",
    );
  }

  const { data: portal, error: portalError } = await adminSupabase
    .from("portals")
    .select("id, slug, name")
    .eq("slug", portalSlug)
    .eq("is_active", true)
    .maybeSingle();

  if (portalError) {
    throw new Error(portalError.message);
  }

  if (!portal) {
    throw new Error(`Active portal not found for slug \"${portalSlug}\".`);
  }

  const { data: course, error: courseError } = await adminSupabase
    .from("courses")
    .select("id, slug, title, status")
    .eq("portal_id", portal.id)
    .eq("slug", courseSlug)
    .maybeSingle();

  if (courseError) {
    throw new Error(courseError.message);
  }

  if (!course) {
    throw new Error(`Course \"${courseSlug}\" was not found in portal \"${portal.slug}\".`);
  }

  if (course.status !== "published") {
    throw new Error(`Course \"${course.title}\" is not published.`);
  }

  const { data: existingProfile, error: existingProfileError } = await adminSupabase
    .from("profiles")
    .select("id, full_name, email")
    .eq("email", email)
    .maybeSingle();

  if (existingProfileError) {
    throw new Error(existingProfileError.message);
  }

  const redirectTo = `${baseUrl}/auth/callback?next=${WELCOME_NEXT_PATH}`;

  if (existingProfile) {
    if (fullName && fullName !== existingProfile.full_name) {
      const { error: profileUpdateError } = await adminSupabase
        .from("profiles")
        .update({ full_name: fullName })
        .eq("id", existingProfile.id);

      if (profileUpdateError) {
        throw new Error(profileUpdateError.message);
      }
    }

    const { error: membershipError } = await adminSupabase.from("portal_memberships").upsert(
      {
        portal_id: portal.id,
        user_id: existingProfile.id,
        role: DEFAULT_PORTAL_ROLE,
      },
      {
        onConflict: "portal_id,user_id",
      },
    );

    if (membershipError) {
      throw new Error(membershipError.message);
    }

    const { error: enrollmentError } = await adminSupabase.from("course_enrollments").upsert(
      {
        course_id: course.id,
        user_id: existingProfile.id,
        status: "active",
      },
      {
        onConflict: "course_id,user_id",
      },
    );

    if (enrollmentError) {
      throw new Error(enrollmentError.message);
    }

    return {
      action: "enrolled_existing_user",
      portalSlug: portal.slug,
      courseSlug: course.slug,
      redirectTo,
      email,
    };
  }

  const { data: inviteData, error: inviteError } = await adminSupabase.auth.admin.inviteUserByEmail(
    email,
    {
      data: {
        full_name: fullName,
        first_name: getFirstName(fullName),
        granted_course_title: course.title,
      },
      redirectTo,
    },
  );

  if (inviteError || !inviteData.user) {
    throw new Error(inviteError?.message ?? "Could not create invited user.");
  }

  const invitedUserId = inviteData.user.id;

  const { error: profileError } = await adminSupabase.from("profiles").upsert(
    {
      id: invitedUserId,
      full_name: fullName,
      email,
      role: DEFAULT_PORTAL_ROLE,
    },
    {
      onConflict: "id",
    },
  );

  if (profileError) {
    throw new Error(profileError.message);
  }

  const { error: membershipError } = await adminSupabase.from("portal_memberships").upsert(
    {
      portal_id: portal.id,
      user_id: invitedUserId,
      role: DEFAULT_PORTAL_ROLE,
    },
    {
      onConflict: "portal_id,user_id",
    },
  );

  if (membershipError) {
    throw new Error(membershipError.message);
  }

  const { error: enrollmentError } = await adminSupabase.from("course_enrollments").upsert(
    {
      course_id: course.id,
      user_id: invitedUserId,
      status: "active",
    },
    {
      onConflict: "course_id,user_id",
    },
  );

  if (enrollmentError) {
    throw new Error(enrollmentError.message);
  }

  return {
    action: "invited_new_user",
    portalSlug: portal.slug,
    courseSlug: course.slug,
    redirectTo,
    email,
  };
}
