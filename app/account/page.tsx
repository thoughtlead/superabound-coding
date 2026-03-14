import Link from "next/link";
import { logoutAction, updateOwnNameAction } from "@/app/account/actions";
import { AppShell } from "@/components/app-shell";
import { getCurrentProfile, requireUser } from "@/utils/auth";
import { getMemberCourses } from "@/utils/library";

type AccountPageProps = {
  searchParams?: {
    message?: string;
  };
};

export default async function AccountPage({ searchParams }: AccountPageProps) {
  const { user } = await requireUser();
  const profile = await getCurrentProfile(user.id);
  const { courses, setupRequired } = await getMemberCourses(user.id);

  return (
    <AppShell
      title="Account"
      eyebrow="Profile"
      showAdmin={profile?.role === "admin"}
      actions={
        profile?.role === "admin" ? (
          <Link className="button button-secondary" href="/admin/courses">
            Admin courses
          </Link>
        ) : null
      }
    >
      {searchParams?.message ? <p className="form-status">{searchParams.message}</p> : null}
      <section className="panel lesson-panel stack stack-tight">
        <div>
          <h2>{profile?.full_name ?? user.email}</h2>
          <p>{user.email}</p>
        </div>
        <div className="meta-grid">
          <div>
            <span className="meta-label">Role</span>
            <strong>{profile?.role ?? "member"}</strong>
          </div>
          <div>
            <span className="meta-label">Courses</span>
            <strong>{setupRequired ? "Setup required" : courses.length}</strong>
          </div>
        </div>
        <div className="page-actions">
          <Link className="button button-secondary" href="/account/email">
            Change email
          </Link>
          <Link className="button button-secondary" href="/account/password">
            Change password
          </Link>
        </div>
        <form action={updateOwnNameAction} className="editor-form stack">
          <div>
            <label htmlFor="account-full-name">Display name</label>
            <input
              defaultValue={profile?.full_name ?? ""}
              id="account-full-name"
              name="fullName"
              required
              type="text"
            />
          </div>
          <div className="panel-actions">
            <button type="submit">Save name</button>
          </div>
        </form>
        <form action={logoutAction} className="panel-actions">
          <button type="submit">Log out</button>
        </form>
      </section>
    </AppShell>
  );
}
