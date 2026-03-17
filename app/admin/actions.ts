"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/utils/auth";
import { getRequestBaseUrl } from "@/utils/portal";
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

function getOneBasedPosition(formData: FormData, key: string) {
  const value = Number(formData.get(key) ?? "1");

  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, value - 1);
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
    redirect(withMessage(`/admin/courses/${courseSlug}`, "Topic not found."));
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
    redirect(withMessage(`/admin/courses/${courseSlug}`, "Topic is already at the edge."));
  }

  await supabase.from("modules").update({ position: -1 }).eq("id", moduleItem.id);
  await supabase
    .from("modules")
    .update({ position: moduleItem.position })
    .eq("id", adjacentModule.id);
  await supabase.from("modules").update({ position: adjacentModule.position }).eq("id", moduleItem.id);

  revalidatePath(`/admin/courses/${courseSlug}`);
  redirect(withMessage(`/admin/courses/${courseSlug}`, "Topic order updated."));
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

async function rebalanceLessonBlockPositions(
  supabase: Awaited<ReturnType<typeof requireAdmin>>["supabase"],
  lessonId: string,
  movingBlockId: string,
  requestedPosition: number,
) {
  const { data: blocks, error: blocksError } = await supabase
    .from("lesson_blocks")
    .select("id, position")
    .eq("lesson_id", lessonId)
    .order("position", { ascending: true })
    .order("id", { ascending: true });

  if (blocksError || !blocks) {
    return blocksError?.message ?? "Could not load lesson blocks.";
  }

  const orderedIds = blocks.map((block) => block.id);
  const currentIndex = orderedIds.indexOf(movingBlockId);

  if (currentIndex === -1) {
    return "Content block not found in lesson.";
  }

  orderedIds.splice(currentIndex, 1);
  const nextIndex = Math.max(0, Math.min(requestedPosition, orderedIds.length));
  orderedIds.splice(nextIndex, 0, movingBlockId);

  for (const [index, id] of orderedIds.entries()) {
    const { error } = await supabase.from("lesson_blocks").update({ position: index }).eq("id", id);

    if (error) {
      return error.message;
    }
  }

  return null;
}

async function swapBlockPosition(
  lessonId: string,
  blockId: string,
  direction: "up" | "down",
) {
  const { supabase } = await requireAdmin();
  const { data: block, error: blockError } = await supabase
    .from("lesson_blocks")
    .select("id, lesson_id, position")
    .eq("id", blockId)
    .maybeSingle();

  if (blockError || !block) {
    redirect(withMessage(`/admin/lessons/${lessonId}`, "Content block not found."));
  }

  const adjacentBlockQuery = supabase
    .from("lesson_blocks")
    .select("id, position")
    .eq("lesson_id", block.lesson_id)
    .order("position", { ascending: direction === "down" });

  const { data: adjacentBlock, error: adjacentError } =
    direction === "up"
      ? await adjacentBlockQuery.lt("position", block.position).limit(1).maybeSingle()
      : await adjacentBlockQuery.gt("position", block.position).limit(1).maybeSingle();

  if (adjacentError) {
    redirect(withMessage(`/admin/lessons/${lessonId}`, adjacentError.message));
  }

  if (!adjacentBlock) {
    redirect(withMessage(`/admin/lessons/${lessonId}`, "Content block is already at the edge."));
  }

  await supabase.from("lesson_blocks").update({ position: -1 }).eq("id", block.id);
  await supabase
    .from("lesson_blocks")
    .update({ position: block.position })
    .eq("id", adjacentBlock.id);
  await supabase
    .from("lesson_blocks")
    .update({ position: adjacentBlock.position })
    .eq("id", block.id);

  revalidatePath(`/admin/lessons/${lessonId}`);
  redirect(withMessage(`/admin/lessons/${lessonId}`, "Content block order updated."));
}

