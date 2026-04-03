"use client";
/* eslint-disable @next/next/no-img-element */

import { ChangeEvent, useEffect, useId, useRef, useState } from "react";
import * as tus from "tus-js-client";

type CloudflareVideoUploadFieldProps = {
  currentEmbedUrl?: string | null;
  onUploaded: (values: {
    embedUrl: string;
    mediaProvider: string;
    mediaUrl: string;
  }) => void;
};

type UploadedVideoValues = {
  embedUrl: string;
  mediaProvider: string;
  mediaUrl: string;
};

type PreviewState = "idle" | "uploading" | "processing" | "ready" | "error";

type CloudflareVideoStatus = {
  errorReasonCode: string | null;
  errorReasonText: string | null;
  pctComplete: number | string | null;
  previewUrl: string | null;
  readyToStream: boolean;
  state: string | null;
  step: string | null;
  thumbnailUrl: string | null;
};

const STATUS_POLL_INTERVAL_MS = 5000;
const UPLOAD_CHUNK_SIZE_BYTES = 8 * 1024 * 1024;
const UPLOAD_RETRY_DELAYS_MS = [0, 1_000, 3_000, 5_000, 10_000, 20_000, 30_000, 60_000];
const UPLOAD_METADATA_STORAGE_KEY = "cloudflare-stream-upload-metadata";

function getUploadErrorMessage(error: unknown) {
  const message =
    error instanceof Error ? error.message : "Cloudflare upload failed.";

  if (message.includes("Storage capacity exceeded") || message.includes("code: 10011")) {
    const quotaMatch = message.match(/uploaded ([0-9.]+) minutes and are allocated ([0-9.]+) minutes/i);

    if (quotaMatch) {
      return `Cloudflare Stream is still reporting this account as over quota (${quotaMatch[1]} uploaded / ${quotaMatch[2]} allocated). If you just added storage, wait a few minutes and try again. If it still fails, refresh Cloudflare billing/usage or delete unused videos.`;
    }

    return "Cloudflare Stream is still reporting this account as over quota. If you just added storage, wait a few minutes and try again. If it still fails, refresh Cloudflare billing/usage or delete unused videos.";
  }

  if (message.includes("response code: 413")) {
    return "Cloudflare rejected the upload before it started. This usually means the account is still over quota or the new storage has not propagated yet.";
  }

  return message || "Cloudflare upload failed.";
}

function formatProcessingMessage(status: CloudflareVideoStatus) {
  if (status.readyToStream) {
    return "Video is ready to stream.";
  }

  if (status.errorReasonText) {
    return `Cloudflare processing failed: ${status.errorReasonText}`;
  }

  const progress =
    status.pctComplete !== null && status.pctComplete !== undefined
      ? ` (${status.pctComplete}%)`
      : "";

  if (status.state || status.step) {
    return `Upload complete. Cloudflare is processing the video${progress}.${status.step ? ` ${status.step}.` : ""}`;
  }

  return `Upload complete. Cloudflare is processing the video${progress}.`;
}

function readStoredUploadMetadata() {
  if (typeof window === "undefined") {
    return {};
  }

  try {
    return JSON.parse(window.localStorage.getItem(UPLOAD_METADATA_STORAGE_KEY) ?? "{}") as Record<
      string,
      UploadedVideoValues
    >;
  } catch {
    return {};
  }
}

function storeUploadMetadata(uploadUrl: string, values: UploadedVideoValues) {
  if (typeof window === "undefined" || !uploadUrl) {
    return;
  }

  const nextValue = {
    ...readStoredUploadMetadata(),
    [uploadUrl]: values,
  };

  window.localStorage.setItem(UPLOAD_METADATA_STORAGE_KEY, JSON.stringify(nextValue));
}

function getStoredUploadMetadata(uploadUrl: string | null | undefined) {
  if (!uploadUrl) {
    return null;
  }

  return readStoredUploadMetadata()[uploadUrl] ?? null;
}

