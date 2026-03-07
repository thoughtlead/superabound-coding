"use client";

import { useEffect, useRef, useState } from "react";

type RichTextEditorProps = {
  initialValue?: string | null;
  label: string;
  name: string;
};

function createToolbarAction(command: string, value?: string) {
  return () => {
    document.execCommand(command, false, value);
  };
}

export function RichTextEditor({
  initialValue,
  label,
  name,
}: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement | null>(null);
  const [value, setValue] = useState(initialValue ?? "");

  useEffect(() => {
    setValue(initialValue ?? "");
    if (editorRef.current) {
      editorRef.current.innerHTML = initialValue ?? "";
    }
  }, [initialValue]);

  const runCommand = (command: string, commandValue?: string) => {
    editorRef.current?.focus();
    createToolbarAction(command, commandValue)();
    setValue(editorRef.current?.innerHTML ?? "");
  };

  const insertLink = () => {
    const href = window.prompt("Link URL");

    if (!href) {
      return;
    }

    runCommand("createLink", href);
  };

  return (
    <div className="rich-editor">
      <label>{label}</label>
      <input name={name} readOnly type="hidden" value={value} />
      <div className="rich-editor-toolbar">
        <button className="button button-secondary" onClick={() => runCommand("formatBlock", "<p>")} type="button">
          P
        </button>
        <button className="button button-secondary" onClick={() => runCommand("formatBlock", "<h2>")} type="button">
          H2
        </button>
        <button className="button button-secondary" onClick={() => runCommand("bold")} type="button">
          Bold
        </button>
        <button className="button button-secondary" onClick={() => runCommand("italic")} type="button">
          Italic
        </button>
        <button className="button button-secondary" onClick={() => runCommand("insertUnorderedList")} type="button">
          Bullets
        </button>
        <button className="button button-secondary" onClick={() => runCommand("insertOrderedList")} type="button">
          Numbers
        </button>
        <button className="button button-secondary" onClick={insertLink} type="button">
          Link
        </button>
      </div>
      <div
        className="rich-editor-surface"
        contentEditable
        dangerouslySetInnerHTML={{ __html: value }}
        onBlur={() => setValue(editorRef.current?.innerHTML ?? "")}
        onInput={() => setValue(editorRef.current?.innerHTML ?? "")}
        ref={editorRef}
        suppressContentEditableWarning
      />
      <p className="form-note">
        This editor saves HTML automatically for lesson rendering.
      </p>
    </div>
  );
}
