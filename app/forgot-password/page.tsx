import { redirect } from "next/navigation";
import { ForgotPasswordForm } from "@/app/forgot-password/forgot-password-form";
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
        <ForgotPasswordForm message={searchParams?.message} />
      </main>
    </div>
  );
}
