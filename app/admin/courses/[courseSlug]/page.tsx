import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { SetupState } from "@/components/setup-state";
import { requireAdmin } from "@/utils/auth";
import { getAdminCourse, getCourseLessonCount } from "@/utils/library";

type AdminCoursePageProps = {
  params: {
    courseSlug: string;
  };
};

export default async function AdminCoursePage({ params }: AdminCoursePageProps) {
  await requireAdmin();
  const { course, setupRequired } = await getAdminCourse(params.courseSlug);

  if (setupRequired) {
    return (
      <AppShell title="Admin setup" eyebrow="Courses">
        <SetupState />
      </AppShell>
    );
  }

  if (!course) {
    notFound();
  }

  return (
    <AppShell
      title={course.title}
      eyebrow="Admin / Course outline"
      showAdmin
      actions={<span className="stat-chip">{getCourseLessonCount(course)} lessons</span>}
    >
      <section className="hero panel">
        <div className="hero-copy">
          {course.subtitle ? <p className="lede">{course.subtitle}</p> : null}
          {course.description ? <p>{course.description}</p> : null}
        </div>
        <div className="stack stack-tight">
          <span className="pill">{course.status}</span>
          <p className="admin-note">
            Lesson editing is structured as a dedicated screen so video, text, and downloads can grow independently.
          </p>
        </div>
      </section>
      <section className="stack">
        {course.modules.map((moduleItem) => (
          <article key={moduleItem.id} className="panel module-card">
            <div className="module-head">
              <div>
                <p className="eyebrow">Module {moduleItem.position + 1}</p>
                <h2>{moduleItem.title}</h2>
                {moduleItem.description ? <p>{moduleItem.description}</p> : null}
              </div>
            </div>
            <div className="lesson-list">
              {moduleItem.lessons.map((lesson) => (
                <Link
                  key={lesson.id}
                  className="lesson-row"
                  href={`/admin/lessons/${lesson.id}`}
                >
                  <div>
                    <span className="lesson-index">{lesson.position + 1}</span>
                    <div>
                      <h3>{lesson.title}</h3>
                      {lesson.summary ? <p>{lesson.summary}</p> : null}
                    </div>
                  </div>
                  <span className="row-link">Edit</span>
                </Link>
              ))}
            </div>
          </article>
        ))}
      </section>
    </AppShell>
  );
}
