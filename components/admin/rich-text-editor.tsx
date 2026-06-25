"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Heading from "@tiptap/extension-heading";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import CharacterCount from "@tiptap/extension-character-count";
import {
  Bold,
  Italic,
  List,
  ListOrdered,
  Link as LinkIcon,
  Heading2,
  Heading3,
  Undo,
  Redo,
} from "lucide-react";
import { useEffect } from "react";

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
}

export function RichTextEditor({ value, onChange, placeholder }: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: false }),
      Heading.configure({ levels: [2, 3] }),
      Link.configure({ openOnClick: false }),
      Placeholder.configure({ placeholder: placeholder ?? "Write something..." }),
      CharacterCount,
    ],
    content: value,
    onUpdate({ editor }) {
      onChange(editor.getHTML());
    },
  });

  // Sync external value changes (e.g. when switching content items)
  useEffect(() => {
    if (!editor) return;
    const current = editor.getHTML();
    if (current !== value) {
      editor.commands.setContent(value || "");
    }
  }, [value, editor]);

  if (!editor) return null;

  const setLink = () => {
    const url = window.prompt("URL", editor.getAttributes("link").href ?? "");
    if (url === null) return;
    if (url === "") {
      editor.chain().focus().unsetLink().run();
    } else {
      editor.chain().focus().setLink({ href: url }).run();
    }
  };

  return (
    <div className="rounded border border-white/10 overflow-hidden">
      {/* Toolbar */}
      <div className="flex flex-wrap gap-1 p-2 border-b border-white/10 bg-white/5">
        <ToolbarBtn
          active={editor.isActive("bold")}
          onClick={() => editor.chain().focus().toggleBold().run()}
          title="Bold"
        >
          <Bold size={14} />
        </ToolbarBtn>
        <ToolbarBtn
          active={editor.isActive("italic")}
          onClick={() => editor.chain().focus().toggleItalic().run()}
          title="Italic"
        >
          <Italic size={14} />
        </ToolbarBtn>
        <div className="w-px bg-white/10 mx-1" />
        <ToolbarBtn
          active={editor.isActive("heading", { level: 2 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          title="Heading 2"
        >
          <Heading2 size={14} />
        </ToolbarBtn>
        <ToolbarBtn
          active={editor.isActive("heading", { level: 3 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          title="Heading 3"
        >
          <Heading3 size={14} />
        </ToolbarBtn>
        <div className="w-px bg-white/10 mx-1" />
        <ToolbarBtn
          active={editor.isActive("bulletList")}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          title="Bullet list"
        >
          <List size={14} />
        </ToolbarBtn>
        <ToolbarBtn
          active={editor.isActive("orderedList")}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          title="Ordered list"
        >
          <ListOrdered size={14} />
        </ToolbarBtn>
        <div className="w-px bg-white/10 mx-1" />
        <ToolbarBtn
          active={editor.isActive("link")}
          onClick={setLink}
          title="Link"
        >
          <LinkIcon size={14} />
        </ToolbarBtn>
        <div className="w-px bg-white/10 mx-1 ml-auto" />
        <ToolbarBtn
          active={false}
          onClick={() => editor.chain().focus().undo().run()}
          title="Undo"
        >
          <Undo size={14} />
        </ToolbarBtn>
        <ToolbarBtn
          active={false}
          onClick={() => editor.chain().focus().redo().run()}
          title="Redo"
        >
          <Redo size={14} />
        </ToolbarBtn>
      </div>

      {/* Editor area */}
      <EditorContent
        editor={editor}
        className="prose-editor min-h-[240px] p-3 text-sm text-white focus-within:outline-none"
      />
    </div>
  );
}

function ToolbarBtn({
  children,
  active,
  onClick,
  title,
}: {
  children: React.ReactNode;
  active: boolean;
  onClick: () => void;
  title: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`p-1.5 rounded transition-colors ${
        active
          ? "bg-[var(--accent)] text-[var(--bg)]"
          : "text-white/60 hover:text-white hover:bg-white/10"
      }`}
    >
      {children}
    </button>
  );
}
