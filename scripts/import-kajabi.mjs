import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { createClient } from "@supabase/supabase-js";

async function loadLocalEnv() {
  const envPath = path.resolve(process.cwd(), ".env.local");

  try {
    const contents = await fs.readFile(envPath, "utf8");

    for (const line of contents.split("\n")) {
      const trimmed = line.trim();

      if (!trimmed || trimmed.startsWith("#")) {
        continue;
      }

      const separatorIndex = trimmed.indexOf("=");

      if (separatorIndex === -1) {
        continue;
      }

      const key = trimmed.slice(0, separatorIndex).trim();
      const rawValue = trimmed.slice(separatorIndex + 1).trim();
      const value = rawValue.replace(/^['"]|['"]$/g, "");

      if (!process.env[key]) {
        process.env[key] = value;
      }
    }
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
      return;
    }

    throw error;
  }
}

function slugify(value) {
  return String(value ?? "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function parseArgs(argv) {
  const args = {
    dryRun: false,
    file: "",
  };

  for (const arg of argv) {
    if (arg === "--dry-run") {
      args.dryRun = true;
      continue;
    }

    if (!args.file) {
      args.file = arg;
    }
  }

  return args;
}

function ensureArray(value) {
  return Array.isArray(value) ? value : [];
}

function normalizeDropboxSourceUrl(sourceUrl) {
  const parsedUrl = new URL(sourceUrl);

  if (!parsedUrl.hostname.includes("dropbox.com")) {
    return sourceUrl;
  }

  parsedUrl.searchParams.delete("raw");
  parsedUrl.searchParams.set("dl", "1");
  return parsedUrl.toString();
}

function normalizeBlock(block, index) {
  const type = block.type === "rich_text" ? "rich_text" : block.type;
  const supportedTypes = new Set(["video", "audio", "rich_text", "download"]);

  if (!supportedTypes.has(type)) {
    throw new Error(`Unsupported lesson block type: ${block.type}`);
  }

  const sourceUrl = block.sourceUrl ?? block.dropboxUrl ?? null;

  return {
    block_type: type,
    title: block.title ?? null,
    body: block.body ?? null,
    media_provider: block.mediaProvider ?? null,
    media_url: block.mediaUrl ?? null,
    embed_url: block.embedUrl ?? null,
    source_url: sourceUrl ? normalizeDropboxSourceUrl(sourceUrl) : null,
    position: Number.isFinite(block.position) ? block.position : index,
  };
}

function normalizeDownload(download, index) {
  if (!download.title || !download.fileUrl) {
    throw new Error("Each lesson download requires title and fileUrl.");
  }

  return {
    title: download.title,
    file_url: download.fileUrl,
    position: Number.isFinite(download.position) ? download.position : index,
  };
}

function normalizeLesson(lesson, index) {
  if (!lesson.title) {
    throw new Error("Each lesson requires a title.");
  }

  return {
    title: lesson.title,
    slug: slugify(lesson.slug || lesson.title),
    summary: lesson.summary ?? null,
    thumbnail_url: lesson.thumbnailUrl ?? null,
    status: lesson.status === "published" ? "published" : "draft",
    position: Number.isFinite(lesson.position) ? lesson.position : index,
    blocks: ensureArray(lesson.blocks).map(normalizeBlock),
    downloads: ensureArray(lesson.downloads).map(normalizeDownload),
  };
}

function normalizeModule(moduleItem, index) {
  if (!moduleItem.title) {
    throw new Error("Each module requires a title.");
  }

  return {
    title: moduleItem.title,
    description: moduleItem.description ?? null,
    status: moduleItem.status === "published" ? "published" : "draft",
    position: Number.isFinite(moduleItem.position) ? moduleItem.position : index,
    lessons: ensureArray(moduleItem.lessons).map(normalizeLesson),
  };
}

function normalizeCourse(course, index) {
  if (!course.title) {
    throw new Error("Each course requires a title.");
  }

  return {
    title: course.title,
    slug: slugify(course.slug || course.title || `course-${index + 1}`),
    subtitle: course.subtitle ?? null,
    description: course.description ?? null,
    thumbnail_url: course.thumbnailUrl ?? null,
    status: course.status === "published" ? "published" : "draft",
    course_type: course.courseType ?? "evergreen",
    modules: ensureArray(course.modules).map(normalizeModule),
    enrollments: ensureArray(course.enrollments).map((enrollment) => ({
      email: String(enrollment.email ?? "").trim().toLowerCase(),
      status: enrollment.status === "revoked" ? "revoked" : "active",
    })),
  };
}

function summarizeImport(courses) {
  return courses.reduce(
    (summary, course) => {
      summary.courses += 1;
      summary.modules += course.modules.length;

      for (const moduleItem of course.modules) {
        summary.lessons += moduleItem.lessons.length;

        for (const lesson of moduleItem.lessons) {
          summary.blocks += lesson.blocks.length;
          summary.downloads += lesson.downloads.length;
        }
      }

      summary.enrollments += course.enrollments.length;
      return summary;
    },
    {
      courses: 0,
      modules: 0,
      lessons: 0,
      blocks: 0,
      downloads: 0,
      enrollments: 0,
    },
  );
}

async function readImportFile(filePath) {
  const fullPath = path.resolve(process.cwd(), filePath);
  const contents = await fs.readFile(fullPath, "utf8");
  const payload = JSON.parse(contents);
  const normalizedCourses = ensureArray(payload.courses).map(normalizeCourse);

  if (normalizedCourses.length === 0) {
    throw new Error("Import file must contain at least one course.");
  }

  return {
    filePath: fullPath,
    courses: normalizedCourses,
  };
}

async function copyVideoToCloudflareStream(block, context) {
  const {
    cloudflareAccountId,
    cloudflareApiToken,
    cloudflareCustomerCode,
    courseTitle,
    lessonTitle,
  } = context;

  if (!block.source_url) {
    return block;
  }

  if (!cloudflareAccountId || !cloudflareApiToken || !cloudflareCustomerCode) {
    throw new Error(
      `Cloudflare env vars are required to import sourceUrl videos for "${lessonTitle}" in "${courseTitle}".`,
    );
  }

  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${cloudflareAccountId}/stream/copy`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${cloudflareApiToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url: block.source_url,
        meta: {
          name: block.title ?? lessonTitle,
          "downloaded-from": block.source_url,
        },
      }),
    },
  );

  const payload = await response.json();

  if (!response.ok || !payload.success || !payload.result?.uid) {
    throw new Error(
      `Cloudflare copy failed for "${lessonTitle}" in "${courseTitle}": ${
        payload.errors?.[0]?.message ?? "unknown error"
      }`,
    );
  }

  return {
    ...block,
    media_provider: "cloudflare-stream",
    media_url: payload.result.uid,
    embed_url: `https://customer-${cloudflareCustomerCode}.cloudflarestream.com/${payload.result.uid}/iframe`,
  };
}

async function resolveLessonBlocks(lesson, context) {
  const resolvedBlocks = [];

  for (const block of lesson.blocks) {
    if (block.block_type === "video" && block.source_url) {
      resolvedBlocks.push(await copyVideoToCloudflareStream(block, context));
      continue;
    }

    resolvedBlocks.push(block);
  }

  return resolvedBlocks;
}

async function importCourses(supabase, courses, cloudflareConfig) {
  const warnings = [];

  for (const course of courses) {
    const { data: upsertedCourse, error: courseError } = await supabase
      .from("courses")
      .upsert(
        {
          slug: course.slug,
          title: course.title,
          subtitle: course.subtitle,
          description: course.description,
          thumbnail_url: course.thumbnail_url,
          status: course.status,
          course_type: course.course_type,
        },
        {
          onConflict: "slug",
        },
      )
      .select("id, slug")
      .single();

    if (courseError || !upsertedCourse) {
      throw new Error(
        `Could not upsert course "${course.title}": ${courseError?.message ?? "unknown error"}`,
      );
    }

    const courseId = upsertedCourse.id;

    const { error: deleteModulesError } = await supabase
      .from("modules")
      .delete()
      .eq("course_id", courseId);

    if (deleteModulesError) {
      throw new Error(
        `Could not reset modules for "${course.title}": ${deleteModulesError.message}`,
      );
    }

    for (const moduleItem of course.modules) {
      const { data: createdModule, error: moduleError } = await supabase
        .from("modules")
        .insert({
          course_id: courseId,
          title: moduleItem.title,
          description: moduleItem.description,
          position: moduleItem.position,
          status: moduleItem.status,
        })
        .select("id")
        .single();

      if (moduleError || !createdModule) {
        throw new Error(
          `Could not create module "${moduleItem.title}" in "${course.title}": ${moduleError?.message ?? "unknown error"}`,
        );
      }

      for (const lesson of moduleItem.lessons) {
        const { data: createdLesson, error: lessonError } = await supabase
          .from("lessons")
          .insert({
            module_id: createdModule.id,
            slug: lesson.slug,
            title: lesson.title,
            summary: lesson.summary,
            thumbnail_url: lesson.thumbnail_url,
            position: lesson.position,
            status: lesson.status,
          })
          .select("id")
          .single();

        if (lessonError || !createdLesson) {
          throw new Error(
            `Could not create lesson "${lesson.title}" in "${course.title}": ${lessonError?.message ?? "unknown error"}`,
          );
        }

        const resolvedBlocks = await resolveLessonBlocks(lesson, {
          ...cloudflareConfig,
          courseTitle: course.title,
          lessonTitle: lesson.title,
        });

        if (resolvedBlocks.length > 0) {
          const { error: blockError } = await supabase.from("lesson_blocks").insert(
            resolvedBlocks.map((block) => ({
              block_type: block.block_type,
              title: block.title,
              body: block.body,
              media_provider: block.media_provider,
              media_url: block.media_url,
              embed_url: block.embed_url,
              position: block.position,
              lesson_id: createdLesson.id,
            })),
          );

          if (blockError) {
            throw new Error(
              `Could not create blocks for lesson "${lesson.title}": ${blockError.message}`,
            );
          }
        }

        if (lesson.downloads.length > 0) {
          const { error: downloadError } = await supabase.from("lesson_downloads").insert(
            lesson.downloads.map((download) => ({
              ...download,
              lesson_id: createdLesson.id,
            })),
          );

          if (downloadError) {
            throw new Error(
              `Could not create downloads for lesson "${lesson.title}": ${downloadError.message}`,
            );
          }
        }
      }
    }

    for (const enrollment of course.enrollments) {
      if (!enrollment.email) {
        warnings.push(`Skipped blank enrollment email for "${course.title}".`);
        continue;
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("id")
        .eq("email", enrollment.email)
        .maybeSingle();

      if (profileError) {
        throw new Error(
          `Could not look up profile for ${enrollment.email}: ${profileError.message}`,
        );
      }

      if (!profile) {
        warnings.push(
          `Skipped enrollment for ${enrollment.email} in "${course.title}" because no matching profile exists.`,
        );
        continue;
      }

      const { error: enrollmentError } = await supabase.from("course_enrollments").upsert(
        {
          course_id: courseId,
          user_id: profile.id,
          status: enrollment.status,
        },
        {
          onConflict: "course_id,user_id",
        },
      );

      if (enrollmentError) {
        throw new Error(
          `Could not upsert enrollment for ${enrollment.email} in "${course.title}": ${enrollmentError.message}`,
        );
      }
    }
  }

  return warnings;
}

async function main() {
  const { dryRun, file } = parseArgs(process.argv.slice(2));

  await loadLocalEnv();

  if (!file) {
    throw new Error("Usage: node scripts/import-kajabi.mjs <file> [--dry-run]");
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const cloudflareAccountId = process.env.CLOUDFLARE_STREAM_ACCOUNT_ID;
  const cloudflareApiToken = process.env.CLOUDFLARE_STREAM_API_TOKEN;
  const cloudflareCustomerCode = process.env.CLOUDFLARE_STREAM_CUSTOMER_CODE;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set to run imports.",
    );
  }

  const { filePath, courses } = await readImportFile(file);
  const summary = summarizeImport(courses);

  console.log(`Import file: ${filePath}`);
  console.log("Summary:", summary);

  if (dryRun) {
    console.log("Dry run complete. No data was written.");
    return;
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const warnings = await importCourses(supabase, courses, {
    cloudflareAccountId,
    cloudflareApiToken,
    cloudflareCustomerCode,
  });

  console.log("Import complete.");

  if (warnings.length > 0) {
    console.log("Warnings:");
    for (const warning of warnings) {
      console.log(`- ${warning}`);
    }
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
