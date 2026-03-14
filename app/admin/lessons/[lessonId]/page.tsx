import Link from "next/link";
import { notFound } from "next/navigation";
import {
  createBlockAction,
  createDownloadAction,
  deleteBlockAction,
  deleteDownloadAction,
  updateBlockAction,
  updateDownloadAction,
  updateLessonAction,
} from "@/app/admin/actions";
import { AppShell } from "@/components/app-shell";
import { BlockEditorForm } from "@/components/block-editor-form";
import { SetupState } from "@/components/setup-state";
import { StorageUploadField } from "@/components/storage-upload-field";
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
  const refreshKey = searchParams?._r ?? "initial";

  return (
    <AppShell
      title={lesson.title}
      eyebrow={`Admin / ${lesson.courseTitle} / ${lesson.moduleTitle}`}
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
          <Link className="button button-secondary" href={`/library/${lesson.courseSlug}/${lesson.slug}`}>
            Preview lesson
          </Link>
        </div>
        <form action={updateLesson} className="editor-form stack">
          <div className="field-grid">
            <div>
              <label htmlFor="lesson-title">Title</label>
              <input defaultValue={lesson.title} id="lesson-title" name="title" required type="text" />
            </div>
            <div>
              <label htmlFor="lesson-slug">Slug</label>
              <input defaultValue={lesson.slug} id="lesson-slug" name="slug" required type="text" />
            </div>
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

      <section className="stack">
        {lesson.blocks.map((block) => {
          const updateBlock = updateBlockAction.bind(null, lesson.id, block.id);
          const deleteBlock = deleteBlockAction.bind(null, lesson.id, block.id);
          const showBlockSaved = searchParams?.blockUpdated === block.id;

          return (
            <section key={block.id} className="panel lesson-panel">
              <div className="row-spread">
                <h2>Content block</h2>
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
                  <form action={deleteBlock}>
                    <button className="button button-secondary" type="submit">
                      Delete block
                    </button>
                  </form>
                }
                submitLabel="Save block"
              />
            </section>
          );
        })}
      </section>

      <section className="panel lesson-panel">
        <h2>Add content block</h2>
        <BlockEditorForm
          action={createBlock}
          initialPosition={lesson.blocks.length}
          key={`create-block-${refreshKey}`}
          prefix={`new-block-${refreshKey}`}
          submitLabel="Add content block"
        />
      </section>

      <section className="panel lesson-panel">
        <h2>Downloads</h2>
        <div className="stack">
          {lesson.downloads.map((download) => {
            const updateDownload = updateDownloadAction.bind(null, lesson.id, download.id);
            const deleteDownload = deleteDownloadAction.bind(null, lesson.id, download.id);

            return (
              <section key={download.id} className="download-editor">
                <form action={updateDownload} className="editor-form stack">
                  <div className="field-grid">
                    <div>
                      <label htmlFor={`download-title-${download.id}`}>Title</label>
                      <input
                        defaultValue={download.title}
                        id={`download-title-${download.id}`}
                        name="title"
                        required
                        type="text"
                      />
                    </div>
                    <div>
                      <label htmlFor={`download-position-${download.id}`}>Position</label>
                      <input
                        defaultValue={download.position}
                        id={`download-position-${download.id}`}
                        name="position"
                        type="number"
                      />
                    </div>
                  </div>
                  <StorageUploadField
                    folder="lesson-downloads"
                    helpText="Upload a file or paste a download URL."
                    initialValue={download.fileUrl}
                    label="File"
                    name="fileUrl"
                  />
                  <div className="panel-actions">
                    <button type="submit">Save download</button>
                  </div>
                </form>
                <form action={deleteDownload}>
                  <button className="button button-secondary" type="submit">
                    Delete download
                  </button>
                </form>
              </section>
            );
          })}
        </div>
      </section>

      <section className="panel lesson-panel">
        <h2>Add download</h2>
        <form action={createDownload} className="editor-form stack" key={`create-download-${refreshKey}`}>
          <input name="position" type="hidden" value={lesson.downloads.length} />
          <div>
            <label htmlFor="new-download-title">Title</label>
            <input id="new-download-title" name="title" required type="text" />
          </div>
          <StorageUploadField
            folder="lesson-downloads"
            helpText="Upload the file or paste an external download URL."
            label="File"
            name="fileUrl"
          />
          <div className="panel-actions">
            <button type="submit">Add download</button>
          </div>
        </form>
      </section>
    </AppShell>
  );
}
