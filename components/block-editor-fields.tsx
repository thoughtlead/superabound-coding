"use client";

import { useEffect, useMemo, useState } from "react";
import { CloudflareVideoUploadField } from "@/components/cloudflare-video-upload-field";
import { RichTextEditor } from "@/components/rich-text-editor";
import { StorageUploadField } from "@/components/storage-upload-field";

type BlockEditorFieldsProps = {
  initialBody?: string | null;
  initialEmbedUrl?: string | null;
  initialMediaProvider?: string | null;
  initialMediaUrl?: string | null;
  initialPosition?: number;
  initialTitle?: string | null;
  initialType?: "video" | "audio" | "rich_text" | "download" | "image";
  onTypeChange?: (value: "video" | "audio" | "rich_text" | "download" | "image") => void;
  onMediaUploaded?: () => void;
  prefix: string;
};

export function BlockEditorFields({
  initialBody,
  initialEmbedUrl,
  initialMediaProvider,
  initialMediaUrl,
  initialPosition = 0,
  initialTitle,
  initialType = "rich_text",
  onTypeChange,
  onMediaUploaded,
  prefix,
}: BlockEditorFieldsProps) {
  const [blockType, setBlockType] = useState(initialType);
  const [mediaProvider, setMediaProvider] = useState(initialMediaProvider ?? "");
  const [mediaUrl, setMediaUrl] = useState(initialMediaUrl ?? "");
  const [embedUrl, setEmbedUrl] = useState(initialEmbedUrl ?? "");
  const [pendingMediaSave, setPendingMediaSave] = useState(false);

  useEffect(() => {
    setBlockType(initialType);
    setMediaProvider(initialMediaProvider ?? "");
    setMediaUrl(initialMediaUrl ?? "");
    setEmbedUrl(initialEmbedUrl ?? "");
  }, [initialEmbedUrl, initialMediaProvider, initialMediaUrl, initialType]);

  useEffect(() => {
    onTypeChange?.(blockType);
  }, [blockType, onTypeChange]);

  useEffect(() => {
    if (blockType === "video" && !initialMediaProvider && !mediaProvider) {
      setMediaProvider("cloudflare-stream");
    }
  }, [blockType, initialMediaProvider, mediaProvider]);

  useEffect(() => {
    if (!pendingMediaSave) {
      return;
    }

    if (!mediaUrl) {
      return;
    }

    if (mediaProvider === "cloudflare-stream" && !embedUrl) {
      return;
    }

    onMediaUploaded?.();
    setPendingMediaSave(false);
  }, [embedUrl, mediaProvider, mediaUrl, onMediaUploaded, pendingMediaSave]);

  const mediaFolder = useMemo(() => {
    if (blockType === "audio") {
      return "lesson-audio";
    }

    return "lesson-media";
  }, [blockType]);
  const isCloudflareProvider = mediaProvider === "cloudflare-stream";
  const availableBlockTypes = [
    { label: "Video", value: "video" },
    { label: "Audio", value: "audio" },
    { label: "Image", value: "image" },
    { label: "Rich text", value: "rich_text" },
    ...(initialType === "download" || blockType === "download"
      ? [{ label: "Download button", value: "download" as const }]
      : []),
  ];

  return (
    <>
      <div className="field-grid">
        <div>
          <label htmlFor={`${prefix}-type`}>Type</label>
          <select
            id={`${prefix}-type`}
            name="blockType"
            onChange={(event) => setBlockType(event.target.value as typeof initialType)}
            value={blockType}
          >
            {availableBlockTypes.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor={`${prefix}-position`}>Position</label>
          <input
            defaultValue={initialPosition}
            id={`${prefix}-position`}
            name="position"
            type="number"
          />
        </div>
      </div>

      <div className="field-grid">
        <div>
          <label htmlFor={`${prefix}-title`}>Title</label>
          <input
            defaultValue={initialTitle ?? ""}
            id={`${prefix}-title`}
            name="title"
            type="text"
          />
        </div>
        {blockType !== "rich_text" && blockType !== "image" ? (
          <div>
            <label htmlFor={`${prefix}-provider`}>Media provider</label>
            <select
              id={`${prefix}-provider`}
              name="mediaProvider"
              onChange={(event) => setMediaProvider(event.target.value)}
              value={mediaProvider}
            >
              <option value="cloudflare-stream">Cloudflare Stream</option>
              <option value="">Manual URL</option>
              <option value="vimeo">Vimeo</option>
              <option value="wistia">Wistia</option>
              <option value="supabase-storage">Supabase Storage</option>
            </select>
          </div>
        ) : null}
      </div>

      {blockType === "rich_text" ? (
        <RichTextEditor initialValue={initialBody} label="Body" name="body" />
      ) : null}

      {blockType === "audio" ? (
        <>
          <StorageUploadField
            accept="audio/*"
            folder={mediaFolder}
            helpText="Upload an audio file or paste an external audio URL."
            initialValue={mediaUrl}
            label="Audio file or URL"
            name="mediaUrl"
            onChange={setMediaUrl}
            onUploadComplete={({ publicUrl }) => {
              setMediaProvider("supabase-storage");
              setMediaUrl(publicUrl);
              setPendingMediaSave(true);
            }}
            value={mediaUrl}
          />
          <input name="embedUrl" readOnly type="hidden" value="" />
        </>
      ) : null}

      {blockType === "image" ? (
        <>
          <StorageUploadField
            accept="image/*"
            folder="lesson-images"
            helpText="Upload an image or paste an external image URL."
            initialValue={mediaUrl}
            label="Image"
            name="mediaUrl"
            onChange={setMediaUrl}
            onUploadComplete={({ publicUrl }) => {
              setMediaUrl(publicUrl);
              setPendingMediaSave(true);
            }}
            value={mediaUrl}
          />
          <input name="mediaProvider" readOnly type="hidden" value="supabase-storage" />
          <input name="embedUrl" readOnly type="hidden" value="" />
          <input name="body" readOnly type="hidden" value="" />
        </>
      ) : null}

      {blockType === "download" ? (
        <>
          <StorageUploadField
            folder={mediaFolder}
            helpText="Upload a file or paste a URL for the download button."
            initialValue={mediaUrl}
            label="Download target"
            name="mediaUrl"
            onChange={setMediaUrl}
            value={mediaUrl}
          />
          <input name="embedUrl" readOnly type="hidden" value="" />
        </>
      ) : null}

      {blockType === "video" ? (
        <div className="stack stack-tight">
          <CloudflareVideoUploadField
            currentEmbedUrl={embedUrl}
            onUploaded={({
              embedUrl: nextEmbedUrl,
              mediaProvider: nextProvider,
              mediaUrl: nextMediaUrl,
            }) => {
              setEmbedUrl(nextEmbedUrl);
              setMediaProvider(nextProvider);
              setMediaUrl(nextMediaUrl);
              setPendingMediaSave(true);
            }}
          />
          {isCloudflareProvider ? (
            <>
              <input name="mediaUrl" readOnly type="hidden" value={mediaUrl} />
              <input name="embedUrl" readOnly type="hidden" value={embedUrl} />
              <input name="body" readOnly type="hidden" value="" />
            </>
          ) : (
            <>
              <StorageUploadField
                allowUpload={false}
                folder={mediaFolder}
                helpText="Paste a Vimeo or Wistia URL."
                initialValue={mediaUrl}
                label="Video URL"
                name="mediaUrl"
                onChange={setMediaUrl}
                placeholder="https://..."
                type="url"
                value={mediaUrl}
              />
              <div>
                <label htmlFor={`${prefix}-embed-url`}>Embed URL</label>
                <input
                  id={`${prefix}-embed-url`}
                  name="embedUrl"
                  onChange={(event) => setEmbedUrl(event.target.value)}
                  type="url"
                  value={embedUrl}
                />
              </div>
              <input name="body" readOnly type="hidden" value="" />
            </>
          )}
        </div>
      ) : null}
    </>
  );
}
