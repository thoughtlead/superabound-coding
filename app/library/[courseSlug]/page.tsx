/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { SetupState } from "@/components/setup-state";
import { TrustedHtml } from "@/components/trusted-html";
import { getCurrentPortalProfile } from "@/utils/auth";
import { getAccessibleCourse, getAdminCourse, getCourseLessonCount } from "@/utils/library";

type CoursePageProps = {
  params: {
    courseSlug: string;
  };
  searchParams?: {
    preview?: string;
  };
};

export default async function CoursePage({ params, searchParams }: CoursePageProps) {
  const { user, isPortalAdmin } = await getCurrentPortalProfile();
  const isMemberPreview = searchParams?.preview === "member" && isPortalAdmin;
  const courseState = isMemberPreview
    ? await getAdminCourse(params.courseSlug, true)
    : await getAccessibleCourse(user.id, params.courseSlug, isPortalAdmin);
  const { course, setupRequired } = courseState;
  const previewSuffix = isMemberPreview ? "?preview=member" : "";

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
      headerVariant="course"
      eyebrow="Course"
      actions={<span className="stat-chip">{getCourseLessonCount(course)} lessons</span>}
    >
      <section className={`hero-shell${course.thumbnailUrl ? "" : " hero-shell-text-only"}`}>
        <section className="hero panel hero-copy-panel">
          <div className="hero-copy">
            {course.subtitle ? <p className="lede">{course.subtitle}</p> : null}
            {course.description ? (
              <TrustedHtml className="trusted-html trusted-html-description" html={course.description} />
            ) : null}
          </div>
        </section>
        {course.thumbnailUrl ? (
          <section className="hero panel hero-art-panel">
            <img alt="" className="hero-image" src={course.thumbnailUrl} />
          </section>
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
                <p className="eyebrow">Topic</p>
                <h2>{moduleItem.title}</h2>
                {moduleItem.description ? (
                  <TrustedHtml className="trusted-html trusted-html-compact" html={moduleItem.description} />
                ) : null}
              </div>
              <span className="stat-chip">{moduleItem.lessons.length} lessons</span>
            </div>
            <div className="lesson-list">
              {moduleItem.lessons.map((lesson) => (
                <Link
                  key={lesson.id}
                  className="lesson-row"
                  href={`/library/${course.slug}/${lesson.slug}${previewSuffix}`}
                >
                  <div>
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
