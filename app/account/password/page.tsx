import { AppShell } from "@/components/app-shell";
import { getCurrentProfile, requireUser } from "@/utils/auth";
import { PasswordForm } from "@/app/account/password/password-form";

export default async function AccountPasswordPage() {
  const { user } = await requireUser();
  const profile = await getCurrentProfile(user.id);

  return (
    <AppShell
      title="Change password"
      eyebrow="Account security"
      showAdmin={profile?.role === "admin"}
    >
      <section className="panel lesson-panel">
        <p className="form-note">
          Update the password used to sign in to your library account.
        </p>
        <PasswordForm submitLabel="Update password" successRedirect="/account" />
      </section>
    </AppShell>
  );
}
