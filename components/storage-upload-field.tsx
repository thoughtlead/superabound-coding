"use client";

import { ChangeEvent, useState } from "react";
import { createClient } from "@/utils/supabase/client";

const BUCKET = "library-assets";

type StorageUploadFieldProps = {
  accept?: string;
  folder: string;
  helpText?: string;
  label: string;
  name: string;
  initialValue?: string | null;
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
  initialValue,
}: StorageUploadFieldProps) {
  const [value, setValue] = useState(initialValue ?? "");
  const [message, setMessage] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

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

    setValue(publicUrl);
    setMessage("Upload complete.");
    setUploading(false);
  };

  return (
    <div className="upload-field">
      <label>{label}</label>
      <input name={name} type="hidden" value={value} readOnly />
      <input
        type="url"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder="https://..."
      />
      <div className="upload-actions">
        <input accept={accept} onChange={handleFileChange} type="file" />
        {uploading ? <span className="form-note">Uploading...</span> : null}
      </div>
      {helpText ? <p className="form-note">{helpText}</p> : null}
      {message ? <p className="form-status">{message}</p> : null}
    </div>
  );
}