function getUploadedVideoValuesFromUploadUrl(uploadUrl: string | null | undefined) {
  if (!uploadUrl) {
    return null;
  }

  try {
    const url = new URL(uploadUrl);
    const mediaId = url.pathname.split("/").filter(Boolean).pop();

    if (!mediaId) {
      return null;
    }

    return {
      embedUrl: "",
      mediaProvider: "cloudflare-stream",
      mediaUrl: mediaId,
    } satisfies UploadedVideoValues;
  } catch {
    return null;
  }
}

export function CloudflareVideoUploadField({
  currentEmbedUrl,
  onUploaded,
}: CloudflareVideoUploadFieldProps) {
  const fileInputId = useId();
  const [message, setMessage] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [processingStatus, setProcessingStatus] = useState<CloudflareVideoStatus | null>(null);
  const [previewState, setPreviewState] = useState<PreviewState>(
    currentEmbedUrl ? "ready" : "idle",
  );
  const [selectedFileName, setSelectedFileName] = useState("");
  const uploadRef = useRef<tus.Upload | null>(null);
  const uploadedVideoRef = useRef<UploadedVideoValues | null>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!currentEmbedUrl) {
      if (previewState === "ready") {
        setPreviewState("idle");
      }
      return;
    }

    if (previewState === "idle") {
      setPreviewState("ready");
    }
  }, [currentEmbedUrl, previewState]);

  const pollVideoStatus = async (mediaId: string) => {
    while (isMountedRef.current) {
      const response = await fetch(
        `/api/admin/cloudflare-stream/video-status?mediaId=${encodeURIComponent(mediaId)}`,
        {
          cache: "no-store",
        },
      );
      const payload = (await response.json()) as CloudflareVideoStatus | { error: string };

      if (!response.ok || "error" in payload) {
        if (isMountedRef.current) {
          setMessage(
            "error" in payload ? payload.error : "Could not fetch Cloudflare processing status.",
          );
          setProcessingStatus(null);
          setPreviewState("error");
        }
        return;
      }

      if (!isMountedRef.current) {
        return;
      }

      setProcessingStatus(payload);
      setMessage(formatProcessingMessage(payload));

      if (payload.readyToStream) {
        setPreviewState("ready");
        return;
      }

      if (payload.errorReasonText) {
        setPreviewState("error");
        return;
      }

      await new Promise((resolve) => {
        window.setTimeout(resolve, STATUS_POLL_INTERVAL_MS);
      });
    }
  };

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    const input = event.currentTarget;

    if (!file) {
      return;
    }

    setSelectedFileName(file.name);
    setUploading(true);
    setPreviewState("uploading");
    setMessage(null);
    setProgress(0);
    setProcessingStatus(null);
    uploadedVideoRef.current = null;

    const upload = new tus.Upload(file, {
      endpoint: "/api/admin/cloudflare-stream/direct-upload",
      chunkSize: UPLOAD_CHUNK_SIZE_BYTES,
      retryDelays: UPLOAD_RETRY_DELAYS_MS,
      removeFingerprintOnSuccess: true,
      metadata: {
        filename: file.name,
        filetype: file.type,
      },
      onAfterResponse(request, response) {
        const isCreationResponse =
          request.getMethod() === "POST" &&
          request.getURL().includes("/api/admin/cloudflare-stream/direct-upload");

        if (!isCreationResponse) {
          return;
        }

        const mediaId = response.getHeader("stream-media-id");
        const embedUrl = response.getHeader("x-cloudflare-embed-url");
        const uploadUrl = response.getHeader("Location");

        if (typeof mediaId === "string" && mediaId.length > 0) {
          const uploadedVideo = {
            embedUrl:
              typeof embedUrl === "string" ? embedUrl : "",
            mediaProvider: "cloudflare-stream",
            mediaUrl: mediaId,
          };

          uploadedVideoRef.current = uploadedVideo;

          if (typeof uploadUrl === "string" && uploadUrl.length > 0) {
            storeUploadMetadata(uploadUrl, uploadedVideo);
          }
        }
      },
      onError(error) {
        if (!isMountedRef.current) {
          return;
        }

        setMessage(getUploadErrorMessage(error));
        setUploading(false);
        setProgress(null);
        setProcessingStatus(null);
        setPreviewState("error");
        input.value = "";
      },
      onProgress(bytesUploaded, bytesTotal) {
        if (!isMountedRef.current) {
          return;
        }

        setProgress(Math.round((bytesUploaded / bytesTotal) * 100));
      },
      async onSuccess() {
        const uploadedVideo = uploadedVideoRef.current;

        if (!uploadedVideo) {
          if (!isMountedRef.current) {
            return;
          }

          setMessage("Video uploaded, but Cloudflare did not return a video ID.");
          setUploading(false);
          setProgress(null);
          setPreviewState("error");
          input.value = "";
          return;
        }

        onUploaded(uploadedVideo);

        if (!isMountedRef.current) {
          return;
        }

        setUploading(false);
        setProgress(100);
        setPreviewState("processing");
        setMessage("Upload complete. Checking Cloudflare processing status...");
        input.value = "";

        await pollVideoStatus(uploadedVideo.mediaUrl);
      },
    });

    uploadRef.current = upload;

    try {
      const previousUploads = await upload.findPreviousUploads();

      if (previousUploads.length > 0) {
        const resumedUploadValues =
          getStoredUploadMetadata(previousUploads[0].uploadUrl) ??
          getUploadedVideoValuesFromUploadUrl(previousUploads[0].uploadUrl);

        if (resumedUploadValues) {
          uploadedVideoRef.current = resumedUploadValues;
        }

        upload.resumeFromPreviousUpload(previousUploads[0]);
      }

      upload.start();
    } catch (error) {
      const messageText =
        error instanceof Error ? error.message : "Could not start Cloudflare upload.";
      setMessage(messageText);
      setUploading(false);
      setProgress(null);
      setProcessingStatus(null);
      setPreviewState("error");
      input.value = "";
    }
  };

  const handleCancelUpload = async () => {
    const upload = uploadRef.current;

    if (!upload) {
      return;
    }

    await upload.abort();
    uploadRef.current = null;
    setUploading(false);
    setProgress(null);
    setProcessingStatus(null);
    setPreviewState(currentEmbedUrl ? "ready" : "idle");
    setMessage("Upload canceled.");
  };

  const showPreviewFrame = Boolean(currentEmbedUrl) && previewState === "ready";
  const showProcessingPreview =
    previewState === "uploading" ||
    previewState === "processing" ||
    previewState === "error";

  return (
    <div className="upload-field">
      <label>Cloudflare video upload</label>
      {showPreviewFrame ? (
        <div className="media-frame">
          <iframe
            allow="autoplay; fullscreen; picture-in-picture"
            allowFullScreen
            src={currentEmbedUrl ?? undefined}
            title="Cloudflare video preview"
          />
        </div>
      ) : null}
      {showProcessingPreview ? (
        <div className="upload-preview-state">
          {processingStatus?.thumbnailUrl ? (
            <img
              alt="Cloudflare video thumbnail"
              className="upload-preview-thumbnail"
              src={processingStatus.thumbnailUrl}
            />
          ) : (
            <div className="upload-preview-placeholder">
              <strong>Video uploaded</strong>
              <span>
                {previewState === "error"
                  ? "Cloudflare has not finished preparing this video yet."
                  : "Cloudflare is preparing the video for playback."}
              </span>
            </div>
          )}
        </div>
      ) : null}
      <div className="upload-actions">
        <input
          accept="video/*"
          className="file-picker-input"
          id={fileInputId}
          onChange={handleFileChange}
          type="file"
        />
        <label className="button button-secondary file-picker-button" htmlFor={fileInputId}>
          Choose video
        </label>
        {uploading ? (
          <button className="button button-secondary" onClick={handleCancelUpload} type="button">
            Cancel upload
          </button>
        ) : null}
      </div>
      <div className="stack stack-tight">
        <p className="file-picker-name">{selectedFileName || "No file selected"}</p>
        {uploading ? (
          <p className="form-note">
            Uploading your video. Keep this tab open until the upload completes.
          </p>
        ) : (
          <p className="form-note">
            Large files use Cloudflare Stream resumable upload.
          </p>
        )}
      </div>
      {progress !== null ? <p className="form-note">Upload progress: {progress}%</p> : null}
      {message ? <p className="form-status">{message}</p> : null}
    </div>
  );
}