export async function createCourseAction(formData: FormData) {
  const { supabase, user, portal } = await requireAdmin();
  const title = getValue(formData, "title");

  if (!title) {
    redirect(withMessage("/admin/courses", "Course title is required."));
  }

  const { data, error } = await supabase
    .from("courses")
    .insert({
      title,
      slug: slugify(title),
      subtitle: getValue(formData, "subtitle") || null,
      description: getValue(formData, "description") || null,
      thumbnail_url: getValue(formData, "thumbnailUrl") || null,
      status: getStatus(formData),
      portal_id: portal.id,
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

  if (!title) {
    redirect(withMessage(`/admin/courses/${currentSlug}`, "Course title is required."));
  }

  const nextSlug = slugify(title);
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
    redirect(withMessage(`/admin/courses/${courseSlug}`, "Topic title is required."));
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
    withMessage(`/admin/courses/${courseSlug}`, "Topic added.", {
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
    redirect(withMessage(`/admin/courses/${courseSlug}`, "Topic title is required."));
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
  redirect(withMessage(`/admin/courses/${courseSlug}`, "Topic updated."));
}

export async function moveModuleUpAction(courseSlug: string, moduleId: string) {
  await swapModulePosition(courseSlug, moduleId, "up");
}

export async function moveModuleDownAction(courseSlug: string, moduleId: string) {
  await swapModulePosition(courseSlug, moduleId, "down");
}

export async function deleteModuleAction(courseSlug: string, moduleId: string) {
  const { supabase } = await requireAdmin();
  const { data: lessons, error: lessonsError } = await supabase
    .from("lessons")
    .select("id")
    .eq("module_id", moduleId);

  if (lessonsError) {
    redirect(withMessage(`/admin/courses/${courseSlug}`, lessonsError.message));
  }

  const lessonIds = (lessons ?? []).map((lesson) => lesson.id);

  if (lessonIds.length > 0) {
    const { error: blocksError } = await supabase
      .from("lesson_blocks")
      .delete()
      .in("lesson_id", lessonIds);

    if (blocksError) {
      redirect(withMessage(`/admin/courses/${courseSlug}`, blocksError.message));
    }

    const { error: downloadsError } = await supabase
      .from("lesson_downloads")
      .delete()
      .in("lesson_id", lessonIds);

    if (downloadsError) {
      redirect(withMessage(`/admin/courses/${courseSlug}`, downloadsError.message));
    }

    const { error: deleteLessonsError } = await supabase
      .from("lessons")
      .delete()
      .eq("module_id", moduleId);

    if (deleteLessonsError) {
      redirect(withMessage(`/admin/courses/${courseSlug}`, deleteLessonsError.message));
    }
  }

  const { error: moduleError } = await supabase.from("modules").delete().eq("id", moduleId);

  if (moduleError) {
    redirect(withMessage(`/admin/courses/${courseSlug}`, moduleError.message));
  }

  revalidatePath(`/admin/courses/${courseSlug}`);
  revalidatePath("/library");
  redirect(withMessage(`/admin/courses/${courseSlug}`, "Topic deleted."));
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
      slug: slugify(title),
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

export async function deleteLessonAction(courseSlug: string, lessonId: string) {
  const { supabase } = await requireAdmin();

  const { error: blocksError } = await supabase
    .from("lesson_blocks")
    .delete()
    .eq("lesson_id", lessonId);

  if (blocksError) {
    redirect(withMessage(`/admin/courses/${courseSlug}`, blocksError.message));
  }

  const { error: downloadsError } = await supabase
    .from("lesson_downloads")
    .delete()
    .eq("lesson_id", lessonId);

  if (downloadsError) {
    redirect(withMessage(`/admin/courses/${courseSlug}`, downloadsError.message));
  }

  const { error: lessonError } = await supabase.from("lessons").delete().eq("id", lessonId);

  if (lessonError) {
    redirect(withMessage(`/admin/courses/${courseSlug}`, lessonError.message));
  }

  revalidatePath(`/admin/courses/${courseSlug}`);
  revalidatePath(`/admin/lessons/${lessonId}`);
  revalidatePath("/library");
  redirect(withMessage(`/admin/courses/${courseSlug}`, "Lesson deleted."));
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
      slug: slugify(title),
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
  const requestedPosition = getOneBasedPosition(formData, "position");

  const { data, error } = await supabase
    .from("lesson_blocks")
    .insert({
      lesson_id: lessonId,
      block_type: blockType,
      title: getValue(formData, "title") || null,
      body: getValue(formData, "body") || null,
      media_provider: getValue(formData, "mediaProvider") || null,
      media_url: getValue(formData, "mediaUrl") || null,
      embed_url: getValue(formData, "embedUrl") || null,
      position: requestedPosition,
    })
    .select("id")
    .single();

  if (error || !data) {
    redirect(withMessage(`/admin/lessons/${lessonId}`, error.message));
  }

  const rebalanceError = await rebalanceLessonBlockPositions(
    supabase,
    lessonId,
    data.id,
    requestedPosition,
  );

  if (rebalanceError) {
    redirect(withMessage(`/admin/lessons/${lessonId}`, rebalanceError));
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
  const requestedPosition = getOneBasedPosition(formData, "position");
  const { error } = await supabase
    .from("lesson_blocks")
    .update({
      block_type: getValue(formData, "blockType"),
      title: getValue(formData, "title") || null,
      body: getValue(formData, "body") || null,
      media_provider: getValue(formData, "mediaProvider") || null,
      media_url: getValue(formData, "mediaUrl") || null,
      embed_url: getValue(formData, "embedUrl") || null,
      position: requestedPosition,
    })
    .eq("id", blockId);

  if (error) {
    redirect(withMessage(`/admin/lessons/${lessonId}`, error.message));
  }

  const rebalanceError = await rebalanceLessonBlockPositions(
    supabase,
    lessonId,
    blockId,
    requestedPosition,
  );

  if (rebalanceError) {
    redirect(withMessage(`/admin/lessons/${lessonId}`, rebalanceError));
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

export async function moveBlockUpAction(lessonId: string, blockId: string) {
  await swapBlockPosition(lessonId, blockId, "up");
}

export async function moveBlockDownAction(lessonId: string, blockId: string) {
  await swapBlockPosition(lessonId, blockId, "down");
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
  const { supabase, portal } = await requireAdmin();
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

  const { data: availableCourses, error: availableCoursesError } = await supabase
    .from("courses")
    .select("id")
    .eq("portal_id", portal.id)
    .in("id", courseIds);

  if (availableCoursesError) {
    redirect(withMessage("/admin/enrollments", availableCoursesError.message));
  }

  if ((availableCourses ?? []).length !== courseIds.length) {
    redirect(withMessage("/admin/enrollments", "Choose courses from the current portal only."));
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
    const { data: existingMembership, error: membershipLookupError } = await adminSupabase
      .from("portal_memberships")
      .select("id")
      .eq("portal_id", portal.id)
      .eq("user_id", existingProfile.id)
      .maybeSingle();

    if (membershipLookupError) {
      redirect(withMessage("/admin/enrollments", membershipLookupError.message));
    }

    if (!existingMembership) {
      const { error: membershipError } = await adminSupabase.from("portal_memberships").insert({
        portal_id: portal.id,
        user_id: existingProfile.id,
        role: "member",
      });

      if (membershipError) {
        redirect(withMessage("/admin/enrollments", membershipError.message));
      }
    }

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
  const redirectTo = `${getRequestBaseUrl()}/auth/callback?next=${nextPath}`;

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

  const { error: membershipError } = await adminSupabase.from("portal_memberships").insert({
    portal_id: portal.id,
    user_id: invitedUserId,
    role: "member",
  });

  if (membershipError && membershipError.code !== "23505") {
    redirect(withMessage("/admin/enrollments", membershipError.message));
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

export async function sendMemberSetupEmailAction(userId: string, formData: FormData) {
  const { supabase } = await requireAdmin();
  const adminSupabase = createAdminClient();
  const returnPath = getReturnPath(formData, "/admin/enrollments");

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("email")
    .eq("id", userId)
    .maybeSingle();

  if (profileError) {
    redirect(withMessage(returnPath, profileError.message));
  }

  if (!profile?.email) {
    redirect(withMessage(returnPath, "Member email not found."));
  }

  const { data: authUser, error: authUserError } = await adminSupabase.auth.admin.getUserById(userId);

  if (authUserError) {
    redirect(withMessage(returnPath, authUserError.message));
  }

  if (!authUser.user?.email) {
    redirect(withMessage(returnPath, "Auth account not found for this member."));
  }

  const nextPath = encodeURIComponent(
    "/create-account?message=Create+your+password+to+finish+setting+up+your+account.",
  );
  const redirectTo = `${getRequestBaseUrl()}/auth/callback?next=${nextPath}`;
  const { error } = await supabase.auth.resetPasswordForEmail(authUser.user.email, {
    redirectTo,
  });

  if (error) {
    redirect(withMessage(returnPath, error.message));
  }

  redirect(
    withMessage(
      returnPath,
      "Setup email sent. The member can use it to create or reset their password.",
    ),
  );
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
