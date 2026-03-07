import { createClient } from "@/utils/supabase/server";

type QueryError = {
  code?: string;
  message: string;
};

type QueryState<T> = {
  data: T | null;
  setupRequired: boolean;
};

type CourseEnrollmentRow = {
  course: {
    id: string;
    slug: string;
    title: string;
    subtitle: string | null;
    description: string | null;
    thumbnail_url: string | null;
    status: "draft" | "published";
    created_at: string;
  } | null;
};

type LessonRow = {
  id: string;
  slug: string;
  title: string;
  summary: string | null;
  thumbnail_url: string | null;
  position: number;
  status: "draft" | "published";
};

type ModuleRow = {
  id: string;
  title: string;
  description: string | null;
  position: number;
  status: "draft" | "published";
  lessons: LessonRow[] | null;
};

type CourseRow = {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  description: string | null;
  thumbnail_url: string | null;
  status: "draft" | "published";
  created_at: string;
  modules: ModuleRow[] | null;
};

type LessonBlockRow = {
  id: string;
  block_type: "video" | "audio" | "rich_text" | "download";
  title: string | null;
  body: string | null;
  media_provider: string | null;
  media_url: string | null;
  embed_url: string | null;
  position: number;
};

type LessonDownloadRow = {
  id: string;
  title: string;
  file_url: string;
  position: number;
};

type LessonContentRow = {
  id: string;
  title: string;
  summary: string | null;
  thumbnail_url: string | null;
  blocks: LessonBlockRow[] | null;
  downloads: LessonDownloadRow[] | null;
};

export type LibraryCourse = {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  description: string | null;
  thumbnailUrl: string | null;
  status: "draft" | "published";
  createdAt: string;
};

export type CourseLesson = {
  id: string;
  slug: string;
  title: string;
  summary: string | null;
  thumbnailUrl: string | null;
  position: number;
  status: "draft" | "published";
};

export type CourseModule = {
  id: string;
  title: string;
  description: string | null;
  position: number;
  status: "draft" | "published";
  lessons: CourseLesson[];
};

export type CourseDetail = {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  description: string | null;
  thumbnailUrl: string | null;
  status: "draft" | "published";
  createdAt: string;
  modules: CourseModule[];
};

export type LessonBlock = {
  id: string;
  type: "video" | "audio" | "rich_text" | "download";
  title: string | null;
  body: string | null;
  mediaProvider: string | null;
  mediaUrl: string | null;
  embedUrl: string | null;
  position: number;
};

export type LessonDownload = {
  id: string;
  title: string;
  fileUrl: string;
  position: number;
};

export type LessonContent = {
  id: string;
  title: string;
  summary: string | null;
  thumbnailUrl: string | null;
  blocks: LessonBlock[];
  downloads: LessonDownload[];
};

export type AdminLessonEditor = LessonContent & {
  slug: string;
  status: "draft" | "published";
  moduleId: string;
  moduleTitle: string;
  courseSlug: string;
  courseTitle: string;
};

function isSetupError(error: QueryError | null) {
  return error?.code === "42P01" || error?.code === "42703";
}

function toQueryState<T>(data: T | null, error: QueryError | null): QueryState<T> {
  if (isSetupError(error)) {
    return {
      data: null,
      setupRequired: true,
    };
  }

  if (error) {
    throw error;
  }

  return {
    data,
    setupRequired: false,
  };
}

function mapLesson(row: LessonRow): CourseLesson {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    summary: row.summary,
    thumbnailUrl: row.thumbnail_url,
    position: row.position,
    status: row.status,
  };
}

function mapCourse(row: CourseRow): CourseDetail {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    subtitle: row.subtitle,
    description: row.description,
    thumbnailUrl: row.thumbnail_url,
    status: row.status,
    createdAt: row.created_at,
    modules: (row.modules ?? [])
      .sort((left, right) => left.position - right.position)
      .map((moduleRow) => ({
        id: moduleRow.id,
        title: moduleRow.title,
        description: moduleRow.description,
        position: moduleRow.position,
        status: moduleRow.status,
        lessons: (moduleRow.lessons ?? [])
          .sort((left, right) => left.position - right.position)
          .map(mapLesson),
      })),
  };
}

export function getCourseLessonCount(course: CourseDetail) {
  return course.modules.reduce((count, moduleItem) => {
    return count + moduleItem.lessons.length;
  }, 0);
}

export async function getMemberCourses(userId: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("course_enrollments")
    .select(
      "course:courses!inner(id, slug, title, subtitle, description, thumbnail_url, status, created_at)",
    )
    .eq("user_id", userId)
    .eq("status", "active")
    .eq("course.status", "published");

  const state = toQueryState(data as CourseEnrollmentRow[] | null, error);

  return {
    setupRequired: state.setupRequired,
    courses: (state.data ?? [])
      .map((row) => row.course)
      .filter((course): course is NonNullable<CourseEnrollmentRow["course"]> => Boolean(course))
      .map((course) => ({
        id: course.id,
        slug: course.slug,
        title: course.title,
        subtitle: course.subtitle,
        description: course.description,
        thumbnailUrl: course.thumbnail_url,
        status: course.status,
        createdAt: course.created_at,
      })),
  };
}

