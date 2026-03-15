import { redirect } from "next/navigation";

export default function ConfirmEmailPage() {
  redirect("/login?message=Account+creation+is+invite-only.");
}
