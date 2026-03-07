import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { MediaBlock } from "@/components/media-block";
import { SetupState } from "@/components/setup-state";
import { requireUser } from "@/utils/auth";
import { getAccessibleCourse, getLessonContent } from "@/utils/library";

type LessonPageProps = {
  params: {
    courseSlug: string;
    lessonSlug: string;
  };
};

export default async function LessonPage({ params }: LessonPageProps) {
  const { user } = await requireUser();
  const courseState = await getAccessibleCourse(user.id, params.courseSlug);

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

  return (
    <AppShell
      title={lesson.title}
      eyebrow={`${course.title} / ${activeLesson.moduleTitle}`}
      actions={
        <Link className="button button-secondary" href={`/library/${course.slug}`}>
          Course outline
        </Link>
      }
    >
      <section className="lesson-layout">
        <div className="stack">
          {lesson.summary ? (
            <section className="panel lesson-panel">
              <p className="lede">{lesson.summary}</p>
            </section>
          ) : null}
          {lesson.blocks.map((block) => (
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
          <h2>Up next</h2>
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
        </aside>
      </section>
    </AppShell>
  );
}
