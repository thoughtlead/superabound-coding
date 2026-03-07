/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { EmptyState } from "@/components/empty-state";
import { SetupState } from "@/components/setup-state";
import { getCurrentProfile, requireUser } from "@/utils/auth";
import { getMemberCourses } from "@/utils/library";

export default async function LibraryPage() {
  const { user } = await requireUser();
  const profile = await getCurrentProfile(user.id);
  const isAdmin = profile?.role === "admin";
  const { courses, setupRequired } = await getMemberCourses(user.id, isAdmin);

  return (
    <AppShell
      title="Your courses"
      eyebrow={profile?.full_name ?? user.email ?? "Member library"}
      showAdmin={profile?.role === "admin"}
      actions={
        profile?.role === "admin" ? (
          <Link className="button button-secondary" href="/admin/courses">
            Open admin
          </Link>
        ) : null
      }
    >
      {setupRequired ? <SetupState /> : null}
      {!setupRequired && courses.length === 0 ? (
        <EmptyState
          title={isAdmin ? "No courses yet" : "No course access yet"}
          body={
            isAdmin
              ? "Create a course in admin and it will appear here immediately."
              : "Members only see courses they are enrolled in. Add a course enrollment in Supabase to populate this library."
          }
        />
      ) : null}
      {!setupRequired ? (
        <section className="course-grid">
          {courses.map((course) => (
            <Link
              key={course.id}
              className="course-card"
              href={`/library/${course.slug}`}
            >
              <div className="course-art">
                {course.thumbnailUrl ? (
                  <img alt="" src={course.thumbnailUrl} />
                ) : (
                  <div className="course-art-fallback">{course.title.slice(0, 1)}</div>
                )}
              </div>
              <div className="course-copy">
                <span className="pill">Course</span>
                <h2>{course.title}</h2>
                {course.subtitle ? <p>{course.subtitle}</p> : null}
                {!course.subtitle && course.description ? <p>{course.description}</p> : null}
              </div>
            </Link>
          ))}
        </section>
      ) : null}
    </AppShell>
  );
}
