"use client";

import type { ReactNode } from "react";
import { useRef, useState } from "react";
import { BlockEditorFields } from "@/components/block-editor-fields";

type BlockEditorFormProps = {
  action: (formData: FormData) => void | Promise<void>;
  initialBody?: string | null;
  initialEmbedUrl?: string | null;
  initialMediaProvider?: string | null;
  initialMediaUrl?: string | null;
  initialPosition?: number;
  initialTitle?: string | null;
  initialType?: "video" | "audio" | "rich_text" | "download" | "image";
  onTypeChange?: (value: "video" | "audio" | "rich_text" | "download" | "image") => void;
  secondaryActions?: ReactNode;
  statusMessage?: string;
  prefix: string;
  submitLabel: string;
};

export function BlockEditorForm({
  action,
  initialBody,
  initialEmbedUrl,
  initialMediaProvider,
  initialMediaUrl,
  initialPosition,
  initialTitle,
  initialType,
  onTypeChange,
  secondaryActions,
  statusMessage,
  prefix,
  submitLabel,
}: BlockEditorFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const submitButtonRef = useRef<HTMLButtonElement>(null);
  const [autoSaving, setAutoSaving] = useState(false);

  const handleVideoUploaded = () => {
    setAutoSaving(true);
    formRef.current?.requestSubmit(submitButtonRef.current ?? undefined);
  };

  return (
    <form action={action} className="editor-form stack" ref={formRef}>
      <BlockEditorFields
        initialBody={initialBody}
        initialEmbedUrl={initialEmbedUrl}
        initialMediaProvider={initialMediaProvider}
        initialMediaUrl={initialMediaUrl}
        initialPosition={initialPosition}
        initialTitle={initialTitle}
        initialType={initialType}
        onTypeChange={onTypeChange}
        onVideoUploaded={handleVideoUploaded}
        prefix={prefix}
      />
      {statusMessage ? <p className="form-status form-status-inline">{statusMessage}</p> : null}
      <div className="panel-actions editor-form-actions">
        <button ref={submitButtonRef} type="submit">
          {autoSaving ? "Saving block..." : submitLabel}
        </button>
        {secondaryActions}
      </div>
    </form>
  );
}
