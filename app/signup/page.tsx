import { redirect } from "next/navigation";
export default function SignUpPage() {
  redirect("/login?message=Account+creation+is+invite-only.");
}
