"use client";

import { EditorContent, useEditor } from "@tiptap/react";
import Link from "@tiptap/extension-link";
import StarterKit from "@tiptap/starter-kit";
import { useEffect, useState } from "react";

type RichTextEditorProps = {
  initialValue?: string | null;
  label: string;
  name: string;
};

export function RichTextEditor({
  initialValue,
  label,
  name,
}: RichTextEditorProps) {
  const [value, setValue] = useState(initialValue ?? "");

  const editor = useEditor({
    extensions: [
      StarterKit,
      Link.configure({
        openOnClick: false,
      }),
    ],
    immediatelyRender: false,
    content: initialValue ?? "",
    editorProps: {
      attributes: {
        class: "rich-editor-surface",
        dir: "ltr",
      },
    },
    onUpdate({ editor: currentEditor }) {
      setValue(currentEditor.getHTML());
    },
  });

  useEffect(() => {
    if (!editor) {
      return;
    }

    editor.commands.setContent(initialValue ?? "", {
      emitUpdate: false,
    });
    setValue(initialValue ?? "");
  }, [editor, initialValue]);

  if (!editor) {
    return null;
  }

  return (
    <div className="rich-editor">
      <label>{label}</label>
      <input name={name} readOnly type="hidden" value={value} />
      <div className="rich-editor-toolbar">
        <button
          className="button button-secondary"
          onClick={() => editor.chain().focus().setParagraph().run()}
          type="button"
        >
          P
        </button>
        <button
          className="button button-secondary"
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          type="button"
        >
          H2
        </button>
        <button
          className="button button-secondary"
          onClick={() => editor.chain().focus().toggleBold().run()}
          type="button"
        >
          Bold
        </button>
        <button
          className="button button-secondary"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          type="button"
        >
          Italic
        </button>
        <button
          className="button button-secondary"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          type="button"
        >
          Bullets
        </button>
        <button
          className="button button-secondary"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          type="button"
        >
          Numbers
        </button>
        <button
          className="button button-secondary"
          onClick={() => {
            const href = window.prompt("Link URL");

            if (!href) {
              return;
            }

            editor.chain().focus().setLink({ href }).run();
          }}
          type="button"
        >
          Link
        </button>
      </div>
      <EditorContent editor={editor} />
      <p className="form-note">This editor saves formatted HTML for lesson rendering.</p>
    </div>
  );
}
