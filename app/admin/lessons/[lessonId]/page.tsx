import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { MediaBlock } from "@/components/media-block";
import { SetupState } from "@/components/setup-state";
import { requireAdmin } from "@/utils/auth";
import { getLessonContent } from "@/utils/library";

type AdminLessonPageProps = {
  params: {
    lessonId: string;
  };
};

export default async function AdminLessonPage({ params }: AdminLessonPageProps) {
  await requireAdmin();
  const { lesson, setupRequired } = await getLessonContent(params.lessonId);

  if (setupRequired) {
    return (
      <AppShell title="Admin setup" eyebrow="Lesson editor">
        <SetupState />
      </AppShell>
    );
  }

  if (!lesson) {
    notFound();
  }

  return (
    <AppShell title={lesson.title} eyebrow="Admin / Lesson editor" showAdmin>
      <section className="lesson-layout">
        <div className="stack">
          <section className="panel lesson-panel">
            <h2>Lesson summary</h2>
            <p>{lesson.summary ?? "No summary yet."}</p>
          </section>
          {lesson.blocks.map((block) => (
            <MediaBlock key={block.id} block={block} />
          ))}
          <section className="panel lesson-panel">
            <h2>Downloads</h2>
            {lesson.downloads.length > 0 ? (
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
                    <span className="row-link">Open</span>
                  </a>
                ))}
              </div>
            ) : (
              <p>No downloads attached.</p>
            )}
          </section>
        </div>
        <aside className="panel sidebar-panel">
          <h2>Next admin step</h2>
          <p>
            This is the first editor scaffold. The next implementation pass should add forms for
            course creation, module ordering, lesson editing, and upload actions.
          </p>
        </aside>
      </section>
    </AppShell>
  );
}