export async function getAccessibleCourse(userId: string, courseSlug: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("courses")
    .select(
      `
        id,
        slug,
        title,
        subtitle,
        description,
        thumbnail_url,
        status,
        created_at,
        course_enrollments!inner(user_id, status),
        modules(
          id,
          title,
          description,
          position,
          status,
          lessons(
            id,
            slug,
            title,
            summary,
            thumbnail_url,
            position,
            status
          )
        )
      `,
    )
    .eq("slug", courseSlug)
    .eq("status", "published")
    .eq("course_enrollments.user_id", userId)
    .eq("course_enrollments.status", "active")
    .maybeSingle();

  const state = toQueryState(data as CourseRow | null, error);

  return {
    setupRequired: state.setupRequired,
    course: state.data ? mapCourse(state.data) : null,
  };
}

export async function getLessonContent(lessonId: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("lessons")
    .select(
      `
        id,
        title,
        summary,
        thumbnail_url,
        blocks:lesson_blocks(
          id,
          block_type,
          title,
          body,
          media_provider,
          media_url,
          embed_url,
          position
        ),
        downloads:lesson_downloads(
          id,
          title,
          file_url,
          position
        )
      `,
    )
    .eq("id", lessonId)
    .maybeSingle();

  const state = toQueryState(data as LessonContentRow | null, error);
  const lesson = state.data;

  return {
    setupRequired: state.setupRequired,
    lesson: lesson
      ? {
          id: lesson.id,
          title: lesson.title,
          summary: lesson.summary,
          thumbnailUrl: lesson.thumbnail_url,
          blocks: (lesson.blocks ?? [])
            .sort((left, right) => left.position - right.position)
            .map((block) => ({
              id: block.id,
              type: block.block_type,
              title: block.title,
              body: block.body,
              mediaProvider: block.media_provider,
              mediaUrl: block.media_url,
              embedUrl: block.embed_url,
              position: block.position,
            })),
          downloads: (lesson.downloads ?? [])
            .sort((left, right) => left.position - right.position)
            .map((download) => ({
              id: download.id,
              title: download.title,
              fileUrl: download.file_url,
              position: download.position,
            })),
        }
      : null,
  };
}

export async function getAdminLessonEditor(lessonId: string) {
  const supabase = createClient();
  const { data: lessonRow, error: lessonError } = await supabase
    .from("lessons")
    .select("id, title, slug, summary, thumbnail_url, status, module_id")
    .eq("id", lessonId)
    .maybeSingle();

  const lessonState = toQueryState(
    lessonRow as {
      id: string;
      title: string;
      slug: string;
      summary: string | null;
      thumbnail_url: string | null;
      status: "draft" | "published";
      module_id: string;
    } | null,
    lessonError,
  );

  if (!lessonState.data) {
    return {
      setupRequired: lessonState.setupRequired,
      lesson: null,
    };
  }

  const { data: moduleRow, error: moduleError } = await supabase
    .from("modules")
    .select("id, title, course:courses!inner(slug, title)")
    .eq("id", lessonState.data.module_id)
    .maybeSingle();

  const moduleState = toQueryState(
    moduleRow as {
      id: string;
      title: string;
      course: {
        slug: string;
        title: string;
      } | null;
    } | null,
    moduleError,
  );

  const contentState = await getLessonContent(lessonId);

  if (!moduleState.data?.course || !contentState.lesson) {
    return {
      setupRequired:
        lessonState.setupRequired || moduleState.setupRequired || contentState.setupRequired,
      lesson: null,
    };
  }

  return {
    setupRequired:
      lessonState.setupRequired || moduleState.setupRequired || contentState.setupRequired,
    lesson: {
      ...contentState.lesson,
      slug: lessonState.data.slug,
      status: lessonState.data.status,
      moduleId: moduleState.data.id,
      moduleTitle: moduleState.data.title,
      courseSlug: moduleState.data.course.slug,
      courseTitle: moduleState.data.course.title,
    } satisfies AdminLessonEditor,
  };
}

export async function getAdminCourses() {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("courses")
    .select("id, slug, title, subtitle, description, thumbnail_url, status, created_at")
    .order("created_at", { ascending: false });

  const state = toQueryState(data as CourseRow[] | null, error);

  return {
    setupRequired: state.setupRequired,
    courses: (state.data ?? []).map((course) => ({
      id: course.id,
      slug: course.slug,
      title: course.title,
      subtitle: course.subtitle,
        description: course.description,
        thumbnailUrl: course.thumbnail_url,
        status: course.status,
        createdAt: course.created_at,
      })),
  };
}

export async function getAdminCourse(courseSlug: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("courses")
    .select(
      `
        id,
        slug,
        title,
        subtitle,
        description,
        thumbnail_url,
        status,
        created_at,
        modules(
          id,
          title,
          description,
          position,
          status,
          lessons(
            id,
            slug,
            title,
            summary,
            thumbnail_url,
            position,
            status
          )
        )
      `,
    )
    .eq("slug", courseSlug)
    .maybeSingle();

  const state = toQueryState(data as CourseRow | null, error);

  return {
    setupRequired: state.setupRequired,
    course: state.data ? mapCourse(state.data) : null,
  };
}
