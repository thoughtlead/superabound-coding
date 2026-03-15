import { AppShell } from "@/components/app-shell";
import { getCurrentPortalProfile } from "@/utils/auth";
import { EmailForm } from "@/app/account/email/email-form";

export default async function AccountEmailPage() {
  const { user, isPortalAdmin } = await getCurrentPortalProfile();

  return (
    <AppShell
      title="Change email"
      eyebrow="Account security"
      showAdmin={isPortalAdmin}
    >
      <section className="panel lesson-panel">
        <p className="form-note">
          Update the email address used to sign in to your library account.
        </p>
        <p className="form-note">
          If secure email change is enabled in Supabase, you must confirm the change from both your
          current email and your new email before the sign-in address updates.
        </p>
        <p className="form-note">
          After confirmation, this app will sync your profile email automatically.
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
