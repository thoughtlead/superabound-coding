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
    <main>
      <h1>Login</h1>
      <p>Sign in with your email using a magic link.</p>
      <LoginForm />
      {searchParams?.message ? <p>{searchParams.message}</p> : null}
    </main>
  );
}
