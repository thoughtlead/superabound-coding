import Link from "next/link";
import { notFound } from "next/navigation";
import {
  createBlockAction,
  createDownloadAction,
  deleteBlockAction,
  deleteDownloadAction,
  deleteLessonAction,
  moveBlockDownAction,
  moveBlockUpAction,
  updateBlockAction,
  updateDownloadAction,
  updateLessonAction,
} from "@/app/admin/actions";
import { AddContentBlockSection } from "@/components/add-content-block-section";
import { AddLessonDownloadSection } from "@/components/add-lesson-download-section";
import { AppShell } from "@/components/app-shell";
import { BlockEditorForm } from "@/components/block-editor-form";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import { DownloadEditorForm } from "@/components/download-editor-form";
import { SetupState } from "@/components/setup-state";
import { StorageUploadField } from "@/components/storage-upload-field";
import { TrashIcon } from "@/components/trash-icon";
import { requireAdmin } from "@/utils/auth";
import { getAdminLessonEditor } from "@/utils/library";

type AdminLessonPageProps = {
  params: {
    lessonId: string;
  };
  searchParams?: {
    message?: string;
    _r?: string;
    blockUpdated?: string;
  };
};

export default async function AdminLessonPage({
  params,
  searchParams,
}: AdminLessonPageProps) {
  await requireAdmin();
  const { lesson, setupRequired } = await getAdminLessonEditor(params.lessonId);

  if (setupRequired) {
    return (
      <AppShell title="Admin setup" eyebrow="Lesson editor" showAdmin>
        <SetupState />
      </AppShell>
    );
  }

  if (!lesson) {
    notFound();
  }

  const updateLesson = updateLessonAction.bind(null, lesson.id, lesson.courseSlug);
  const createBlock = createBlockAction.bind(null, lesson.id);
  const createDownload = createDownloadAction.bind(null, lesson.id);
  const deleteLesson = deleteLessonAction.bind(null, lesson.courseSlug, lesson.id);
  const refreshKey = searchParams?._r ?? "initial";

  return (
    <AppShell
      title={lesson.title}
      eyebrow={
        <>
          <Link className="eyebrow-link" href="/admin/courses">
            Admin
          </Link>
          {" / "}
          <Link className="eyebrow-link" href={`/admin/courses/${lesson.courseSlug}`}>
            {lesson.courseTitle}
          </Link>
          {" / "}
          <a
            className="eyebrow-link"
            href={`/admin/courses/${lesson.courseSlug}#module-${lesson.moduleId}`}
          >
            {lesson.moduleTitle}
          </a>
        </>
      }
      showAdmin
      actions={
        <Link className="button button-secondary" href={`/admin/courses/${lesson.courseSlug}`}>
          Back to course
        </Link>
      }
    >
      {searchParams?.message ? <p className="form-status">{searchParams.message}</p> : null}

      <section className="panel lesson-panel">
        <div className="row-spread">
          <h2>Lesson details</h2>
          <Link className="button button-secondary" href={`/library/${lesson.courseSlug}/${lesson.slug}?preview=member`}>
            Preview lesson
          </Link>
        </div>
        <form action={updateLesson} className="editor-form stack">
          <div>
            <label htmlFor="lesson-title">Title</label>
            <input defaultValue={lesson.title} id="lesson-title" name="title" required type="text" />
          </div>
          <div className="field-grid">
            <div>
              <label htmlFor="lesson-status">Status</label>
              <select defaultValue={lesson.status} id="lesson-status" name="status">
                <option value="draft">Draft</option>
                <option value="published">Published</option>
              </select>
            </div>
            <div>
              <label htmlFor="lesson-summary">Summary</label>
              <input defaultValue={lesson.summary ?? ""} id="lesson-summary" name="summary" type="text" />
            </div>
          </div>
          <StorageUploadField
            accept="image/*"
            folder="lesson-thumbnails"
            helpText="Upload a lesson thumbnail or paste an image URL."
            initialValue={lesson.thumbnailUrl}
            label="Lesson thumbnail"
            name="thumbnailUrl"
          />
          <div className="panel-actions">
            <button type="submit">Save lesson</button>
          </div>
        </form>
      </section>

      <section className="panel lesson-panel lesson-content-section">
        <div className="section-header lesson-content-header">
          <p className="eyebrow">Lesson content</p>
          <h2>Content blocks</h2>
          <p>Edit and order the pieces of this lesson exactly as members should experience them.</p>
        </div>
        <div className="stack lesson-content-stack">
          {lesson.blocks.map((block, index) => {
            const updateBlock = updateBlockAction.bind(null, lesson.id, block.id);
            const moveBlockUp = moveBlockUpAction.bind(null, lesson.id, block.id);
            const moveBlockDown = moveBlockDownAction.bind(null, lesson.id, block.id);
            const deleteBlock = deleteBlockAction.bind(null, lesson.id, block.id);
            const showBlockSaved = searchParams?.blockUpdated === block.id;

            return (
              <section key={block.id} className="lesson-content-card">
                <div className="row-spread lesson-content-card-head">
                  <div className="stack stack-tight">
                    <p className="eyebrow">Block {index + 1}</p>
                    <h3>Content block</h3>
                  </div>
                  <span className="pill">{block.type}</span>
                </div>
                <BlockEditorForm
                  action={updateBlock}
                  initialBody={block.body}
                  initialEmbedUrl={block.embedUrl}
                  initialMediaProvider={block.mediaProvider}
                  initialMediaUrl={block.mediaUrl}
                  initialPosition={block.position}
                  initialTitle={block.title}
                  initialType={block.type}
                  prefix={`block-${block.id}`}
                  statusMessage={showBlockSaved ? "Block saved" : undefined}
                  secondaryActions={
                    <>
                      <button
                        className="button button-secondary"
                        formAction={moveBlockUp}
                        type="submit"
                      >
                        Move up
                      </button>
                      <button
                        className="button button-secondary"
                        formAction={moveBlockDown}
                        type="submit"
                      >
                        Move down
                      </button>
                      <button className="button button-secondary" formAction={deleteBlock} type="submit">
                        Delete block
                      </button>
                    </>
                  }
                  submitLabel="Save block"
                />
              </section>
            );
          })}
          <AddContentBlockSection
            action={createBlock}
            initialPosition={lesson.blocks.length}
            refreshKey={refreshKey}
          />
        </div>
      </section>

      <section className="panel lesson-panel">
        <div className="stack">
          <div className="section-header">
            <p className="eyebrow">Downloads</p>
            <h2>Lesson downloads</h2>
            <p>Manage the files members can open or download from this lesson.</p>
          </div>
          {lesson.downloads.length > 0 ? (
            <div className="stack">
              {lesson.downloads.map((download) => {
            const updateDownload = updateDownloadAction.bind(null, lesson.id, download.id);
            const deleteDownload = deleteDownloadAction.bind(null, lesson.id, download.id);

            return (
              <section key={download.id} className="download-editor">
                <DownloadEditorForm
                  action={updateDownload}
                  initialFileUrl={download.fileUrl}
                  initialPosition={download.position}
                  initialTitle={download.title}
                  secondaryActions={
                    <button className="button button-secondary" formAction={deleteDownload} type="submit">
                      Delete download
                    </button>
                  }
                  submitLabel="Save download"
                  titleInputId={`download-title-${download.id}`}
                />
              </section>
            );
              })}
            </div>
          ) : (
            <div className="empty-copy">
              <p>No lesson downloads added yet.</p>
            </div>
          )}
          <AddLessonDownloadSection
            action={createDownload}
            initialPosition={lesson.downloads.length}
            refreshKey={refreshKey}
          />
        </div>
      </section>

      <section className="panel lesson-panel lesson-danger-panel">
        <div className="stack stack-tight">
          <p className="eyebrow">Danger zone</p>
          <h2>Delete lesson</h2>
          <p>Delete this lesson and permanently remove its content blocks and downloads.</p>
        </div>
        <div className="panel-actions">
          <form action={deleteLesson}>
            <ConfirmSubmitButton
              className="button button-danger"
              confirmMessage={`Delete the lesson "${lesson.title}"? This will remove its content blocks and downloads.`}
            >
              <TrashIcon />
              Delete lesson
            </ConfirmSubmitButton>
          </form>
        </div>
      </section>
    </AppShell>
  );
}
