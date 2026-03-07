import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { EmptyState } from "@/components/empty-state";
import { SetupState } from "@/components/setup-state";
import { requireAdmin } from "@/utils/auth";
import { getAdminCourses } from "@/utils/library";

export default async function AdminCoursesPage() {
  await requireAdmin();
  const { courses, setupRequired } = await getAdminCourses();

  return (
    <AppShell
      title="Course admin"
      eyebrow="Admin"
      showAdmin
      actions={<span className="stat-chip">{courses.length} courses</span>}
    >
      {setupRequired ? <SetupState /> : null}
      {!setupRequired && courses.length === 0 ? (
        <EmptyState
          title="No courses yet"
          body="Create your first course row in Supabase after applying the schema. This page is wired for admin management."
        />
      ) : null}
      {!setupRequired ? (
        <section className="stack">
          {courses.map((course) => (
            <Link
              key={course.id}
              className="panel admin-course-row"
              href={`/admin/courses/${course.slug}`}
            >
              <div>
                <p className="eyebrow">Course</p>
                <h2>{course.title}</h2>
                {course.subtitle ? <p>{course.subtitle}</p> : null}
              </div>
              <span className="pill">{course.status}</span>
            </Link>
          ))}
        </section>
      ) : null}
    </AppShell>
  );
}
