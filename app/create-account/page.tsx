import { AppShell } from "@/components/app-shell";
import { PasswordForm } from "@/app/account/password/password-form";
import { getCurrentProfile, requireUser } from "@/utils/auth";

type CreateAccountPageProps = {
  searchParams?: {
    message?: string;
  };
};

export default async function CreateAccountPage({
  searchParams,
}: CreateAccountPageProps) {
  const { user } = await requireUser();
  const profile = await getCurrentProfile(user.id);

  return (
    <AppShell
      title="Create your account"
      eyebrow="Welcome"
      showAdmin={profile?.role === "admin"}
    >
      <section className="panel lesson-panel">
        {searchParams?.message ? <p className="form-status">{searchParams.message}</p> : null}
        <p className="form-note">
          Set your password to finish activating your invited Superabound Library account.
        </p>
        <PasswordForm submitLabel="Create password" successRedirect="/library" />
      </section>
    </AppShell>
  );
}
