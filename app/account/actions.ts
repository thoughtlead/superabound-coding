"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/utils/auth";

function withMessage(path: string, message: string) {
  const url = new URL(path, "http://localhost");
  url.searchParams.set("message", message);
  url.searchParams.set("_r", String(Date.now()));
  return `${url.pathname}${url.search}`;
}

export async function updateOwnNameAction(formData: FormData) {
  const { supabase, user } = await requireUser();
  const fullName = String(formData.get("fullName") ?? "").trim();

  if (!fullName) {
    redirect(withMessage("/account", "Name is required."));
  }

  const { error } = await supabase
    .from("profiles")
    .update({ full_name: fullName })
    .eq("id", user.id);

  if (error) {
    redirect(withMessage("/account", error.message));
  }

  revalidatePath("/account");
  redirect(withMessage("/account", "Name updated."));
}

export async function logoutAction() {
  const { supabase } = await requireUser();
  await supabase.auth.signOut();
  redirect("/login");
}
