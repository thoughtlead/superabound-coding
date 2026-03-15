import Link from "next/link";
import { notFound } from "next/navigation";
import {
  createLessonAction,
  createModuleAction,
  deleteLessonAction,
  deleteModuleAction,
  moveLessonDownAction,
  moveLessonUpAction,
  moveModuleDownAction,
  moveModuleUpAction,
  updateCourseAction,
  updateModuleAction,
} from "@/app/admin/actions";
import { AppShell } from "@/components/app-shell";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import { SetupState } from "@/components/setup-state";
import { StorageUploadField } from "@/components/storage-upload-field";
import { TrashIcon } from "@/components/trash-icon";
import { requireAdmin } from "@/utils/auth";
import { getAdminCourse, getCourseLessonCount } from "@/utils/library";

type AdminCoursePageProps = {
  params: {
    courseSlug: string;
  };
  searchParams?: {
    message?: string;
    moduleAdded?: string;
    moduleFormKey?: string;
    courseSaved?: string;
  };
};

export default async function AdminCoursePage({
  params,
  searchParams,
}: AdminCoursePageProps) {
  await requireAdmin();
  const { course, setupRequired } = await getAdminCourse(params.courseSlug);

  if (setupRequired) {
    return (
      <AppShell title="Admin setup" eyebrow="Courses" showAdmin>
        <SetupState />
      </AppShell>
    );
  }

  if (!course) {
    notFound();
  }

  const updateCourse = updateCourseAction.bind(null, course.id, course.slug);
  const createModule = createModuleAction.bind(null, course.slug, course.id);
  const moduleFormKey = searchParams?.moduleFormKey ?? "module-form";
  const showModuleAddedTag = searchParams?.moduleAdded === "1";
  const showCourseSavedTag = searchParams?.courseSaved === "1";

  return (
    <AppShell
      title={course.title}
      eyebrow={
        <>
          <Link className="eyebrow-link" href="/admin/courses">
            Admin
          </Link>
          {" / "}
          <span>Course editor</span>
        </>
      }
      showAdmin
      actions={<span className="stat-chip">{getCourseLessonCount(course)} lessons</span>}
    >
      <div className="stack admin-course-editor">
        {searchParams?.message ? <p className="form-status">{searchParams.message}</p> : null}

        <section className="course-editor-top">
          <section className="panel lesson-panel course-settings-panel">
            <div className="row-spread">
              <div>
                <p className="eyebrow">Course settings</p>
                <h2>Course details</h2>
              </div>
              <div className="inline-actions">
                {showCourseSavedTag ? <span className="stat-chip">Course saved</span> : null}
                <Link className="button button-secondary" href={`/library/${course.slug}`}>
                  Preview member view
                </Link>
              </div>
            </div>
            <form action={updateCourse} className="editor-form stack">
              <div>
                <label htmlFor="course-title">Title</label>
                <input defaultValue={course.title} id="course-title" name="title" required type="text" />
              </div>
              <div className="field-grid">
                <div>
                  <label htmlFor="course-subtitle">Subtitle</label>
                  <input defaultValue={course.subtitle ?? ""} id="course-subtitle" name="subtitle" type="text" />
                </div>
                <div>
                  <label htmlFor="course-status">Status</label>
                  <select defaultValue={course.status} id="course-status" name="status">
                    <option value="draft">Draft</option>
                    <option value="published">Published</option>
                  </select>
                </div>
              </div>
              <div>
                <label htmlFor="course-description">Description</label>
                <textarea defaultValue={course.description ?? ""} id="course-description" name="description" rows={4} />
              </div>
              <StorageUploadField
                accept="image/*"
                folder="course-thumbnails"
                helpText="Upload a thumbnail or paste an external image URL."
                initialValue={course.thumbnailUrl}
                label="Thumbnail"
                name="thumbnailUrl"
              />
              <div className="panel-actions">
                <button type="submit">Save course</button>
              </div>
            </form>
          </section>

          <section className="panel lesson-panel course-add-module-panel">
            <div className="course-add-module-header">
              <div>
                <p className="eyebrow">Course outline</p>
                <h2>Add topic</h2>
                <p>Add the next topic here, then manage lesson order in the outline below.</p>
              </div>
              {showModuleAddedTag ? <span className="stat-chip">Topic added</span> : null}
            </div>
            <form key={moduleFormKey} action={createModule} className="editor-form stack">
              <input name="position" type="hidden" value={course.modules.length} />
              <div className="field-grid">
                <div>
                  <label htmlFor="module-title">Title</label>
                  <input id="module-title" name="title" required type="text" />
                </div>
                <div>
                  <label htmlFor="module-status">Status</label>
                  <select defaultValue="draft" id="module-status" name="status">
                    <option value="draft">Draft</option>
                    <option value="published">Published</option>
                  </select>
                </div>
              </div>
              <div>
                <label htmlFor="module-description">Description</label>
                <textarea id="module-description" name="description" rows={3} />
              </div>
              <div className="panel-actions">
                <button type="submit">Add topic</button>
              </div>
            </form>
          </section>
        </section>

        <section className="stack course-outline-section">
          <div className="course-outline-header">
            <div>
              <p className="eyebrow">Course outline</p>
              <h2>Topics and lessons</h2>
            </div>
          </div>
          {course.modules.map((moduleItem) => {
            const updateModule = updateModuleAction.bind(null, course.slug, moduleItem.id);
            const moveModuleUp = moveModuleUpAction.bind(null, course.slug, moduleItem.id);
            const moveModuleDown = moveModuleDownAction.bind(null, course.slug, moduleItem.id);
            const deleteModule = deleteModuleAction.bind(null, course.slug, moduleItem.id);
            const createLesson = createLessonAction.bind(null, course.slug, moduleItem.id);

            return (
              <article id={`module-${moduleItem.id}`} key={moduleItem.id} className="panel module-card">
                <div className="row-spread">
                  <div>
                    <p className="eyebrow">Topic {moduleItem.position + 1}</p>
                    <h2>{moduleItem.title}</h2>
                  </div>
                  <div className="inline-actions">
                    <form action={moveModuleUp}>
                      <button className="button button-secondary" type="submit">
                        Move up
                      </button>
                    </form>
                    <form action={moveModuleDown}>
                      <button className="button button-secondary" type="submit">
                        Move down
                      </button>
                    </form>
                    <form action={deleteModule}>
                      <ConfirmSubmitButton
                        ariaLabel={`Delete topic ${moduleItem.title}`}
                        className="button button-danger button-icon-only"
                        confirmMessage={`Delete the topic "${moduleItem.title}"? This will remove all lessons, content blocks, and downloads inside it.`}
                        title="Delete topic"
                      >
                        <TrashIcon />
                      </ConfirmSubmitButton>
                    </form>
                  </div>
                </div>

                <form action={updateModule} className="editor-form stack">
                  <div className="field-grid">
                    <div>
                      <label htmlFor={`module-title-${moduleItem.id}`}>Title</label>
                      <input
                        defaultValue={moduleItem.title}
                        id={`module-title-${moduleItem.id}`}
                        name="title"
                        required
                        type="text"
                      />
                    </div>
                    <div>
                      <label htmlFor={`module-status-${moduleItem.id}`}>Status</label>
                      <select
                        defaultValue={moduleItem.status}
                        id={`module-status-${moduleItem.id}`}
                        name="status"
                      >
                        <option value="draft">Draft</option>
                        <option value="published">Published</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label htmlFor={`module-description-${moduleItem.id}`}>Description</label>
                    <textarea
                      defaultValue={moduleItem.description ?? ""}
                      id={`module-description-${moduleItem.id}`}
                      name="description"
                      rows={3}
                    />
                  </div>
                  <div className="panel-actions">
                    <button type="submit">Save topic</button>
                  </div>
                </form>

                <div className="lesson-list">
                  {moduleItem.lessons.map((lesson, index) => {
                    const moveLessonUp = moveLessonUpAction.bind(null, course.slug, lesson.id);
                    const moveLessonDown = moveLessonDownAction.bind(null, course.slug, lesson.id);
                    const deleteLesson = deleteLessonAction.bind(null, course.slug, lesson.id);

                    return (
                      <div key={lesson.id} className="lesson-row lesson-row-admin">
                        <div>
                          <span className="lesson-index">{index + 1}</span>
                          <div>
                            <h3>{lesson.title}</h3>
                            {lesson.summary ? <p>{lesson.summary}</p> : null}
                          </div>
                        </div>
                        <div className="inline-actions">
                          <form action={moveLessonUp}>
                            <button className="button button-secondary" type="submit">
                              Up
                            </button>
                          </form>
                          <form action={moveLessonDown}>
                            <button className="button button-secondary" type="submit">
                              Down
                            </button>
                          </form>
                          <Link className="button button-secondary" href={`/admin/lessons/${lesson.id}`}>
                            Edit lesson
                          </Link>
                          <form action={deleteLesson}>
                            <ConfirmSubmitButton
                              ariaLabel={`Delete ${lesson.title}`}
                              className="button button-danger button-icon-only"
                              confirmMessage={`Delete the lesson "${lesson.title}"? This will remove its content blocks and downloads.`}
                              title="Delete lesson"
                            >
                              <TrashIcon />
                            </ConfirmSubmitButton>
                          </form>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <form action={createLesson} className="editor-form stack editor-subsection">
                  <input name="position" type="hidden" value={moduleItem.lessons.length} />
                  <div>
                    <label htmlFor={`lesson-title-${moduleItem.id}`}>New lesson title</label>
                    <input id={`lesson-title-${moduleItem.id}`} name="title" required type="text" />
                  </div>
                  <div className="field-grid">
                    <div>
                      <label htmlFor={`lesson-status-${moduleItem.id}`}>Status</label>
                      <select defaultValue="draft" id={`lesson-status-${moduleItem.id}`} name="status">
                        <option value="draft">Draft</option>
                        <option value="published">Published</option>
                      </select>
                    </div>
                    <div>
                      <label htmlFor={`lesson-summary-${moduleItem.id}`}>Summary</label>
                      <input id={`lesson-summary-${moduleItem.id}`} name="summary" type="text" />
                    </div>
                  </div>
                  <StorageUploadField
                    accept="image/*"
                    folder="lesson-thumbnails"
                    helpText="Optional lesson thumbnail."
                    label="Lesson thumbnail"
                    name="thumbnailUrl"
                  />
                  <div className="panel-actions">
                    <button type="submit">Add lesson</button>
                  </div>
                </form>
              </article>
            );
          })}
        </section>
      </div>
    </AppShell>
  );
}
