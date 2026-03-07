import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { getCurrentProfile, requireUser } from "@/utils/auth";
import { getMemberCourses } from "@/utils/library";

export default async function AccountPage() {
  const { user } = await requireUser();
  const profile = await getCurrentProfile(user.id);
  const { courses, setupRequired } = await getMemberCourses(user.id);

  async function logout() {
    "use server";

    const { supabase } = await requireUser();
    await supabase.auth.signOut();
    redirect("/login");
  }

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
      <section className="panel stack stack-tight">
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
        <form action={logout}>
          <button type="submit">Log out</button>
        </form>
      </section>
    </AppShell>
  );
}
