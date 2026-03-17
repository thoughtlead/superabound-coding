/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { SetupState } from "@/components/setup-state";
import { getCurrentPortalProfile } from "@/utils/auth";
import { getAccessibleCourse, getCourseLessonCount } from "@/utils/library";

type CoursePageProps = {
  params: {
    courseSlug: string;
  };
};

export default async function CoursePage({ params }: CoursePageProps) {
  const { user, isPortalAdmin } = await getCurrentPortalProfile();
  const { course, setupRequired } = await getAccessibleCourse(
    user.id,
    params.courseSlug,
    isPortalAdmin,
  );

  if (setupRequired) {
    return (
      <AppShell title="Course setup" eyebrow="Library">
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
      eyebrow="Course"
      actions={<span className="stat-chip">{getCourseLessonCount(course)} lessons</span>}
    >
      <section className="hero panel">
        <div className="hero-copy">
          {course.subtitle ? <p className="lede">{course.subtitle}</p> : null}
          {course.description ? <p>{course.description}</p> : null}
        </div>
        {course.thumbnailUrl ? (
          <img alt="" className="hero-image" src={course.thumbnailUrl} />
        ) : null}
      </section>

      <section className="stack">
        {course.modules.map((moduleItem) => (
          <article
            id={`module-${moduleItem.id}`}
            key={moduleItem.id}
            className="panel module-card"
          >
            <div className="module-head">
              <div>
                <p className="eyebrow">Topic {moduleItem.position + 1}</p>
                <h2>{moduleItem.title}</h2>
                {moduleItem.description ? <p>{moduleItem.description}</p> : null}
              </div>
              <span className="stat-chip">{moduleItem.lessons.length} lessons</span>
            </div>
            <div className="lesson-list">
              {moduleItem.lessons.map((lesson) => (
                <Link
                  key={lesson.id}
                  className="lesson-row"
                  href={`/library/${course.slug}/${lesson.slug}`}
                >
                  <div>
                    <span className="lesson-index">{lesson.position + 1}</span>
                    <div>
                      <h3>{lesson.title}</h3>
                      {lesson.summary ? <p>{lesson.summary}</p> : null}
                    </div>
                  </div>
                  <span className="row-link">Open</span>
                </Link>
              ))}
            </div>
          </article>
        ))}
      </section>
    </AppShell>
  );
}
