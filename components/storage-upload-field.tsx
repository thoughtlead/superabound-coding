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
  placeholder?: string;
  type?: "text" | "url";
  value?: string;
};

function sanitizeFilename(filename: string) {
  return filename.replace(/[^a-zA-Z0-9.-]+/g, "-").toLowerCase();
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
  placeholder = "https://...",
  type = "url",
  value: controlledValue,
}: StorageUploadFieldProps) {
  const fileInputId = useId();
  const [internalValue, setInternalValue] = useState(initialValue ?? "");
  const [message, setMessage] = useState<string | null>(null);
  const [selectedFileName, setSelectedFileName] = useState("");
  const [uploading, setUploading] = useState(false);
  const value = controlledValue ?? internalValue;

  useEffect(() => {
    if (controlledValue === undefined) {
      setInternalValue(initialValue ?? "");
    }
  }, [controlledValue, initialValue]);

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
  };

  return (
    <div className="upload-field">
      <label>{label}</label>
      <input name={name} type="hidden" value={value} readOnly />
      <input
        type={type}
        value={value}
        onChange={(event) => updateValue(event.target.value)}
        placeholder={placeholder}
      />
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
          {uploading ? <span className="form-note">Uploading...</span> : null}
        </div>
      ) : null}
      {helpText ? <p className="form-note">{helpText}</p> : null}
      {message ? <p className="form-status">{message}</p> : null}
    </div>
  );
}
