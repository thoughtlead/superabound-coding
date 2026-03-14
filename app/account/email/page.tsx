import { AppShell } from "@/components/app-shell";
import { getCurrentProfile, requireUser } from "@/utils/auth";
import { EmailForm } from "@/app/account/email/email-form";

export default async function AccountEmailPage() {
  const { user } = await requireUser();
  const profile = await getCurrentProfile(user.id);

  return (
    <AppShell
      title="Change email"
      eyebrow="Account security"
      showAdmin={profile?.role === "admin"}
    >
      <section className="panel lesson-panel">
        <p className="form-note">
          Update the email address used to sign in to your library account. Supabase may require
          you to confirm the new email before it becomes active.
        </p>
        <EmailForm
          currentEmail={user.email ?? ""}
          submitLabel="Update email"
          successRedirect="/account"
        />
      </section>
    </AppShell>
  );
}
