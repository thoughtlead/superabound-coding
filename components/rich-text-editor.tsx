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

type ToolbarGroupProps = {
  children: React.ReactNode;
  label: string;
};

function ToolbarButton({ action, isActive = false, label }: ToolbarButton) {
  return (
    <button
      aria-pressed={isActive}
      className={`rich-editor-button${isActive ? " is-active" : ""}`}
      onMouseDown={(event) => {
        event.preventDefault();
      }}
      onClick={action}
      type="button"
    >
      {label}
    </button>
  );
}

function ToolbarGroup({ children, label }: ToolbarGroupProps) {
  return (
    <div className="rich-editor-toolbar-section">
      <span className="rich-editor-toolbar-label">{label}</span>
      <div className="rich-editor-group">{children}</div>
    </div>
  );
}

function normalizeLinkHref(value: string) {
  const trimmed = value.trim();

  if (!trimmed) {
    return "";
  }

  if (
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://") ||
    trimmed.startsWith("mailto:") ||
    trimmed.startsWith("tel:") ||
    trimmed.startsWith("/") ||
    trimmed.startsWith("#")
  ) {
    return trimmed;
  }

  return `https://${trimmed}`;
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

  const editLink = () => {
    const { from, to } = editor.state.selection;
    const previousUrl = editor.getAttributes("link").href ?? "";
    const hasSelection = from !== to;

    if (!hasSelection && !previousUrl) {
      window.alert("Select the text you want to turn into a link first.");
      return;
    }

    const href = window.prompt("Enter link URL", previousUrl);

    if (href === null) {
      return;
    }

    const nextHref = normalizeLinkHref(href);

    if (!nextHref) {
      editor.chain().focus().setTextSelection({ from, to }).unsetLink().run();
      return;
    }

    editor
      .chain()
      .focus()
      .setTextSelection({ from, to })
      .extendMarkRange("link")
      .setLink({ href: nextHref })
      .run();
  };

  return (
    <div className="rich-editor">
      <label>{label}</label>
      <input name={name} readOnly type="hidden" value={value} />

      <div className="rich-editor-toolbar" role="toolbar" aria-label="Rich text formatting">
        <ToolbarGroup label="Structure">
          <ToolbarButton
            action={() => editor.chain().focus().setParagraph().run()}
            isActive={editor.isActive("paragraph")}
            label="Paragraph"
          />
          <ToolbarButton
            action={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            isActive={editor.isActive("heading", { level: 2 })}
            label="Heading 2"
          />
          <ToolbarButton
            action={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
            isActive={editor.isActive("heading", { level: 3 })}
            label="Heading 3"
          />
          <ToolbarButton
            action={() => editor.chain().focus().toggleBlockquote().run()}
            isActive={editor.isActive("blockquote")}
            label="Quote"
          />
        </ToolbarGroup>

        <ToolbarGroup label="Emphasis">
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
        </ToolbarGroup>

        <ToolbarGroup label="Lists">
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
        </ToolbarGroup>

        <ToolbarGroup label="Links">
          <ToolbarButton
            action={() => {
              editor.chain().focus().extendMarkRange("link").run();
              editLink();
            }}
            isActive={editor.isActive("link")}
            label="Edit link"
          />
          <ToolbarButton
            action={() => {
              editor.chain().focus().unsetLink().run();
            }}
            label="Remove link"
          />
        </ToolbarGroup>

        <ToolbarGroup label="Clean up">
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
        </ToolbarGroup>
      </div>

      <EditorContent editor={editor} />
    </div>
  );
}
