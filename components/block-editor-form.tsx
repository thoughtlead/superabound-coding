"use client";

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
  initialType?: "video" | "audio" | "rich_text" | "download";
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
  prefix,
  submitLabel,
}: BlockEditorFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const [autoSaving, setAutoSaving] = useState(false);

  const handleVideoUploaded = () => {
    setAutoSaving(true);
    formRef.current?.requestSubmit();
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
        onVideoUploaded={handleVideoUploaded}
        prefix={prefix}
      />
      <div className="panel-actions">
        <button type="submit">{autoSaving ? "Saving block..." : submitLabel}</button>
      </div>
    </form>
  );
}
