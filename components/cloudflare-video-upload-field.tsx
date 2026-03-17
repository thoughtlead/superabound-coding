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

export function CloudflareVideoUploadField({
  currentEmbedUrl,
  onUploaded,
}: CloudflareVideoUploadFieldProps) {
  const fileInputId = useId();
  const [message, setMessage] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [processingStatus, setProcessingStatus] = useState<CloudflareVideoStatus | null>(null);
  const [selectedFileName, setSelectedFileName] = useState("");
  const uploadRef = useRef<tus.Upload | null>(null);
  const uploadedVideoRef = useRef<UploadedVideoValues | null>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

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
        }
        return;
      }

      if (!isMountedRef.current) {
        return;
      }

      setProcessingStatus(payload);
      setMessage(formatProcessingMessage(payload));

      if (payload.readyToStream || payload.errorReasonText) {
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
    setMessage(null);
    setProgress(0);
    setProcessingStatus(null);
    uploadedVideoRef.current = null;

    const upload = new tus.Upload(file, {
      endpoint: "/api/admin/cloudflare-stream/direct-upload",
      chunkSize: 50 * 1024 * 1024,
      retryDelays: [0, 1_000, 3_000, 5_000, 10_000],
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

        if (typeof mediaId === "string" && mediaId.length > 0) {
          uploadedVideoRef.current = {
            embedUrl:
              typeof embedUrl === "string" ? embedUrl : "",
            mediaProvider: "cloudflare-stream",
            mediaUrl: mediaId,
          };
        }
      },
      onError(error) {
        if (!isMountedRef.current) {
          return;
        }

        setMessage(error.message || "Cloudflare upload failed.");
        setUploading(false);
        setProgress(null);
        setProcessingStatus(null);
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
          input.value = "";
          return;
        }

        onUploaded(uploadedVideo);

        if (!isMountedRef.current) {
          return;
        }

        setUploading(false);
        setProgress(100);
        setMessage("Upload complete. Checking Cloudflare processing status...");
        input.value = "";

        await pollVideoStatus(uploadedVideo.mediaUrl);
      },
    });

    uploadRef.current = upload;

    try {
      const previousUploads = await upload.findPreviousUploads();

      if (previousUploads.length > 0) {
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
    setMessage("Upload canceled.");
  };

  return (
    <div className="upload-field">
      <label>Cloudflare video upload</label>
      {currentEmbedUrl ? (
        <div className="media-frame">
          <iframe
            allow="autoplay; fullscreen; picture-in-picture"
            allowFullScreen
            src={currentEmbedUrl}
            title="Cloudflare video preview"
          />
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
        <span className="file-picker-name">{selectedFileName || "No file selected"}</span>
        {uploading ? (
          <span className="form-note">
            Uploading your video. Keep this tab open until the upload completes.
          </span>
        ) : null}
        {uploading ? (
          <button className="button button-secondary" onClick={handleCancelUpload} type="button">
            Cancel upload
          </button>
        ) : null}
      </div>
      <p className="form-note">
        Large files upload with Cloudflare Stream resumable uploads. Keep this tab open until the
        upload completes.
      </p>
      {progress !== null ? <p className="form-note">Upload progress: {progress}%</p> : null}
      {message ? <p className="form-status">{message}</p> : null}
      {processingStatus?.thumbnailUrl ? (
        <div className="stack stack-tight">
          <p className="form-note">Video thumbnail</p>
          <img alt="Cloudflare video thumbnail" src={processingStatus.thumbnailUrl} />
        </div>
      ) : null}
    </div>
  );
}
