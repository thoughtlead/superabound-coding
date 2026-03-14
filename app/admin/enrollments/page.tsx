import { createEnrollmentAction, updateEnrollmentStatusAction } from "@/app/admin/actions";
import { AppShell } from "@/components/app-shell";
import { EmptyState } from "@/components/empty-state";
import { SetupState } from "@/components/setup-state";
import { requireAdmin } from "@/utils/auth";
import { getAdminEnrollmentDashboard } from "@/utils/library";

type AdminEnrollmentsPageProps = {
  searchParams?: {
    message?: string;
  };
};

export default async function AdminEnrollmentsPage({
  searchParams,
}: AdminEnrollmentsPageProps) {
  await requireAdmin();
  const { courses, users, enrollments, setupRequired } = await getAdminEnrollmentDashboard();

  return (
    <AppShell
      title="Enrollments"
      eyebrow="Admin"
      showAdmin
      actions={<span className="stat-chip">{enrollments.length} records</span>}
    >
      {searchParams?.message ? <p className="form-status">{searchParams.message}</p> : null}
      {setupRequired ? <SetupState /> : null}

      {!setupRequired ? (
        <section className="panel lesson-panel">
          <h2>Grant course access</h2>
          <form action={createEnrollmentAction} className="editor-form stack">
            <div className="field-grid">
              <div>
                <label htmlFor="enrollment-user">Member</label>
                <select defaultValue="" id="enrollment-user" name="userId" required>
                  <option disabled value="">
                    Select a user
                  </option>
                  {users.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.fullName ?? user.email} ({user.email})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="enrollment-course">Course</label>
                <select defaultValue="" id="enrollment-course" name="courseId" required>
                  <option disabled value="">
                    Select a course
                  </option>
                  {courses.map((course) => (
                    <option key={course.id} value={course.id}>
                      {course.title} ({course.status})
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <p className="form-note">
              This grants immediate library access. Re-running it for the same user and course
              restores a revoked enrollment.
            </p>
            <div className="panel-actions">
              <button type="submit">Grant access</button>
            </div>
          </form>
        </section>
      ) : null}

      {!setupRequired && users.length === 0 ? (
        <EmptyState
          title="No users yet"
          body="Create or invite users first so they can be enrolled into courses."
        />
      ) : null}

      {!setupRequired && enrollments.length > 0 ? (
        <section className="stack">
          {enrollments.map((enrollment) => {
            const toggleEnrollment = updateEnrollmentStatusAction.bind(
              null,
              enrollment.id,
              enrollment.status === "active" ? "revoked" : "active",
            );

            return (
              <article key={enrollment.id} className="panel lesson-panel">
                <div className="row-spread">
                  <div className="stack stack-tight">
                    <div>
                      <p className="eyebrow">Member</p>
                      <h2>{enrollment.user.fullName ?? enrollment.user.email}</h2>
                      <p>{enrollment.user.email}</p>
                    </div>
                    <div>
                      <p className="eyebrow">Course</p>
                      <p>{enrollment.course.title}</p>
                    </div>
                  </div>
                  <div className="stack stack-tight">
                    <span className="pill">{enrollment.status}</span>
                    <span className="stat-chip">{enrollment.course.status}</span>
                  </div>
                </div>
                <div className="panel-actions">
                  <form action={toggleEnrollment}>
                    <button
                      className="button button-secondary"
                      type="submit"
                    >
                      {enrollment.status === "active" ? "Revoke" : "Restore"}
                    </button>
                  </form>
                </div>
              </article>
            );
          })}
        </section>
      ) : null}
    </AppShell>
  );
}
