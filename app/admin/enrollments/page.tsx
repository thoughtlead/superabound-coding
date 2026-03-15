import {
  createEnrollmentAction,
  updateEnrollmentStatusAction,
  updateUserNameAction,
} from "@/app/admin/actions";
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
  const enrollmentsByUser = Array.from(
    enrollments.reduce((groups, enrollment) => {
      const existing = groups.get(enrollment.user.id);

      if (existing) {
        existing.enrollments.push(enrollment);
        return groups;
      }

      groups.set(enrollment.user.id, {
        user: enrollment.user,
        enrollments: [enrollment],
      });
      return groups;
    }, new Map<
      string,
      {
        user: (typeof enrollments)[number]["user"];
        enrollments: typeof enrollments;
      }
    >()),
  ).map(([, group]) => ({
    user: group.user,
    enrollments: group.enrollments.sort((left, right) =>
      left.course.title.localeCompare(right.course.title),
    ),
  }));

  return (
    <AppShell
      title="Enrollments"
      eyebrow="Admin"
      showAdmin
      actions={
        <>
          <span className="stat-chip">{enrollmentsByUser.length} members</span>
          <span className="stat-chip">{enrollments.length} records</span>
        </>
      }
    >
      {searchParams?.message ? <p className="form-status">{searchParams.message}</p> : null}
      {setupRequired ? <SetupState /> : null}

      {!setupRequired ? (
        <section className="panel lesson-panel">
          <h2>Enable course access</h2>
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
              This enables immediate library access. Re-running it for the same user and course
              re-enables a removed enrollment.
            </p>
            <div className="panel-actions">
              <button type="submit">Enable course</button>
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

      {!setupRequired && enrollmentsByUser.length > 0 ? (
        <section className="stack">
          {enrollmentsByUser.map((group) => {
            const updateUserName = updateUserNameAction.bind(null, group.user.id);

            return (
              <article key={group.user.id} className="panel lesson-panel">
                <div className="row-spread">
                  <div className="stack stack-tight">
                    <div>
                      <p className="eyebrow">Member</p>
                      <h2>{group.user.fullName ?? group.user.email}</h2>
                      <p>{group.user.email}</p>
                    </div>
                    <form action={updateUserName} className="editor-form stack stack-tight">
                      <div>
                        <label htmlFor={`member-name-${group.user.id}`}>Display name</label>
                        <input
                          defaultValue={group.user.fullName ?? ""}
                          id={`member-name-${group.user.id}`}
                          name="fullName"
                          required
                          type="text"
                        />
                      </div>
                      <div className="panel-actions">
                        <button className="button button-secondary" type="submit">
                          Save member name
                        </button>
                      </div>
                    </form>
                  </div>
                  <div className="stack stack-tight">
                    <span className="stat-chip">{group.enrollments.length} courses</span>
                  </div>
                </div>
                <div className="stack stack-tight">
                  {group.enrollments.map((enrollment) => {
                    const toggleEnrollment = updateEnrollmentStatusAction.bind(
                      null,
                      enrollment.id,
                      enrollment.status === "active" ? "revoked" : "active",
                    );

                    return (
                      <div key={enrollment.id} className="lesson-row">
                        <div>
                          <div>
                            <h3>{enrollment.course.title}</h3>
                            <p>
                              {enrollment.course.status} course · {enrollment.status} access
                            </p>
                          </div>
                        </div>
                        <div className="inline-actions">
                          <span className="pill">{enrollment.status}</span>
                          <form action={toggleEnrollment}>
                            <button className="button button-secondary" type="submit">
                              {enrollment.status === "active" ? "Remove access" : "Enable course"}
                            </button>
                          </form>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </article>
            );
          })}
        </section>
      ) : null}
    </AppShell>
  );
}
