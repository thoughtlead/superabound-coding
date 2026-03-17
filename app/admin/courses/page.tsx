import Link from "next/link";
import { createCourseAction } from "@/app/admin/actions";
import { AppShell } from "@/components/app-shell";
import { EmptyState } from "@/components/empty-state";
import { SetupState } from "@/components/setup-state";
import { StorageUploadField } from "@/components/storage-upload-field";
import { requireAdmin } from "@/utils/auth";
import { getAdminCourses } from "@/utils/library";

type AdminCoursesPageProps = {
  searchParams?: {
    message?: string;
  };
};

export default async function AdminCoursesPage({
  searchParams,
}: AdminCoursesPageProps) {
  await requireAdmin();
  const { courses, setupRequired } = await getAdminCourses();

  return (
    <AppShell
      title="Course admin"
      eyebrow="Admin"
      showAdmin
      actions={<span className="stat-chip">{courses.length} courses</span>}
    >
      {searchParams?.message ? <p className="form-status">{searchParams.message}</p> : null}
      {setupRequired ? <SetupState /> : null}
      {!setupRequired ? (
        <section className="panel lesson-panel">
          <h2>Create course</h2>
          <form action={createCourseAction} className="editor-form stack">
            <div>
              <label htmlFor="course-title">Title</label>
              <input id="course-title" name="title" required type="text" />
            </div>
            <div className="field-grid">
              <div>
                <label htmlFor="course-subtitle">Subtitle</label>
                <input id="course-subtitle" name="subtitle" type="text" />
              </div>
              <div>
                <label htmlFor="course-status">Status</label>
                <select id="course-status" name="status" defaultValue="draft">
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                </select>
              </div>
            </div>
            <div>
              <label htmlFor="course-description">Description</label>
              <textarea id="course-description" name="description" rows={4} />
            </div>
            <StorageUploadField
              accept="image/*"
              folder="course-thumbnails"
              helpText="Upload a course thumbnail or paste an external image URL."
              label="Thumbnail"
              name="thumbnailUrl"
            />
            <div className="panel-actions">
              <button type="submit">Create course</button>
            </div>
          </form>
        </section>
      ) : null}
      {!setupRequired && courses.length === 0 ? (
        <EmptyState
          title="No courses yet"
          body="Create your first course here, then add topics and lessons from the course editor."
        />
      ) : null}
      {!setupRequired ? (
        <section className="stack">
          {courses.map((course) => (
            <Link
              key={course.id}
              className="panel admin-course-row"
              href={`/admin/courses/${course.slug}`}
            >
              <div className="admin-course-row-copy">
                <p className="eyebrow">Course</p>
                <h2>{course.title}</h2>
                {course.subtitle ? <p>{course.subtitle}</p> : null}
              </div>
              <div className="admin-course-row-actions">
                <span
                  className={`pill status-pill ${
                    course.status === "published" ? "status-pill-published" : "status-pill-draft"
                  }`}
                >
                  {course.status}
                </span>
                <span className="row-link">Edit course</span>
              </div>
            </Link>
          ))}
        </section>
      ) : null}
    </AppShell>
  );
}
