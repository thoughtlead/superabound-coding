import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";

type ForgotPasswordPageProps = {
  searchParams?: {
    message?: string;
  };
};

export default async function ForgotPasswordPage({
  searchParams,
}: ForgotPasswordPageProps) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/account/password");
  }

  return (
    <div className="login-wrap">
      <main className="panel login-card">
        <p className="eyebrow">Superabound</p>
        <h1>Reset password</h1>
        <p>Request a reset link for your account.</p>
        <form action="/auth/forgot-password" method="post">
          <label htmlFor="email">Email</label>
          <input id="email" name="email" type="email" autoComplete="email" required />

          <button type="submit">Send reset link</button>
          <p className="form-note">
            Return to <Link href="/login">sign in</Link>.
          </p>
          {searchParams?.message ? (
            <p className="form-status">{searchParams.message}</p>
          ) : null}
        </form>
      </main>
    </div>
  );
}
