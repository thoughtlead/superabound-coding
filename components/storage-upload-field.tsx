/* eslint-disable @next/next/no-img-element */

"use client";

import { ChangeEvent, useEffect, useId, useState } from "react";
import { createClient } from "@/utils/supabase/client";

const BUCKET = "library-assets";

type StorageUploadFieldProps = {
  accept?: string;
  folder: string;
  helpText?: string;
  label: string;
  name: string;
  allowUpload?: boolean;
  initialValue?: string | null;
  onChange?: (value: string) => void;
  onUploadComplete?: (payload: { fileName: string; publicUrl: string }) => void;
  placeholder?: string;
  type?: "text" | "url";
  value?: string;
};

function sanitizeFilename(filename: string) {
  return filename.replace(/[^a-zA-Z0-9.-]+/g, "-").toLowerCase();
}

function getFileNameFromUrl(value: string) {
  try {
    const parsed = new URL(value);
    const rawName = parsed.pathname.split("/").pop() ?? "downloaded-file";
    return decodeURIComponent(rawName);
  } catch {
    return "downloaded-file";
  }
}

function getFileBadgeLabel(fileName: string) {
  const ext = fileName.split(".").pop()?.trim().toUpperCase();
  return ext && ext.length <= 4 ? ext : "FILE";
}

export function StorageUploadField({
  accept,
  folder,
  helpText,
  label,
  name,
  allowUpload = true,
  initialValue,
  onChange,
  onUploadComplete,
  placeholder = "https://...",
  type = "url",
  value: controlledValue,
}: StorageUploadFieldProps) {
  const fileInputId = useId();
  const [internalValue, setInternalValue] = useState(initialValue ?? "");
  const [message, setMessage] = useState<string | null>(null);
  const [selectedFileName, setSelectedFileName] = useState("");
  const [uploading, setUploading] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const value = controlledValue ?? internalValue;
  const isImageField = accept?.includes("image/") ?? false;
  const displayFileName = value ? getFileNameFromUrl(value) : "";
  const fileBadgeLabel = displayFileName ? getFileBadgeLabel(displayFileName) : "FILE";

  useEffect(() => {
    if (controlledValue === undefined) {
      setInternalValue(initialValue ?? "");
    }
  }, [controlledValue, initialValue]);

  useEffect(() => {
    if (!value) {
      setShowUrlInput(false);
    }
  }, [value]);

  const updateValue = (nextValue: string) => {
    if (controlledValue === undefined) {
      setInternalValue(nextValue);
    }

    onChange?.(nextValue);
  };

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    setSelectedFileName(file.name);
    setUploading(true);
    setMessage(null);

    const supabase = createClient();
    const filename = sanitizeFilename(file.name);
    const objectPath = `${folder}/${crypto.randomUUID()}-${filename}`;
    const { error } = await supabase.storage.from(BUCKET).upload(objectPath, file);

    if (error) {
      setMessage(error.message);
      setUploading(false);
      return;
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from(BUCKET).getPublicUrl(objectPath);

    updateValue(publicUrl);
    setMessage("Upload complete.");
    setUploading(false);
    onUploadComplete?.({
      fileName: file.name,
      publicUrl,
    });
  };

  return (
    <div className="upload-field">
      <label>{label}</label>
      <input name={name} type="hidden" value={value} readOnly />
      {isImageField ? (
        <div className="image-upload-field">
          {value ? (
            <div className="image-upload-preview">
              <img alt={label} className="image-upload-preview-image" src={value} />
            </div>
          ) : (
            <div className="image-upload-empty">No thumbnail selected</div>
          )}
          {showUrlInput || !allowUpload ? (
            <input
              type={type}
              value={value}
              onChange={(event) => updateValue(event.target.value)}
              placeholder={placeholder}
            />
          ) : null}
        </div>
      ) : (
        <div className="file-upload-field">
          {value ? (
            <a
              className="file-upload-preview"
              href={value}
              rel="noreferrer"
              target="_blank"
            >
              <span className="file-upload-icon">{fileBadgeLabel}</span>
              <span className="file-upload-copy">
                <strong>{displayFileName}</strong>
                <span>Open or download file</span>
              </span>
            </a>
          ) : (
            <div className="file-upload-empty">No file selected yet</div>
          )}
          {showUrlInput || !allowUpload ? (
            <input
              type={type}
              value={value}
              onChange={(event) => updateValue(event.target.value)}
              placeholder={placeholder}
            />
          ) : null}
        </div>
      )}
      {allowUpload ? (
        <div className="upload-actions">
          <input
            accept={accept}
            className="file-picker-input"
            id={fileInputId}
            onChange={handleFileChange}
            type="file"
          />
          <label className="button button-secondary file-picker-button" htmlFor={fileInputId}>
            Choose file
          </label>
          <span className="file-picker-name">
            {selectedFileName || "No file selected"}
          </span>
          <button
            className="button button-secondary"
            onClick={() => setShowUrlInput((current) => !current)}
            type="button"
          >
            {isImageField
              ? showUrlInput
                ? "Hide image URL"
                : "Paste image URL"
              : showUrlInput
                ? "Hide file URL"
                : "Paste file URL"}
          </button>
          {uploading ? <span className="form-note">Uploading...</span> : null}
        </div>
      ) : null}
      {helpText ? <p className="form-note">{helpText}</p> : null}
      {message ? <p className="form-status">{message}</p> : null}
    </div>
  );
}
