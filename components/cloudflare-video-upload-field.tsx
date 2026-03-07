"use client";

import { ChangeEvent, useState } from "react";

type CloudflareVideoUploadFieldProps = {
  onUploaded: (values: {
    embedUrl: string;
    mediaProvider: string;
    mediaUrl: string;
  }) => void;
};

type DirectUploadPayload = {
  embedUrl: string;
  mediaProvider: string;
  mediaUrl: string;
  uploadUrl: string;
};

const MAX_DIRECT_UPLOAD_BYTES = 200 * 1024 * 1024;

export function CloudflareVideoUploadField({
  onUploaded,
}: CloudflareVideoUploadFieldProps) {
  const [message, setMessage] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    if (file.size > MAX_DIRECT_UPLOAD_BYTES) {
      setMessage("This UI uploader currently supports files up to 200 MB.");
      return;
    }

    setUploading(true);
    setMessage(null);

    const directUploadResponse = await fetch(
      "/api/admin/cloudflare-stream/direct-upload",
      {
        method: "POST",
      },
    );
    const directUploadPayload =
      (await directUploadResponse.json()) as DirectUploadPayload | { error: string };

    if (!directUploadResponse.ok || "error" in directUploadPayload) {
      setMessage(
        "error" in directUploadPayload
          ? directUploadPayload.error
          : "Could not initialize Cloudflare upload.",
      );
      setUploading(false);
      return;
    }

    const uploadFormData = new FormData();
    uploadFormData.append("file", file);

    const uploadResponse = await fetch(directUploadPayload.uploadUrl, {
      method: "POST",
      body: uploadFormData,
    });

    if (!uploadResponse.ok) {
      setMessage("Cloudflare upload failed.");
      setUploading(false);
      return;
    }

    onUploaded({
      embedUrl: directUploadPayload.embedUrl,
      mediaProvider: directUploadPayload.mediaProvider,
      mediaUrl: directUploadPayload.mediaUrl,
    });
    setMessage("Video uploaded to Cloudflare Stream.");
    setUploading(false);
  };

  return (
    <div className="upload-field">
      <label>Cloudflare video upload</label>
      <div className="upload-actions">
        <input accept="video/*" onChange={handleFileChange} type="file" />
        {uploading ? <span className="form-note">Uploading to Cloudflare...</span> : null}
      </div>
      <p className="form-note">
        This uploader currently supports direct uploads up to 200 MB.
      </p>
      {message ? <p className="form-status">{message}</p> : null}
    </div>
  );
}
