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
      <div className="row-spread section-header">
        <div className="stack stack-tight">
          <p className="eyebrow">Downloads</p>
          <h2>Add lesson download</h2>
          <p>Attach worksheets, PDFs, or supporting files that members can open or download.</p>
        </div>
        <div className="panel-actions">
          <button onClick={() => setOpen(true)} type="button">
            Add lesson download
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="stack">
      <div className="row-spread section-header">
        <div className="stack stack-tight">
          <p className="eyebrow">Downloads</p>
          <h2>Add lesson download</h2>
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
