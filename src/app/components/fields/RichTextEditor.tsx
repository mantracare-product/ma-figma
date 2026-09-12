import React, { useRef, useEffect, useCallback } from "react";
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  List,
  ListOrdered,
  Heading2,
} from "lucide-react";

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  disabled?: boolean;
  isAdminDefault?: boolean;
  minRows?: number;
}

const TOOLBAR_BUTTONS = [
  { cmd: "bold",                Icon: Bold,         title: "Bold (Ctrl+B)" },
  { cmd: "italic",              Icon: Italic,        title: "Italic (Ctrl+I)" },
  { cmd: "underline",           Icon: Underline,     title: "Underline (Ctrl+U)" },
  { cmd: "strikeThrough",       Icon: Strikethrough, title: "Strikethrough" },
  { cmd: "insertUnorderedList", Icon: List,          title: "Bullet List" },
  { cmd: "insertOrderedList",   Icon: ListOrdered,   title: "Numbered List" },
  { cmd: "formatBlock|h2",      Icon: Heading2,      title: "Heading" },
] as const;

export function RichTextEditor({
  value,
  onChange,
  placeholder = "Enter rich text...",
  disabled = false,
  isAdminDefault = false,
  minRows = 3,
}: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const skipNextSync = useRef(false);

  useEffect(() => {
    const el = editorRef.current;
    if (!el) return;
    if (skipNextSync.current) { skipNextSync.current = false; return; }
    if (el.innerHTML !== (value || "")) { el.innerHTML = value || ""; }
  }, [value]);

  const execCmd = useCallback((cmd: string) => {
    if (disabled) return;
    editorRef.current?.focus();
    if (cmd.startsWith("formatBlock|")) {
      const tag = cmd.split("|")[1];
      document.execCommand("formatBlock", false, document.queryCommandValue("formatBlock") === tag ? "p" : tag);
    } else {
      document.execCommand(cmd, false);
    }
    skipNextSync.current = true;
    onChange(editorRef.current?.innerHTML || "");
  }, [disabled, onChange]);

  const handleInput = useCallback(() => {
    skipNextSync.current = true;
    onChange(editorRef.current?.innerHTML || "");
  }, [onChange]);

  const borderColor = isAdminDefault
    ? "border-blue-300/80 focus-within:border-blue-500"
    : "border-slate-200 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500";

  const minHeight = minRows * 22;

  return (
    <div
      className={`rounded-lg border overflow-hidden transition-all ${borderColor} ${isAdminDefault ? "bg-blue-50/20" : "bg-white"} ${disabled ? "opacity-60 pointer-events-none" : ""}`}
      style={{ fontFamily: "Outfit, sans-serif" }}
    >
      <div className="flex items-center gap-0.5 px-2 py-1.5 border-b border-slate-100 bg-slate-50/60 flex-wrap">
        {TOOLBAR_BUTTONS.map(({ cmd, Icon, title }) => (
          <button
            key={cmd}
            type="button"
            title={title}
            disabled={disabled}
            onMouseDown={(e) => { e.preventDefault(); execCmd(cmd); }}
            className="w-6 h-6 flex items-center justify-center rounded text-slate-500 hover:text-slate-800 hover:bg-slate-200 transition-colors cursor-pointer"
          >
            <Icon className="w-3.5 h-3.5" />
          </button>
        ))}
      </div>
      <div className="relative">
        <div
          ref={editorRef}
          contentEditable={!disabled}
          suppressContentEditableWarning
          onInput={handleInput}
          className="w-full px-3 py-2 text-xs font-medium text-slate-800 outline-none overflow-auto"
          style={{ minHeight, fontFamily: "Outfit, sans-serif", lineHeight: "1.6" }}
          data-placeholder={placeholder}
        />
        {!value && (
          <span className="absolute top-2 left-3 text-xs text-slate-400 pointer-events-none select-none" style={{ fontFamily: "Outfit, sans-serif" }}>
            {placeholder}
          </span>
        )}
      </div>
      <style>{`
        [contenteditable] ul { list-style: disc; padding-left: 1.25rem; margin: 0.25rem 0; }
        [contenteditable] ol { list-style: decimal; padding-left: 1.25rem; margin: 0.25rem 0; }
        [contenteditable] h2 { font-size: 0.875rem; font-weight: 700; margin: 0.25rem 0; }
        [contenteditable] b, [contenteditable] strong { font-weight: 700; }
        [contenteditable] i, [contenteditable] em { font-style: italic; }
        [contenteditable] u { text-decoration: underline; }
        [contenteditable] s { text-decoration: line-through; }
      `}</style>
    </div>
  );
}

export function RichTextDisplay({ html, className = "" }: { html: string; className?: string }) {
  if (!html) return null;
  return (
    <div
      className={`text-xs text-slate-800 ${className}`}
      style={{ fontFamily: "Outfit, sans-serif", lineHeight: "1.6" }}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
