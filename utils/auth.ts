import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";

export type AppRole = "admin" | "member";

export type Profile = {
  id: string;
  role: AppRole;
  full_name: string | null;
};

type ProfileRow = {
  id: string;
  role: AppRole;
  full_name: string | null;
};

export async function requireUser() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return { supabase, user };
}

export async function getCurrentProfile(userId: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, role, full_name")
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

export async function requireAdmin() {
  const { supabase, user } = await requireUser();
  const profile = await getCurrentProfile(user.id);

  if (profile?.role !== "admin") {
    redirect("/library");
  }

  return { supabase, user, profile };
}
