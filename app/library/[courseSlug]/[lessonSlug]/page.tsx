/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { MediaBlock } from "@/components/media-block";
import { SetupState } from "@/components/setup-state";
import { TrustedHtml } from "@/components/trusted-html";
import { getCurrentPortalProfile } from "@/utils/auth";
import { getAccessibleCourse, getLessonContent } from "@/utils/library";

type LessonPageProps = {
  params: {
    courseSlug: string;
    lessonSlug: string;
  };
};

export default async function LessonPage({ params }: LessonPageProps) {
  const { user, isPortalAdmin } = await getCurrentPortalProfile();
  const courseState = await getAccessibleCourse(
    user.id,
    params.courseSlug,
    isPortalAdmin,
  );

  if (courseState.setupRequired) {
    return (
      <AppShell title="Lesson setup" eyebrow="Library">
        <SetupState />
      </AppShell>
    );
  }

  const course = courseState.course;

  if (!course) {
    notFound();
  }

  const orderedLessons = course.modules.flatMap((moduleItem) =>
    moduleItem.lessons.map((lesson) => ({
      ...lesson,
      moduleTitle: moduleItem.title,
    })),
  );
  const activeIndex = orderedLessons.findIndex(
    (lesson) => lesson.slug === params.lessonSlug,
  );

  if (activeIndex === -1) {
    notFound();
  }

  const activeLesson = orderedLessons[activeIndex];
  const previousLesson = activeIndex > 0 ? orderedLessons[activeIndex - 1] : null;
  const nextLesson =
    activeIndex < orderedLessons.length - 1 ? orderedLessons[activeIndex + 1] : null;
  const activeModule =
    course.modules.find((moduleItem) =>
      moduleItem.lessons.some((lesson) => lesson.slug === params.lessonSlug),
    ) ?? null;

  const lessonState = await getLessonContent(activeLesson.id);

  if (lessonState.setupRequired) {
    return (
      <AppShell title="Lesson setup" eyebrow={course.title}>
        <SetupState />
      </AppShell>
    );
  }

  const lesson = lessonState.lesson;

  if (!lesson) {
    notFound();
  }

  const primaryVideoBlock = lesson.blocks.find((block) => block.type === "video") ?? null;
  const remainingBlocks = primaryVideoBlock
    ? lesson.blocks.filter((block) => block.id !== primaryVideoBlock.id)
    : lesson.blocks;

  return (
    <AppShell
      title={lesson.title}
      headerVariant="lesson"
      eyebrow={
        <>
          <Link className="eyebrow-link" href={`/library/${course.slug}`}>
            {course.title}
          </Link>
          {" / "}
          {activeModule ? (
            <Link
              className="eyebrow-link"
              href={`/library/${course.slug}#module-${activeModule.id}`}
            >
              {activeModule.title}
            </Link>
          ) : (
            <span>{activeLesson.moduleTitle}</span>
          )}
          {" / "}
          <span>{lesson.title}</span>
        </>
      }
      actions={
        <Link className="button button-secondary" href={`/library/${course.slug}`}>
          Course outline
        </Link>
      }
    >
      <section className="lesson-layout">
        <div className="stack">
          {primaryVideoBlock ? <MediaBlock block={primaryVideoBlock} variant="hero" /> : null}
          {!primaryVideoBlock && lesson.thumbnailUrl ? (
            <section className="lesson-thumbnail-panel">
              <img
                alt={lesson.title}
                className="lesson-thumbnail-image"
                src={lesson.thumbnailUrl}
              />
            </section>
          ) : null}
          {remainingBlocks.map((block) => (
            <MediaBlock key={block.id} block={block} />
          ))}
          {lesson.downloads.length > 0 ? (
            <section className="panel lesson-panel">
              <h2>Downloads</h2>
              <div className="download-list">
                {lesson.downloads.map((download) => (
                  <a
                    key={download.id}
                    className="download-row"
                    href={download.fileUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <span>{download.title}</span>
                    <span className="row-link">Download</span>
                  </a>
                ))}
              </div>
            </section>
          ) : null}
        </div>

        <aside className="panel sidebar-panel">
          <div className="stack stack-tight">
            {activeModule ? (
              <section className="stack stack-tight">
                <div>
                  <p className="eyebrow">Current topic</p>
                  <h2>{activeModule.title}</h2>
                  {activeModule.description ? (
                    <TrustedHtml className="trusted-html trusted-html-compact" html={activeModule.description} />
                  ) : null}
                </div>
                <div className="sidebar-lesson-list">
                  {activeModule.lessons.map((moduleLesson) => {
                    const isActive = moduleLesson.slug === params.lessonSlug;

                    return (
                      <Link
                        key={moduleLesson.id}
                        className={`sidebar-lesson-link${isActive ? " is-active" : ""}`}
                        href={`/library/${course.slug}/${moduleLesson.slug}`}
                      >
                        <span className="sidebar-lesson-copy">
                          <strong>{moduleLesson.title}</strong>
                          {moduleLesson.summary ? <span>{moduleLesson.summary}</span> : null}
                        </span>
                      </Link>
                    );
                  })}
                </div>
              </section>
            ) : null}

            <section className="stack stack-tight sidebar-nav-block">
              <h3>Lesson navigation</h3>
              <div className="stack stack-tight">
            {previousLesson ? (
              <Link
                className="button button-secondary"
                href={`/library/${course.slug}/${previousLesson.slug}`}
              >
                Previous: {previousLesson.title}
              </Link>
            ) : null}
            {nextLesson ? (
              <Link
                className="button"
                href={`/library/${course.slug}/${nextLesson.slug}`}
              >
                Next: {nextLesson.title}
              </Link>
            ) : null}
            {!previousLesson && !nextLesson ? (
              <p>This course currently has one lesson.</p>
            ) : null}
              </div>
            </section>
          </div>
        </aside>
      </section>
    </AppShell>
  );
}
