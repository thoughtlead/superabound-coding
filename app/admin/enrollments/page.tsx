import {
  createEnrollmentAction,
  inviteMemberAction,
  sendMemberSetupEmailAction,
  updateEnrollmentStatusAction,
  updateUserNameAction,
} from "@/app/admin/actions";
import { AppShell } from "@/components/app-shell";
import { EmptyState } from "@/components/empty-state";
import { MemberSearch } from "@/components/member-search";
import { SetupState } from "@/components/setup-state";
import { requireAdmin } from "@/utils/auth";
import { getAdminEnrollmentDashboard } from "@/utils/library";
import Link from "next/link";

type AdminEnrollmentsPageProps = {
  searchParams?: {
    memberId?: string;
    message?: string;
    page?: string;
    q?: string;
  };
};

export default async function AdminEnrollmentsPage({
  searchParams,
}: AdminEnrollmentsPageProps) {
  await requireAdmin();
  const currentPage = Number(searchParams?.page ?? "1");
  const query = searchParams?.q ?? "";
  const memberId = searchParams?.memberId ?? "";
  const {
    courses,
    users,
    enrollments,
    setupRequired,
    totalUsers,
    totalPages,
  } = await getAdminEnrollmentDashboard({
    memberId,
    page: currentPage,
    query,
  });
  const enrollmentsByUser = new Map(
    users.map((user) => [
      user.id,
      {
        user,
        enrollments: enrollments
          .filter((enrollment) => enrollment.user.id === user.id)
          .sort((left, right) => left.course.title.localeCompare(right.course.title)),
      },
    ]),
  );

  const createPageHref = (page: number) => {
    const params = new URLSearchParams();

    if (query) {
      params.set("q", query);
    }

    if (memberId) {
      params.set("memberId", memberId);
    }

    if (page > 1) {
      params.set("page", String(page));
    }

    const search = params.toString();
    return search ? `/admin/enrollments?${search}` : "/admin/enrollments";
  };

  return (
    <AppShell
      title="Enrollments"
      eyebrow="Admin"
      showAdmin
      actions={
        <>
          <span className="stat-chip">{totalUsers} members</span>
        </>
      }
    >
      {searchParams?.message ? <p className="form-status">{searchParams.message}</p> : null}
      {setupRequired ? <SetupState /> : null}

      {!setupRequired ? (
        <section className="panel lesson-panel">
          <div className="row-spread section-header">
            <div>
              <p className="eyebrow">Members</p>
              <h2>Search and manage</h2>
            </div>
            {!query && !memberId ? <span className="stat-chip">50 per page</span> : null}
          </div>
          <MemberSearch />
        </section>
      ) : null}

      {!setupRequired && !memberId ? (
        <section className="panel lesson-panel">
          <h2>Invite member</h2>
          <form action={inviteMemberAction} className="editor-form stack">
            <div className="field-grid">
              <div>
                <label htmlFor="invite-full-name">Full name</label>
                <input id="invite-full-name" name="fullName" required type="text" />
              </div>
              <div>
                <label htmlFor="invite-email">Email</label>
                <input
                  autoComplete="email"
                  id="invite-email"
                  name="email"
                  required
                  type="email"
                />
              </div>
            </div>
            <div className="stack stack-tight">
              <div>
                <p className="eyebrow">Course access</p>
                <h3>Enable courses immediately</h3>
              </div>
              <div className="checkbox-grid">
                {courses.map((course) => (
                  <label key={course.id} className="checkbox-card">
                    <input name="courseIds" type="checkbox" value={course.id} />
                    <span className="checkbox-copy">
                      <strong>{course.title}</strong>
                      <span>{course.status}</span>
                    </span>
                  </label>
                ))}
              </div>
            </div>
            <p className="form-note">
              The invite email signs the member in and takes them to password setup before they
              use the library.
            </p>
            <div className="panel-actions">
              <button type="submit">Invite member</button>
            </div>
          </form>
        </section>
      ) : null}

      {!setupRequired && users.length === 0 ? (
        <EmptyState
          title={query || memberId ? "No matching members" : "No users yet"}
          body={
            query || memberId
              ? "Try a different name or email search."
              : "Create or invite users first so they can be enrolled into courses."
          }
        />
      ) : null}

      {!setupRequired && users.length > 0 ? (
        <section className="stack">
          {users.map((user) => {
            const group = enrollmentsByUser.get(user.id) ?? {
              user,
              enrollments: [],
            };
            const updateUserName = updateUserNameAction.bind(null, group.user.id);
            const sendSetupEmail = sendMemberSetupEmailAction.bind(null, group.user.id);

            return (
              <article key={group.user.id} className="panel lesson-panel member-admin-card">
                <div className="member-admin-head">
                  <div className="member-admin-meta">
                    <div>
                      <h3>{group.user.fullName ?? group.user.email}</h3>
                      <p>{group.user.email}</p>
                    </div>
                    <span className="stat-chip">{group.enrollments.length} courses</span>
                  </div>
                  <form action={updateUserName} className="member-name-form">
                    <input
                      name="returnTo"
                      type="hidden"
                      value={memberId ? `/admin/enrollments?memberId=${memberId}` : createPageHref(currentPage)}
                    />
                    <div className="member-name-field">
                      <label htmlFor={`member-name-${group.user.id}`}>Display name</label>
                      <div className="member-name-controls">
                        <input
                          defaultValue={group.user.fullName ?? ""}
                          id={`member-name-${group.user.id}`}
                          name="fullName"
                          required
                          type="text"
                        />
                        <button className="button button-secondary" type="submit">
                          Save member name
                        </button>
                      </div>
                    </div>
                  </form>
                </div>
                <div className="inline-actions member-admin-tools">
                  <form action={sendSetupEmail}>
                    <input
                      name="returnTo"
                      type="hidden"
                      value={`/admin/enrollments?memberId=${group.user.id}`}
                    />
                    <button className="button button-secondary" type="submit">
                      Send setup email
                    </button>
                  </form>
                </div>
                <div className="member-course-list">
                  <form action={createEnrollmentAction} className="member-course-enable">
                    <input name="returnTo" type="hidden" value={`/admin/enrollments?memberId=${group.user.id}`} />
                    <input name="userId" type="hidden" value={group.user.id} />
                    <select defaultValue="" name="courseId" required>
                      <option disabled value="">
                        Enable another course
                      </option>
                      {courses.map((course) => (
                        <option key={course.id} value={course.id}>
                          {course.title} ({course.status})
                        </option>
                      ))}
                    </select>
                    <button className="button button-secondary" type="submit">
                      Enable course
                    </button>
                  </form>
                  {group.enrollments.length > 0 ? (
                    group.enrollments.map((enrollment) => {
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
                            <input
                              name="returnTo"
                              type="hidden"
                              value={`/admin/enrollments?memberId=${group.user.id}`}
                            />
                            <button className="button button-secondary" type="submit">
                              {enrollment.status === "active" ? "Remove access" : "Enable course"}
                            </button>
                          </form>
                        </div>
                      </div>
                    );
                    })
                  ) : (
                    <div className="empty-copy">
                      <p>No courses enabled yet.</p>
                    </div>
                  )}
                </div>
              </article>
            );
          })}
          {!memberId ? (
          <div className="pagination-row">
            <span className="form-note">
              Page {Math.min(currentPage, totalPages)} of {totalPages}
            </span>
            <div className="inline-actions">
              {currentPage > 1 ? (
                <Link className="button button-secondary" href={createPageHref(currentPage - 1)}>
                  Previous 50
                </Link>
              ) : null}
              {currentPage < totalPages ? (
                <Link className="button button-secondary" href={createPageHref(currentPage + 1)}>
                  Next 50
                </Link>
              ) : null}
            </div>
          </div>
          ) : null}
        </section>
      ) : null}
    </AppShell>
  );
}
