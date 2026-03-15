"use client";

import { useState } from "react";
import { DownloadEditorForm } from "@/components/download-editor-form";

type AddLessonDownloadSectionProps = {
  action: (formData: FormData) => void | Promise<void>;
  initialPosition: number;
  refreshKey: string;
};

export function AddLessonDownloadSection({
  action,
  initialPosition,
  refreshKey,
}: AddLessonDownloadSectionProps) {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <div className="panel-actions">
        <button onClick={() => setOpen(true)} type="button">
          Add lesson download
        </button>
      </div>
    );
  }

  return (
    <div className="stack download-create-shell">
      <div className="row-spread">
        <div className="stack stack-tight">
          <h3>New lesson download</h3>
          <p>Attach a worksheet, PDF, or supporting file members can open or download.</p>
        </div>
        <button className="button button-secondary" onClick={() => setOpen(false)} type="button">
          Cancel
        </button>
      </div>
      <DownloadEditorForm
        action={action}
        initialPosition={initialPosition}
        key={`create-download-${refreshKey}`}
        showPosition={false}
        submitLabel="Add lesson download"
        titleInputId="new-download-title"
      />
    </div>
  );
}
