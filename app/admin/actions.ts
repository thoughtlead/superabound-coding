"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/utils/auth";
import { createAdminClient } from "@/utils/supabase/admin";

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

function getMultiValues(formData: FormData, key: string) {
  return formData
    .getAll(key)
    .map((value) => String(value).trim())
    .filter(Boolean);
}

function getReturnPath(formData: FormData, fallbackPath: string) {
  const returnTo = getValue(formData, "returnTo");
  return returnTo.startsWith("/") ? returnTo : fallbackPath;
}

function getBaseUrl() {
  const headerStore = headers();
  const forwardedProto = headerStore.get("x-forwarded-proto");
  const forwardedHost = headerStore.get("x-forwarded-host");
  const host = forwardedHost ?? headerStore.get("host");

  if (host) {
    return `${forwardedProto ?? "https"}://${host}`;
  }

  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL;
  }

  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }

  return "http://localhost:3000";
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
    .order("position", { ascending: direction === "down" });
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
    .order("position", { ascending: direction === "down" });
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
    redirect(
      withMessage(`/admin/courses/${nextSlug}`, "Course updated.", {
        courseSaved: "1",
      }),
    );
  }

  redirect(
    withMessage(`/admin/courses/${currentSlug}`, "Course updated.", {
      courseSaved: "1",
    }),
  );
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
  redirect(
    withMessage(`/admin/lessons/${lessonId}`, "Content block updated.", {
      blockUpdated: blockId,
    }),
  );
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

export async function createEnrollmentAction(formData: FormData) {
  const { supabase } = await requireAdmin();
  const courseId = getValue(formData, "courseId");
  const userId = getValue(formData, "userId");
  const returnPath = getReturnPath(formData, "/admin/enrollments");

  if (!courseId || !userId) {
    redirect(withMessage(returnPath, "Choose both a user and a course."));
  }

  const { error } = await supabase.from("course_enrollments").upsert(
    {
      course_id: courseId,
      user_id: userId,
      status: "active",
    },
    {
      onConflict: "course_id,user_id",
    },
  );

  if (error) {
    redirect(withMessage(returnPath, error.message));
  }

  revalidatePath("/admin/enrollments");
  revalidatePath("/library");
  redirect(withMessage(returnPath, "Enrollment granted."));
}

export async function inviteMemberAction(formData: FormData) {
  await requireAdmin();
  const adminSupabase = createAdminClient();
  const email = getValue(formData, "email").toLowerCase();
  const fullName = getValue(formData, "fullName");
  const courseIds = getMultiValues(formData, "courseIds");

  if (!email || !fullName) {
    redirect(withMessage("/admin/enrollments", "Name and email are required."));
  }

  if (courseIds.length === 0) {
    redirect(withMessage("/admin/enrollments", "Choose at least one course to enable."));
  }

  const { data: existingProfile, error: existingProfileError } = await adminSupabase
    .from("profiles")
    .select("id")
    .eq("email", email)
    .maybeSingle();

  if (existingProfileError) {
    redirect(withMessage("/admin/enrollments", existingProfileError.message));
  }

  if (existingProfile) {
    await adminSupabase.from("profiles").update({ full_name: fullName }).eq("id", existingProfile.id);

    const { error: existingEnrollmentError } = await adminSupabase
      .from("course_enrollments")
      .upsert(
        courseIds.map((courseId) => ({
          course_id: courseId,
          user_id: existingProfile.id,
          status: "active" as const,
        })),
        {
          onConflict: "course_id,user_id",
        },
      );

    if (existingEnrollmentError) {
      redirect(withMessage("/admin/enrollments", existingEnrollmentError.message));
    }

    revalidatePath("/admin/enrollments");
    revalidatePath("/library");
    redirect(
      withMessage(
        "/admin/enrollments",
        "Member already existed. Selected courses have been enabled.",
      ),
    );
  }

  const nextPath = encodeURIComponent(
    "/create-account?message=Create+your+password+to+finish+setting+up+your+account.",
  );
  const redirectTo = `${getBaseUrl()}/auth/callback?next=${nextPath}`;

  const { data: inviteData, error: inviteError } = await adminSupabase.auth.admin.inviteUserByEmail(
    email,
    {
      data: {
        full_name: fullName,
      },
      redirectTo,
    },
  );

  if (inviteError || !inviteData.user) {
    redirect(withMessage("/admin/enrollments", inviteError?.message ?? "Could not invite member."));
  }

  const invitedUserId = inviteData.user.id;

  const { error: profileError } = await adminSupabase.from("profiles").upsert(
    {
      id: invitedUserId,
      full_name: fullName,
      email,
      role: "member",
    },
    {
      onConflict: "id",
    },
  );

  if (profileError) {
    redirect(withMessage("/admin/enrollments", profileError.message));
  }

  const { error: enrollmentError } = await adminSupabase.from("course_enrollments").upsert(
    courseIds.map((courseId) => ({
      course_id: courseId,
      user_id: invitedUserId,
      status: "active" as const,
    })),
    {
      onConflict: "course_id,user_id",
    },
  );

  if (enrollmentError) {
    redirect(withMessage("/admin/enrollments", enrollmentError.message));
  }

    revalidatePath("/admin/enrollments");
    revalidatePath("/library");
    redirect(
      withMessage(
        "/admin/enrollments",
        "Invite sent. The member will receive an email to set up their account, and their course access is already enabled.",
      ),
    );
}

export async function updateEnrollmentStatusAction(
  enrollmentId: string,
  nextStatus: "active" | "revoked",
  formData: FormData,
) {
  const { supabase } = await requireAdmin();
  const returnPath = getReturnPath(formData, "/admin/enrollments");
  const { error } = await supabase
    .from("course_enrollments")
    .update({ status: nextStatus })
    .eq("id", enrollmentId);

  if (error) {
    redirect(withMessage(returnPath, error.message));
  }

  revalidatePath("/admin/enrollments");
  revalidatePath("/library");
  redirect(
    withMessage(
      returnPath,
      nextStatus === "active" ? "Enrollment restored." : "Enrollment revoked.",
    ),
  );
}

export async function updateUserNameAction(userId: string, formData: FormData) {
  const { supabase } = await requireAdmin();
  const fullName = getValue(formData, "fullName");
  const returnPath = getReturnPath(formData, "/admin/enrollments");

  if (!fullName) {
    redirect(withMessage(returnPath, "Name is required."));
  }

  const { error } = await supabase
    .from("profiles")
    .update({ full_name: fullName })
    .eq("id", userId);

  if (error) {
    redirect(withMessage(returnPath, error.message));
  }

  revalidatePath("/admin/enrollments");
  revalidatePath("/account");
  redirect(withMessage(returnPath, "Member name updated."));
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
