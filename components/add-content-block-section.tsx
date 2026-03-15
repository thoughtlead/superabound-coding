"use client";

import { useMemo, useState } from "react";
import { BlockEditorForm } from "@/components/block-editor-form";

type AddContentBlockSectionProps = {
  action: (formData: FormData) => void | Promise<void>;
  initialPosition: number;
  refreshKey: string;
};

const TYPE_LABELS = {
  audio: "Add audio block",
  download: "Add download block",
  image: "Add image block",
  rich_text: "Add rich text block",
  video: "Add video block",
} as const;

export function AddContentBlockSection({
  action,
  initialPosition,
  refreshKey,
}: AddContentBlockSectionProps) {
  const [open, setOpen] = useState(false);
  const [blockType, setBlockType] = useState<
    "video" | "audio" | "rich_text" | "download" | "image"
  >("rich_text");

  const heading = useMemo(() => TYPE_LABELS[blockType], [blockType]);

  return (
    <section className="panel lesson-panel">
      {!open ? (
        <div className="row-spread section-header">
          <div className="stack stack-tight">
            <p className="eyebrow">Content builder</p>
            <h2>Add lesson content</h2>
            <p>Insert rich text, video, audio, or image blocks in the order members should see them.</p>
          </div>
          <div className="panel-actions">
            <button onClick={() => setOpen(true)} type="button">
              Add content block
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="row-spread section-header">
            <div className="stack stack-tight">
              <p className="eyebrow">Content builder</p>
              <h2>{heading}</h2>
            </div>
            <button
              className="button button-secondary"
              onClick={() => setOpen(false)}
              type="button"
            >
              Cancel
            </button>
          </div>
          <BlockEditorForm
            action={action}
            initialPosition={initialPosition}
            key={`create-block-${refreshKey}`}
            onTypeChange={setBlockType}
            prefix={`new-block-${refreshKey}`}
            submitLabel={heading}
          />
        </>
      )}
    </section>
  );
}
