"use client";

import { useCallback, useRef, useState, DragEvent, ChangeEvent } from "react";

interface CodeInputProps {
  label: string;
  sublabel: string;
  value: string;
  onChange: (value: string) => void;
  error?: string | null;
  fileName?: string | null;
  onFileNameChange?: (name: string | null) => void;
}

export function CodeInput({
  label,
  sublabel,
  value,
  onChange,
  error,
  fileName,
  onFileNameChange,
}: CodeInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const loadFile = useCallback(
    (file: File) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === "string") {
          onChange(reader.result);
          onFileNameChange?.(file.name);
        }
      };
      reader.readAsText(file);
    },
    [onChange, onFileNameChange]
  );

  const handleDrop = useCallback(
    (e: DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) loadFile(file);
    },
    [loadFile]
  );

  const handleFileSelect = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) loadFile(file);
      // reset so re-selecting same file triggers change
      e.target.value = "";
    },
    [loadFile]
  );

  const handleClear = useCallback(() => {
    onChange("");
    onFileNameChange?.(null);
  }, [onChange, onFileNameChange]);

  const lineCount = value ? value.split("\n").length : 0;

  return (
    <div className="group flex flex-1 flex-col gap-3">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div>
          <span className="text-sm font-medium text-zinc-200">{label}</span>
          <span className="ml-2 text-xs text-zinc-600">{sublabel}</span>
        </div>
        <div className="flex items-center gap-2">
          {fileName && (
            <span className="flex items-center gap-1.5 rounded-md bg-zinc-800/50 px-2 py-1 text-xs text-zinc-400">
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              {fileName}
            </span>
          )}
          {value && (
            <span className="text-[11px] text-zinc-600">
              {lineCount} line{lineCount !== 1 ? "s" : ""}
            </span>
          )}
        </div>
      </div>

      {/* Editor area */}
      <div
        className={`relative flex flex-1 flex-col overflow-hidden rounded-xl border transition-all duration-300 ${
          dragging
            ? "border-blue-500/50 bg-blue-500/5 glow-blue"
            : error
              ? "border-red-500/30 bg-red-500/[0.02]"
              : "border-zinc-800/50 bg-zinc-900/30 hover:border-zinc-700/50"
        }`}
        onDrop={handleDrop}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
      >
        {/* Drag overlay */}
        {dragging && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-zinc-950/60 backdrop-blur-sm">
            <div className="flex flex-col items-center gap-2 text-blue-400">
              <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
              </svg>
              <span className="text-sm font-medium">Drop file here</span>
            </div>
          </div>
        )}

        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            if (fileName) onFileNameChange?.(null);
          }}
          placeholder="Paste JavaScript code here..."
          spellCheck={false}
          className="flex-1 resize-none bg-transparent px-4 py-3 font-mono text-[13px] leading-relaxed text-zinc-300 placeholder-zinc-700 focus:outline-none"
          style={{ minHeight: 280 }}
        />

        {/* Bottom toolbar */}
        <div className="flex items-center gap-2 border-t border-zinc-800/30 bg-zinc-900/20 px-3 py-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".js,.mjs,.cjs,.jsx,.ts,.tsx"
            onChange={handleFileSelect}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 rounded-md border border-zinc-800 bg-zinc-900/50 px-2.5 py-1.5 text-xs text-zinc-400 transition hover:border-zinc-700 hover:bg-zinc-800 hover:text-zinc-300"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
            </svg>
            Upload file
          </button>
          {value && (
            <button
              onClick={handleClear}
              className="flex items-center gap-1 rounded-md px-2 py-1.5 text-xs text-zinc-600 transition hover:bg-zinc-800 hover:text-zinc-400"
            >
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
              Clear
            </button>
          )}
          <div className="flex-1" />
          <span className="text-[10px] text-zinc-700">
            or drag &amp; drop
          </span>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="animate-fade-in flex items-start gap-2 rounded-lg border border-red-500/20 bg-red-500/5 px-3 py-2">
          <svg className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
          <p className="text-xs leading-relaxed text-red-300">{error}</p>
        </div>
      )}
    </div>
  );
}
