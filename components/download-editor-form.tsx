"use client";

import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { StorageUploadField } from "@/components/storage-upload-field";

type DownloadEditorFormProps = {
  action: (formData: FormData) => void | Promise<void>;
  initialFileUrl?: string | null;
  initialPosition?: number;
  initialTitle?: string | null;
  showPosition?: boolean;
  secondaryActions?: ReactNode;
  statusMessage?: string;
  submitLabel: string;
  titleInputId: string;
};

function defaultTitleFromFileName(fileName: string) {
  const withoutExtension = fileName.replace(/\.[^.]+$/, "");
  return decodeURIComponent(withoutExtension);
}

export function DownloadEditorForm({
  action,
  initialFileUrl,
  initialPosition,
  initialTitle,
  showPosition = true,
  secondaryActions,
  statusMessage,
  submitLabel,
  titleInputId,
}: DownloadEditorFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const submitButtonRef = useRef<HTMLButtonElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const [fileUrl, setFileUrl] = useState(initialFileUrl ?? "");
  const [pendingAutoSave, setPendingAutoSave] = useState(false);

  useEffect(() => {
    setFileUrl(initialFileUrl ?? "");
  }, [initialFileUrl]);

  useEffect(() => {
    if (!pendingAutoSave || !fileUrl) {
      return;
    }

    formRef.current?.requestSubmit(submitButtonRef.current ?? undefined);
    setPendingAutoSave(false);
  }, [fileUrl, pendingAutoSave]);

  return (
    <form action={action} className="editor-form stack" ref={formRef}>
      {typeof initialPosition === "number" ? (
        <input name="position" type="hidden" value={initialPosition} />
      ) : null}
      <div className="field-grid">
        <div>
          <label htmlFor={titleInputId}>Title</label>
          <input
            defaultValue={initialTitle ?? ""}
            id={titleInputId}
            name="title"
            ref={titleInputRef}
            required
            type="text"
          />
        </div>
        {showPosition ? (
          <div>
            <label htmlFor={`${titleInputId}-position`}>Position</label>
            <input
              defaultValue={initialPosition ?? 0}
              id={`${titleInputId}-position`}
              name="position"
              type="number"
            />
          </div>
        ) : null}
      </div>
      <StorageUploadField
        folder="lesson-downloads"
        helpText="Upload a file or paste a download URL."
        initialValue={initialFileUrl}
        label="File"
        name="fileUrl"
        onChange={setFileUrl}
        onUploadComplete={({ fileName, publicUrl }) => {
          if (titleInputRef.current && !titleInputRef.current.value.trim()) {
            titleInputRef.current.value = defaultTitleFromFileName(fileName);
          }

          setFileUrl(publicUrl);
          setPendingAutoSave(true);
        }}
        value={fileUrl}
      />
      {statusMessage ? <p className="form-status form-status-inline">{statusMessage}</p> : null}
      <div className="panel-actions editor-form-actions">
        <button ref={submitButtonRef} type="submit">
          {submitLabel}
        </button>
        {secondaryActions}
      </div>
    </form>
  );
}
