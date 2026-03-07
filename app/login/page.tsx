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
        <h1>Enter the library</h1>
        <p>Sign in with the email already associated with your membership.</p>
        <LoginForm />
        {searchParams?.message ? <p>{searchParams.message}</p> : null}
      </main>
    </div>
  );
}
