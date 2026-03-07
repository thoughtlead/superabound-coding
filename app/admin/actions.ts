"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/utils/auth";

function getValue(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function getStatus(formData: FormData, key = "status") {
  const value = getValue(formData, key);
  return value === "published" ? "published" : "draft";
}

function getPosition(formData: FormData, key: string) {
  const value = Number(formData.get(key) ?? "0");
  return Number.isFinite(value) ? value : 0;
}

function withMessage(path: string, message: string, extras?: Record<string, string>) {
  const url = new URL(path, "http://localhost");
  url.searchParams.set("message", message);
  url.searchParams.set("_r", String(Date.now()));
  if (extras) {
    Object.entries(extras).forEach(([key, value]) => {
      url.searchParams.set(key, value);
    });
  }
  return `${url.pathname}${url.search}`;
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

async function swapModulePosition(
  courseSlug: string,
  moduleId: string,
  direction: "up" | "down",
) {
  const { supabase } = await requireAdmin();
  const { data: moduleItem, error: moduleError } = await supabase
    .from("modules")
    .select("id, course_id, position")
    .eq("id", moduleId)
    .maybeSingle();

  if (moduleError || !moduleItem) {
    redirect(withMessage(`/admin/courses/${courseSlug}`, "Module not found."));
  }

  const adjacentModuleQuery = supabase
    .from("modules")
    .select("id, position")
    .eq("course_id", moduleItem.course_id)
    .order("position", { ascending: direction === "up" });
  const { data: adjacentModule, error: adjacentError } =
    direction === "up"
      ? await adjacentModuleQuery.lt("position", moduleItem.position).limit(1).maybeSingle()
      : await adjacentModuleQuery.gt("position", moduleItem.position).limit(1).maybeSingle();

  if (adjacentError) {
    redirect(withMessage(`/admin/courses/${courseSlug}`, adjacentError.message));
  }

  if (!adjacentModule) {
    redirect(withMessage(`/admin/courses/${courseSlug}`, "Module is already at the edge."));
  }

  await supabase.from("modules").update({ position: -1 }).eq("id", moduleItem.id);
  await supabase
    .from("modules")
    .update({ position: moduleItem.position })
    .eq("id", adjacentModule.id);
  await supabase.from("modules").update({ position: adjacentModule.position }).eq("id", moduleItem.id);

  revalidatePath(`/admin/courses/${courseSlug}`);
  redirect(withMessage(`/admin/courses/${courseSlug}`, "Module order updated."));
}

async function swapLessonPosition(
  courseSlug: string,
  lessonId: string,
  direction: "up" | "down",
) {
  const { supabase } = await requireAdmin();
  const { data: lesson, error: lessonError } = await supabase
    .from("lessons")
    .select("id, module_id, position")
    .eq("id", lessonId)
    .maybeSingle();

  if (lessonError || !lesson) {
    redirect(withMessage(`/admin/courses/${courseSlug}`, "Lesson not found."));
  }

  const adjacentLessonQuery = supabase
    .from("lessons")
    .select("id, position")
    .eq("module_id", lesson.module_id)
    .order("position", { ascending: direction === "up" });
  const { data: adjacentLesson, error: adjacentError } =
    direction === "up"
      ? await adjacentLessonQuery.lt("position", lesson.position).limit(1).maybeSingle()
      : await adjacentLessonQuery.gt("position", lesson.position).limit(1).maybeSingle();

  if (adjacentError) {
    redirect(withMessage(`/admin/courses/${courseSlug}`, adjacentError.message));
  }

  if (!adjacentLesson) {
    redirect(withMessage(`/admin/courses/${courseSlug}`, "Lesson is already at the edge."));
  }

  await supabase.from("lessons").update({ position: -1 }).eq("id", lesson.id);
  await supabase
    .from("lessons")
    .update({ position: lesson.position })
    .eq("id", adjacentLesson.id);
  await supabase.from("lessons").update({ position: adjacentLesson.position }).eq("id", lesson.id);

  revalidatePath(`/admin/courses/${courseSlug}`);
  redirect(withMessage(`/admin/courses/${courseSlug}`, "Lesson order updated."));
}

export async function createCourseAction(formData: FormData) {
  const { supabase, user } = await requireAdmin();
  const title = getValue(formData, "title");
  const slugSource = getValue(formData, "slug") || title;

  if (!title) {
    redirect(withMessage("/admin/courses", "Course title is required."));
  }

  const { data, error } = await supabase
    .from("courses")
    .insert({
      title,
      slug: slugify(slugSource),
      subtitle: getValue(formData, "subtitle") || null,
      description: getValue(formData, "description") || null,
      thumbnail_url: getValue(formData, "thumbnailUrl") || null,
      status: getStatus(formData),
      created_by: user.id,
    })
    .select("slug")
    .single();

  if (error || !data) {
    redirect(withMessage("/admin/courses", error?.message ?? "Could not create course."));
  }

  revalidatePath("/admin/courses");
  redirect(withMessage(`/admin/courses/${data.slug}`, "Course created."));
}

export async function updateCourseAction(
  courseId: string,
  currentSlug: string,
  formData: FormData,
) {
  const { supabase } = await requireAdmin();
  const title = getValue(formData, "title");
  const slugSource = getValue(formData, "slug") || title;

  if (!title) {
    redirect(withMessage(`/admin/courses/${currentSlug}`, "Course title is required."));
  }

  const nextSlug = slugify(slugSource);
  const { error } = await supabase
    .from("courses")
    .update({
      title,
      slug: nextSlug,
      subtitle: getValue(formData, "subtitle") || null,
      description: getValue(formData, "description") || null,
      thumbnail_url: getValue(formData, "thumbnailUrl") || null,
      status: getStatus(formData),
    })
    .eq("id", courseId);

  if (error) {
    redirect(withMessage(`/admin/courses/${currentSlug}`, error.message));
  }

  revalidatePath("/admin/courses");
  revalidatePath(`/admin/courses/${currentSlug}`);
  if (nextSlug !== currentSlug) {
    redirect(withMessage(`/admin/courses/${nextSlug}`, "Course updated."));
  }

  redirect(withMessage(`/admin/courses/${currentSlug}`, "Course updated."));
}

export async function createModuleAction(courseSlug: string, courseId: string, formData: FormData) {
  const { supabase } = await requireAdmin();
  const title = getValue(formData, "title");

  if (!title) {
    redirect(withMessage(`/admin/courses/${courseSlug}`, "Module title is required."));
  }

  const { error } = await supabase.from("modules").insert({
    course_id: courseId,
    title,
    description: getValue(formData, "description") || null,
    position: getPosition(formData, "position"),
    status: getStatus(formData),
  });

  if (error) {
    redirect(withMessage(`/admin/courses/${courseSlug}`, error.message));
  }

  revalidatePath(`/admin/courses/${courseSlug}`);
  redirect(
    withMessage(`/admin/courses/${courseSlug}`, "Module added.", {
      moduleAdded: "1",
      moduleFormKey: String(Date.now()),
    }),
  );
}

export async function updateModuleAction(
  courseSlug: string,
  moduleId: string,
  formData: FormData,
) {
  const { supabase } = await requireAdmin();
  const title = getValue(formData, "title");

  if (!title) {
    redirect(withMessage(`/admin/courses/${courseSlug}`, "Module title is required."));
  }

  const { error } = await supabase
    .from("modules")
    .update({
      title,
      description: getValue(formData, "description") || null,
      status: getStatus(formData),
    })
    .eq("id", moduleId);

  if (error) {
    redirect(withMessage(`/admin/courses/${courseSlug}`, error.message));
  }

  revalidatePath(`/admin/courses/${courseSlug}`);
  redirect(withMessage(`/admin/courses/${courseSlug}`, "Module updated."));
}

export async function moveModuleUpAction(courseSlug: string, moduleId: string) {
  await swapModulePosition(courseSlug, moduleId, "up");
}

export async function moveModuleDownAction(courseSlug: string, moduleId: string) {
  await swapModulePosition(courseSlug, moduleId, "down");
}

export async function createLessonAction(
  courseSlug: string,
  moduleId: string,
  formData: FormData,
) {
  const { supabase } = await requireAdmin();
  const title = getValue(formData, "title");

  if (!title) {
    redirect(withMessage(`/admin/courses/${courseSlug}`, "Lesson title is required."));
  }

  const { data, error } = await supabase
    .from("lessons")
    .insert({
      module_id: moduleId,
      title,
      slug: slugify(getValue(formData, "slug") || title),
      summary: getValue(formData, "summary") || null,
      thumbnail_url: getValue(formData, "thumbnailUrl") || null,
      position: getPosition(formData, "position"),
      status: getStatus(formData),
    })
    .select("id")
    .single();

  if (error || !data) {
    redirect(withMessage(`/admin/courses/${courseSlug}`, error?.message ?? "Could not create lesson."));
  }

  revalidatePath(`/admin/courses/${courseSlug}`);
  redirect(withMessage(`/admin/lessons/${data.id}`, "Lesson created."));
}

export async function moveLessonUpAction(courseSlug: string, lessonId: string) {
  await swapLessonPosition(courseSlug, lessonId, "up");
}

export async function moveLessonDownAction(courseSlug: string, lessonId: string) {
  await swapLessonPosition(courseSlug, lessonId, "down");
}

export async function updateLessonAction(
  lessonId: string,
  courseSlug: string,
  formData: FormData,
) {
  const { supabase } = await requireAdmin();
  const title = getValue(formData, "title");

  if (!title) {
    redirect(withMessage(`/admin/lessons/${lessonId}`, "Lesson title is required."));
  }

  const { error } = await supabase
    .from("lessons")
    .update({
      title,
      slug: slugify(getValue(formData, "slug") || title),
      summary: getValue(formData, "summary") || null,
      thumbnail_url: getValue(formData, "thumbnailUrl") || null,
      status: getStatus(formData),
    })
    .eq("id", lessonId);

  if (error) {
    redirect(withMessage(`/admin/lessons/${lessonId}`, error.message));
  }

  revalidatePath(`/admin/lessons/${lessonId}`);
  revalidatePath(`/admin/courses/${courseSlug}`);
  redirect(withMessage(`/admin/lessons/${lessonId}`, "Lesson updated."));
}

export async function createBlockAction(lessonId: string, formData: FormData) {
  const { supabase } = await requireAdmin();
  const blockType = getValue(formData, "blockType");

  const { error } = await supabase.from("lesson_blocks").insert({
    lesson_id: lessonId,
    block_type: blockType,
    title: getValue(formData, "title") || null,
    body: getValue(formData, "body") || null,
    media_provider: getValue(formData, "mediaProvider") || null,
    media_url: getValue(formData, "mediaUrl") || null,
    embed_url: getValue(formData, "embedUrl") || null,
    position: getPosition(formData, "position"),
  });

  if (error) {
    redirect(withMessage(`/admin/lessons/${lessonId}`, error.message));
  }

  revalidatePath(`/admin/lessons/${lessonId}`);
  redirect(withMessage(`/admin/lessons/${lessonId}`, "Content block added."));
}

export async function updateBlockAction(
  lessonId: string,
  blockId: string,
  formData: FormData,
) {
  const { supabase } = await requireAdmin();
  const { error } = await supabase
    .from("lesson_blocks")
    .update({
      block_type: getValue(formData, "blockType"),
      title: getValue(formData, "title") || null,
      body: getValue(formData, "body") || null,
      media_provider: getValue(formData, "mediaProvider") || null,
      media_url: getValue(formData, "mediaUrl") || null,
      embed_url: getValue(formData, "embedUrl") || null,
      position: getPosition(formData, "position"),
    })
    .eq("id", blockId);

  if (error) {
    redirect(withMessage(`/admin/lessons/${lessonId}`, error.message));
  }

  revalidatePath(`/admin/lessons/${lessonId}`);
  redirect(withMessage(`/admin/lessons/${lessonId}`, "Content block updated."));
}

export async function deleteBlockAction(lessonId: string, blockId: string) {
  const { supabase } = await requireAdmin();
  const { error } = await supabase.from("lesson_blocks").delete().eq("id", blockId);

  if (error) {
    redirect(withMessage(`/admin/lessons/${lessonId}`, error.message));
  }

  revalidatePath(`/admin/lessons/${lessonId}`);
  redirect(withMessage(`/admin/lessons/${lessonId}`, "Content block removed."));
}

export async function createDownloadAction(lessonId: string, formData: FormData) {
  const { supabase } = await requireAdmin();
  const title = getValue(formData, "title");
  const fileUrl = getValue(formData, "fileUrl");

  if (!title || !fileUrl) {
    redirect(withMessage(`/admin/lessons/${lessonId}`, "Download title and file are required."));
  }

  const { error } = await supabase.from("lesson_downloads").insert({
    lesson_id: lessonId,
    title,
    file_url: fileUrl,
    position: getPosition(formData, "position"),
  });

  if (error) {
    redirect(withMessage(`/admin/lessons/${lessonId}`, error.message));
  }

  revalidatePath(`/admin/lessons/${lessonId}`);
  redirect(withMessage(`/admin/lessons/${lessonId}`, "Download added."));
}

export async function updateDownloadAction(
  lessonId: string,
  downloadId: string,
  formData: FormData,
) {
  const { supabase } = await requireAdmin();
  const title = getValue(formData, "title");
  const fileUrl = getValue(formData, "fileUrl");

  if (!title || !fileUrl) {
    redirect(withMessage(`/admin/lessons/${lessonId}`, "Download title and file are required."));
  }

  const { error } = await supabase
    .from("lesson_downloads")
    .update({
      title,
      file_url: fileUrl,
      position: getPosition(formData, "position"),
    })
    .eq("id", downloadId);

  if (error) {
    redirect(withMessage(`/admin/lessons/${lessonId}`, error.message));
  }

  revalidatePath(`/admin/lessons/${lessonId}`);
  redirect(withMessage(`/admin/lessons/${lessonId}`, "Download updated."));
}

export async function deleteDownloadAction(lessonId: string, downloadId: string) {
  const { supabase } = await requireAdmin();
  const { error } = await supabase.from("lesson_downloads").delete().eq("id", downloadId);

  if (error) {
    redirect(withMessage(`/admin/lessons/${lessonId}`, error.message));
  }

  revalidatePath(`/admin/lessons/${lessonId}`);
  redirect(withMessage(`/admin/lessons/${lessonId}`, "Download removed."));
}
