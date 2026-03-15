import { AppShell } from "@/components/app-shell";
import { PasswordForm } from "@/app/account/password/password-form";
import { getCurrentPortalProfile } from "@/utils/auth";

type CreateAccountPageProps = {
  searchParams?: {
    message?: string;
  };
};

export default async function CreateAccountPage({
  searchParams,
}: CreateAccountPageProps) {
  const { isPortalAdmin } = await getCurrentPortalProfile();

  return (
    <AppShell
      title="Create your account"
      eyebrow="Welcome"
      showAdmin={isPortalAdmin}
    >
      <section className="panel lesson-panel">
        {searchParams?.message ? <p className="form-status">{searchParams.message}</p> : null}
        <p className="form-note">
          Set your password to finish activating your invited portal account.
        </p>
        <PasswordForm submitLabel="Create password" successRedirect="/library" />
      </section>
    </AppShell>
  );
}
