import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { createClient } from "@/utils/supabase/server";

export type PortalRole = "owner" | "admin" | "member";

export type Portal = {
  id: string;
  slug: string;
  name: string;
  primary_domain: string | null;
  is_active: boolean;
};

export type PortalMembership = {
  portal_id: string;
  user_id: string;
  role: PortalRole;
};

const RESERVED_SUBDOMAINS = new Set(["www"]);
const DEFAULT_PORTAL_SLUG = process.env.DEFAULT_PORTAL_SLUG ?? "superabound";
const MARKETING_HOST = (process.env.NEXT_PUBLIC_MARKETING_HOST ?? "coursesforcreatives.com")
  .trim()
  .toLowerCase();

function normalizeHostname(host: string) {
  return host.trim().toLowerCase().replace(/:\d+$/, "");
}

export function isMarketingHost(host: string | null | undefined) {
  if (!host) {
    return false;
  }

  const hostname = normalizeHostname(host);

  return (
    hostname === MARKETING_HOST ||
    hostname === `www.${MARKETING_HOST}` ||
    hostname === "coursesforcreatives.lvh.me" ||
    hostname === "coursesforcreatives.localhost"
  );
}

export function getPortalSlugFromHost(host: string | null | undefined) {
  if (!host) {
    return DEFAULT_PORTAL_SLUG;
  }

  const hostname = normalizeHostname(host);

  if (hostname === "localhost" || hostname === "127.0.0.1") {
    return DEFAULT_PORTAL_SLUG;
  }

  // Bare Vercel deployment hosts are the app host, not a portal subdomain.
  // Map them to the default portal so production works before wildcard domains
  // are configured.
  if (hostname.endsWith(".vercel.app")) {
    return DEFAULT_PORTAL_SLUG;
  }

  if (hostname.endsWith(".localhost") || hostname.endsWith(".lvh.me")) {
    const [subdomain] = hostname.split(".");
    return subdomain && !RESERVED_SUBDOMAINS.has(subdomain)
      ? subdomain
      : DEFAULT_PORTAL_SLUG;
  }

  const parts = hostname.split(".");

  if (parts.length >= 3 && !RESERVED_SUBDOMAINS.has(parts[0])) {
    return parts[0];
  }

  return DEFAULT_PORTAL_SLUG;
}

export function getCurrentPortalSlugFromHeaders() {
  const headerStore = headers();
  const portalSlug = headerStore.get("x-portal-slug");

  if (portalSlug) {
    return portalSlug;
  }

  return getPortalSlugFromHost(
    headerStore.get("x-forwarded-host") ?? headerStore.get("host"),
  );
}

export function getRequestBaseUrl() {
  const headerStore = headers();
  const forwardedProto = headerStore.get("x-forwarded-proto");
  const forwardedHost = headerStore.get("x-forwarded-host");
  const host = forwardedHost ?? headerStore.get("host");

  if (host) {
    return `${forwardedProto ?? (process.env.NODE_ENV === "development" ? "http" : "https")}://${host}`;
  }

  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL;
  }

  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }

  return "http://localhost:3000";
}

export function getBaseUrlFromRequest(request: Request) {
  const forwardedProto = request.headers.get("x-forwarded-proto");
  const forwardedHost = request.headers.get("x-forwarded-host");
  const host = forwardedHost ?? request.headers.get("host");

  if (host) {
    return `${forwardedProto ?? (process.env.NODE_ENV === "development" ? "http" : "https")}://${host}`;
  }

  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL;
  }

  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }

  return "http://localhost:3000";
}

export function isPortalAdminRole(role: PortalRole | null | undefined) {
  return role === "owner" || role === "admin";
}

export async function getCurrentPortal() {
  const supabase = createClient();
  const portalSlug = getCurrentPortalSlugFromHeaders();
  const { data, error } = await supabase
    .from("portals")
    .select("id, slug, name, primary_domain, is_active")
    .eq("slug", portalSlug)
    .eq("is_active", true)
    .maybeSingle();

  if (error) {
    if (error.code === "42P01") {
      return null;
    }

    throw error;
  }

  return (data as Portal | null) ?? null;
}

export async function requireCurrentPortal() {
  const portal = await getCurrentPortal();

  if (!portal) {
    notFound();
  }

  return portal;
}
