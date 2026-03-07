"use client";

import { ChangeEvent, useRef, useState } from "react";
import * as tus from "tus-js-client";

type CloudflareVideoUploadFieldProps = {
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

export function CloudflareVideoUploadField({
  onUploaded,
}: CloudflareVideoUploadFieldProps) {
  const [message, setMessage] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const uploadRef = useRef<tus.Upload | null>(null);
  const uploadedVideoRef = useRef<UploadedVideoValues | null>(null);

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    const input = event.currentTarget;

    if (!file) {
      return;
    }

    setUploading(true);
    setMessage(null);
    setProgress(0);
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
      onAfterResponse(_request, response) {
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
        setMessage(error.message || "Cloudflare upload failed.");
        setUploading(false);
        setProgress(null);
        input.value = "";
      },
      onProgress(bytesUploaded, bytesTotal) {
        setProgress(Math.round((bytesUploaded / bytesTotal) * 100));
      },
      onSuccess() {
        const uploadedVideo = uploadedVideoRef.current;

        if (!uploadedVideo) {
          setMessage("Video uploaded, but Cloudflare did not return a video ID.");
          setUploading(false);
          setProgress(null);
          input.value = "";
          return;
        }

        onUploaded(uploadedVideo);
        setMessage("Video uploaded to Cloudflare Stream.");
        setUploading(false);
        setProgress(100);
        input.value = "";
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
    setMessage("Upload canceled.");
  };

  return (
    <div className="upload-field">
      <label>Cloudflare video upload</label>
      <div className="upload-actions">
        <input accept="video/*" onChange={handleFileChange} type="file" />
        {uploading ? <span className="form-note">Uploading to Cloudflare...</span> : null}
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
    </div>
  );
}
