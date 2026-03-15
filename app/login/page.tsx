import Link from "next/link";
import { redirect } from "next/navigation";
import { LoginForm } from "@/app/login/login-form";
import { createClient } from "@/utils/supabase/server";

type LoginPageProps = {
  searchParams?: {
    message?: string;
  };
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/library");
  }

  return (
    <div className="login-wrap">
      <main className="panel login-card">
        <p className="eyebrow">Superabound</p>
        <h1>Welcome to the Superabound Library</h1>
        <p>Sign in with the email and password associated with your invited account.</p>
        <LoginForm message={searchParams?.message} />
        <p className="form-note">
          New invited member? Use the link in your invite email to create your password.
        </p>
      </main>
    </div>
  );
}
