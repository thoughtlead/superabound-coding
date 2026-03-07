import Link from "next/link";
import { redirect } from "next/navigation";
import { PasswordForm } from "@/app/account/password/password-form";
import { createClient } from "@/utils/supabase/server";

export default async function ResetPasswordPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?message=Open the reset link from your email first.");
  }

  return (
    <div className="login-wrap">
      <main className="panel login-card">
        <p className="eyebrow">Superabound</p>
        <h1>Choose a new password</h1>
        <p>Set the password you will use for future sign-ins.</p>
        <PasswordForm submitLabel="Save password" successRedirect="/library" />
        <p className="form-note">
          Return to <Link href="/login">sign in</Link>.
        </p>
      </main>
    </div>
  );
}
