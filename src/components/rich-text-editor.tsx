"use client";

import { useState } from "react";
import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import { StarterKit } from "@tiptap/starter-kit";
import { Button } from "@/components/ui/button";

// CR-008 — WYSIWYG rich-text editor for non-technical authors. Outputs HTML, which the
// backend sanitizes on save (src/pages/sanitize.ts), so the toolbar deliberately offers
// only the formatting that survives sanitization: headings (h2/h3), bold, italic,
// underline, lists, blockquote, links. A "HTML" toggle exposes the raw source for anyone
// who wants it — that's the "still let them edit HTML" option on top of the visual editor.
//
// Tiptap StarterKit (v3) already bundles link/underline/lists; code/codeBlock are disabled
// because the sanitizer strips <pre>/<code>. `immediatelyRender: false` avoids a Next SSR
// hydration mismatch.

const btn = "px-2 py-1 text-xs rounded border";

function Tool({
  editor,
  onClick,
  active,
  label,
  title,
}: {
  editor: Editor;
  onClick: () => void;
  active?: boolean;
  label: string;
  title: string;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-pressed={active ?? false}
      onMouseDown={(e) => e.preventDefault()} // keep the editor selection
      onClick={onClick}
      className={`${btn} ${active ? "bg-foreground text-background" : "bg-muted/40 hover:bg-muted"}`}
    >
      {label}
    </button>
  );
}

export function RichTextEditor({
  value,
  onChange,
}: {
  value: string;
  onChange: (html: string) => void;
}) {
  const [mode, setMode] = useState<"rich" | "html">("rich");
  const [source, setSource] = useState(value);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
        code: false,
        codeBlock: false,
        link: { openOnClick: false },
      }),
    ],
    content: value,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      setSource(html);
      onChange(html);
    },
    editorProps: {
      attributes: { class: "ae-prose min-h-[20rem] px-3 py-2 focus:outline-none" },
    },
  });

  if (!editor) {
    return <div className="min-h-[22rem] rounded-md border bg-muted/20" aria-busy />;
  }

  function toggleSource() {
    if (mode === "rich") {
      setSource(editor!.getHTML());
      setMode("html");
    } else {
      // Push the edited source back into the editor and normalise it.
      editor!.commands.setContent(source, { emitUpdate: false });
      onChange(editor!.getHTML());
      setMode("rich");
    }
  }

  function setLink() {
    const prev = editor!.getAttributes("link").href as string | undefined;
    const url = window.prompt("Link URL (https://… or mailto:…)", prev ?? "https://");
    if (url === null) return; // cancelled
    if (url === "") {
      editor!.chain().focus().unsetLink().run();
      return;
    }
    editor!.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  }

  return (
    <div className="ae-rte rounded-md border">
      <style>{`
        .ae-rte .ae-prose h2 { font-size: 1.25rem; font-weight: 600; margin: 0.75rem 0 0.25rem; }
        .ae-rte .ae-prose h3 { font-size: 1.05rem; font-weight: 600; margin: 0.6rem 0 0.2rem; }
        .ae-rte .ae-prose p { margin: 0.4rem 0; }
        .ae-rte .ae-prose ul { list-style: disc; padding-left: 1.25rem; margin: 0.4rem 0; }
        .ae-rte .ae-prose ol { list-style: decimal; padding-left: 1.25rem; margin: 0.4rem 0; }
        .ae-rte .ae-prose blockquote { border-left: 3px solid var(--border, #ccc); padding-left: 0.75rem; color: #666; margin: 0.5rem 0; }
        .ae-rte .ae-prose a { color: #1a56db; text-decoration: underline; }
      `}</style>

      <div className="flex flex-wrap items-center gap-1 border-b bg-muted/20 p-1.5">
        {mode === "rich" ? (
          <>
            <Tool editor={editor} title="Bold" label="B" active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()} />
            <Tool editor={editor} title="Italic" label="I" active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()} />
            <Tool editor={editor} title="Underline" label="U" active={editor.isActive("underline")} onClick={() => editor.chain().focus().toggleUnderline().run()} />
            <span className="mx-1 h-4 w-px bg-border" />
            <Tool editor={editor} title="Heading" label="H2" active={editor.isActive("heading", { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} />
            <Tool editor={editor} title="Subheading" label="H3" active={editor.isActive("heading", { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} />
            <span className="mx-1 h-4 w-px bg-border" />
            <Tool editor={editor} title="Bullet list" label="• List" active={editor.isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()} />
            <Tool editor={editor} title="Numbered list" label="1. List" active={editor.isActive("orderedList")} onClick={() => editor.chain().focus().toggleOrderedList().run()} />
            <Tool editor={editor} title="Quote" label="❝" active={editor.isActive("blockquote")} onClick={() => editor.chain().focus().toggleBlockquote().run()} />
            <span className="mx-1 h-4 w-px bg-border" />
            <Tool editor={editor} title="Link" label="🔗" active={editor.isActive("link")} onClick={setLink} />
          </>
        ) : (
          <span className="px-1 text-xs text-muted-foreground">Editing raw HTML — switch back to apply.</span>
        )}
        <div className="ml-auto">
          <Button type="button" variant="outline" size="sm" onClick={toggleSource}>
            {mode === "rich" ? "HTML" : "Visual"}
          </Button>
        </div>
      </div>

      {mode === "rich" ? (
        <EditorContent editor={editor} />
      ) : (
        <textarea
          className="min-h-[20rem] w-full resize-y px-3 py-2 font-mono text-xs focus:outline-none"
          value={source}
          onChange={(e) => {
            setSource(e.target.value);
            onChange(e.target.value);
          }}
        />
      )}
    </div>
  );
}
