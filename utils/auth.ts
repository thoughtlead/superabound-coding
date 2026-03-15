import { notFound, redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import {
  type Portal,
  type PortalMembership,
  isPortalAdminRole,
  requireCurrentPortal,
} from "@/utils/portal";

export type AppRole = "admin" | "member";

export type Profile = {
  id: string;
  role: AppRole;
  full_name: string | null;
  email: string;
};

type ProfileRow = {
  id: string;
  role: AppRole;
  full_name: string | null;
  email: string;
};

type PortalMembershipRow = PortalMembership;

export async function requireUser() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const portal = await requireCurrentPortal();
  const membership = await getPortalMembership(user.id, portal.id, supabase);

  if (!membership) {
    redirect("/login?message=You+do+not+have+access+to+this+portal.");
  }

  return { supabase, user, portal, membership };
}

export async function getCurrentProfile(userId: string, supabase = createClient()) {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, role, full_name, email")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    if (error.code === "42P01") {
      return null;
    }

    throw error;
  }

  if (!data) {
    return null;
  }

  return data as ProfileRow;
}

export async function getPortalMembership(
  userId: string,
  portalId: string,
  supabase = createClient(),
) {
  const { data, error } = await supabase
    .from("portal_memberships")
    .select("portal_id, user_id, role")
    .eq("portal_id", portalId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    if (error.code === "42P01") {
      return null;
    }

    throw error;
  }

  return (data as PortalMembershipRow | null) ?? null;
}

export async function getCurrentPortalProfile() {
  const { supabase, user, portal, membership } = await requireUser();
  const profile = await getCurrentProfile(user.id, supabase);

  return {
    supabase,
    user,
    portal,
    membership,
    profile,
    isPortalAdmin: isPortalAdminRole(membership.role),
  };
}

export async function requireAdmin() {
  const state = await getCurrentPortalProfile();

  if (!isPortalAdminRole(state.membership.role)) {
    redirect("/library");
  }

  return state;
}

export async function requirePortalForRequest() {
  const portal = await requireCurrentPortal();

  if (!portal) {
    notFound();
  }

  return portal as Portal;
}
