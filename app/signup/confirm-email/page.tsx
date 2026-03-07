import Link from "next/link";

type ConfirmEmailPageProps = {
  searchParams?: {
    email?: string;
  };
};

export default function ConfirmEmailPage({
  searchParams,
}: ConfirmEmailPageProps) {
  return (
    <div className="login-wrap">
      <main className="panel login-card">
        <p className="eyebrow">Superabound</p>
        <h1>Confirm your email</h1>
        <p>
          We sent a confirmation link to{" "}
          <strong>{searchParams?.email ?? "your email address"}</strong>.
        </p>
        <p className="form-note">
          Open that email, click the confirmation link, then return to{" "}
          <Link href="/login">sign in</Link>.
        </p>
        <p className="form-note">
          If you do not see it, check spam or promotions.
        </p>
      </main>
    </div>
  );
}
