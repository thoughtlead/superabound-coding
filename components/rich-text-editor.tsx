"use client";

import Link from "@tiptap/extension-link";
import Underline from "@tiptap/extension-underline";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useEffect, useState } from "react";

type RichTextEditorProps = {
  initialValue?: string | null;
  label: string;
  name: string;
};

type ToolbarButton = {
  action: () => void;
  isActive?: boolean;
  label: string;
};

function ToolbarButton({ action, isActive = false, label }: ToolbarButton) {
  return (
    <button
      aria-pressed={isActive}
      className={`rich-editor-button${isActive ? " is-active" : ""}`}
      onClick={action}
      type="button"
    >
      {label}
    </button>
  );
}

export function RichTextEditor({
  initialValue,
  label,
  name,
}: RichTextEditorProps) {
  const [value, setValue] = useState(initialValue ?? "");

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [2, 3],
        },
      }),
      Underline,
      Link.configure({
        openOnClick: false,
        autolink: true,
        linkOnPaste: true,
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

  const setLink = () => {
    const previousUrl = editor.getAttributes("link").href ?? "";
    const href = window.prompt("Enter link URL", previousUrl);

    if (href === null) {
      return;
    }

    const nextHref = href.trim();

    if (!nextHref) {
      editor.chain().focus().unsetLink().run();
      return;
    }

    editor.chain().focus().extendMarkRange("link").setLink({ href: nextHref }).run();
  };

  return (
    <div className="rich-editor">
      <label>{label}</label>
      <input name={name} readOnly type="hidden" value={value} />

      <div className="rich-editor-toolbar" role="toolbar" aria-label="Rich text formatting">
        <div className="rich-editor-group">
          <ToolbarButton
            action={() => editor.chain().focus().setParagraph().run()}
            isActive={editor.isActive("paragraph")}
            label="Paragraph"
          />
          <ToolbarButton
            action={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            isActive={editor.isActive("heading", { level: 2 })}
            label="Heading"
          />
          <ToolbarButton
            action={() => editor.chain().focus().toggleBlockquote().run()}
            isActive={editor.isActive("blockquote")}
            label="Quote"
          />
        </div>

        <div className="rich-editor-group">
          <ToolbarButton
            action={() => editor.chain().focus().toggleBold().run()}
            isActive={editor.isActive("bold")}
            label="Bold"
          />
          <ToolbarButton
            action={() => editor.chain().focus().toggleItalic().run()}
            isActive={editor.isActive("italic")}
            label="Italic"
          />
          <ToolbarButton
            action={() => editor.chain().focus().toggleUnderline().run()}
            isActive={editor.isActive("underline")}
            label="Underline"
          />
        </div>

        <div className="rich-editor-group">
          <ToolbarButton
            action={() => editor.chain().focus().toggleBulletList().run()}
            isActive={editor.isActive("bulletList")}
            label="Bulleted list"
          />
          <ToolbarButton
            action={() => editor.chain().focus().toggleOrderedList().run()}
            isActive={editor.isActive("orderedList")}
            label="Numbered list"
          />
        </div>

        <div className="rich-editor-group">
          <ToolbarButton
            action={setLink}
            isActive={editor.isActive("link")}
            label="Add link"
          />
          <ToolbarButton
            action={() => editor.chain().focus().unsetLink().run()}
            label="Remove link"
          />
          <ToolbarButton
            action={() =>
              editor
                .chain()
                .focus()
                .clearNodes()
                .unsetAllMarks()
                .run()
            }
            label="Clear formatting"
          />
        </div>
      </div>

      <EditorContent editor={editor} />
      <p className="form-note">
        This is a live rich text editor. Links render blue and underlined in the lesson view.
      </p>
    </div>
  );
}
