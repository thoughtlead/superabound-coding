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

          return (
            <section key={block.id} className="panel lesson-panel">
              <div className="row-spread">
                <h2>Content block</h2>
                <span className="pill">{block.type}</span>
              </div>
              <form action={updateBlock} className="editor-form stack">
                <div className="field-grid">
                  <div>
                    <label htmlFor={`block-type-${block.id}`}>Type</label>
                    <select
                      defaultValue={block.type}
                      id={`block-type-${block.id}`}
                      name="blockType"
                    >
                      <option value="video">Video</option>
                      <option value="audio">Audio</option>
                      <option value="rich_text">Rich text</option>
                      <option value="download">Download button</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor={`block-position-${block.id}`}>Position</label>
                    <input
                      defaultValue={block.position}
                      id={`block-position-${block.id}`}
                      name="position"
                      type="number"
                    />
                  </div>
                </div>
                <div className="field-grid">
                  <div>
                    <label htmlFor={`block-title-${block.id}`}>Title</label>
                    <input defaultValue={block.title ?? ""} id={`block-title-${block.id}`} name="title" type="text" />
                  </div>
                  <div>
                    <label htmlFor={`block-provider-${block.id}`}>Media provider</label>
                    <input
                      defaultValue={block.mediaProvider ?? ""}
                      id={`block-provider-${block.id}`}
                      name="mediaProvider"
                      placeholder="vimeo or wistia"
                      type="text"
                    />
                  </div>
                </div>
                <div className="field-grid">
                  <div>
                    <label htmlFor={`block-media-url-${block.id}`}>Media URL</label>
                    <input
                      defaultValue={block.mediaUrl ?? ""}
                      id={`block-media-url-${block.id}`}
                      name="mediaUrl"
                      type="url"
                    />
                  </div>
                  <div>
                    <label htmlFor={`block-embed-url-${block.id}`}>Embed URL</label>
                    <input
                      defaultValue={block.embedUrl ?? ""}
                      id={`block-embed-url-${block.id}`}
                      name="embedUrl"
                      type="url"
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor={`block-body-${block.id}`}>Body / rich text HTML</label>
                  <textarea defaultValue={block.body ?? ""} id={`block-body-${block.id}`} name="body" rows={7} />
                </div>
                <div className="panel-actions">
                  <button type="submit">Save block</button>
                </div>
              </form>
              <form action={deleteBlock}>
                <button className="button button-secondary" type="submit">
                  Delete block
                </button>
              </form>
            </section>
          );
        })}
      </section>

      <section className="panel lesson-panel">
        <h2>Add content block</h2>
        <form action={createBlock} className="editor-form stack">
          <input name="position" type="hidden" value={lesson.blocks.length} />
          <div className="field-grid">
            <div>
              <label htmlFor="new-block-type">Type</label>
              <select defaultValue="rich_text" id="new-block-type" name="blockType">
                <option value="video">Video</option>
                <option value="audio">Audio</option>
                <option value="rich_text">Rich text</option>
                <option value="download">Download button</option>
              </select>
            </div>
            <div>
              <label htmlFor="new-block-title">Title</label>
              <input id="new-block-title" name="title" type="text" />
            </div>
          </div>
          <div className="field-grid">
            <div>
              <label htmlFor="new-block-provider">Media provider</label>
              <input id="new-block-provider" name="mediaProvider" placeholder="vimeo or wistia" type="text" />
            </div>
            <div>
              <label htmlFor="new-block-media-url">Media URL</label>
              <input id="new-block-media-url" name="mediaUrl" type="url" />
            </div>
          </div>
          <div>
            <label htmlFor="new-block-embed-url">Embed URL</label>
            <input id="new-block-embed-url" name="embedUrl" type="url" />
          </div>
          <div>
            <label htmlFor="new-block-body">Body / rich text HTML</label>
            <textarea id="new-block-body" name="body" rows={6} />
          </div>
          <div className="panel-actions">
            <button type="submit">Add content block</button>
          </div>
        </form>
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
        <form action={createDownload} className="editor-form stack">
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
