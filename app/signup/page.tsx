import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";

type SignUpPageProps = {
  searchParams?: {
    message?: string;
  };
};

export default async function SignUpPage({ searchParams }: SignUpPageProps) {
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
        <h1>Create your account</h1>
        <p>Create a password-based account. Course access is still controlled by enrollment.</p>
        <form action="/auth/sign-up" method="post">
          <label htmlFor="fullName">Name</label>
          <input id="fullName" name="fullName" type="text" autoComplete="name" />

          <label htmlFor="email">Email</label>
          <input id="email" name="email" type="email" autoComplete="email" required />

          <label htmlFor="password">Password</label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            minLength={8}
            required
          />

          <button type="submit">Create account</button>
          <p className="form-note">
            Already have an account? <Link href="/login">Sign in</Link>.
          </p>
          {searchParams?.message ? (
            <p className="form-status">{searchParams.message}</p>
          ) : null}
        </form>
      </main>
    </div>
  );
}
