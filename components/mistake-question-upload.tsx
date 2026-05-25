"use client";

import { useCallback, useId, useRef, useState } from "react";

type MistakeQuestionUploadProps = {
  previewUrl: string | null;
  onImageSelect: (file: File) => void;
  onClearPreview?: () => void;
  disabled?: boolean;
};

function CameraIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.7">
      <path d="M4.75 7.5h2.35l1.2-2h7.4l1.2 2h2.35a2 2 0 0 1 2 2v8.5a2 2 0 0 1-2 2H4.75a2 2 0 0 1-2-2V9.5a2 2 0 0 1 2-2z" />
      <circle cx="12" cy="13" r="3.25" />
    </svg>
  );
}

function UploadIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.7">
      <path d="M12 3.5v11.25" />
      <path d="M8.25 7.75 12 3.5l3.75 4.25" />
      <path d="M5.5 14.75v3.75a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2v-3.75" />
    </svg>
  );
}

export function MistakeQuestionUpload({
  previewUrl,
  onImageSelect,
  onClearPreview,
  disabled = false,
}: MistakeQuestionUploadProps) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const pickImage = useCallback(
    (file: File | undefined) => {
      if (!file || disabled) return;
      if (!file.type.startsWith("image/")) return;
      onImageSelect(file);
    },
    [disabled, onImageSelect]
  );

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    pickImage(file);
    event.target.value = "";
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragOver(false);
    if (disabled) return;
    pickImage(event.dataTransfer.files?.[0]);
  };

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div
        role="group"
        aria-label="拍照或上传题目图片"
        onDragEnter={(event) => {
          event.preventDefault();
          if (!disabled) setIsDragOver(true);
        }}
        onDragOver={(event) => {
          event.preventDefault();
          if (!disabled) setIsDragOver(true);
        }}
        onDragLeave={(event) => {
          event.preventDefault();
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
            setIsDragOver(false);
          }
        }}
        onDrop={handleDrop}
        className={`relative overflow-hidden rounded-2xl border border-dashed transition ${
          disabled
            ? "cursor-not-allowed border-border/60 bg-card/50 opacity-60"
            : isDragOver
              ? "border-accent bg-accent-soft/40 shadow-[0_0_0_3px_color-mix(in_srgb,var(--accent)_18%,transparent)]"
              : "border-border/90 bg-card/70 hover:border-accent/55 hover:bg-accent-soft/20"
        }`}
      >
        <input
          ref={inputRef}
          id={inputId}
          type="file"
          accept="image/*"
          capture="environment"
          className="sr-only"
          disabled={disabled}
          onChange={handleInputChange}
        />
        <label
          htmlFor={inputId}
          className={`flex min-h-[3.25rem] cursor-pointer items-center gap-3 px-4 py-2.5 text-sm ${
            disabled ? "pointer-events-none" : ""
          }`}
        >
          <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-accent/35 bg-accent-soft text-accent">
            <CameraIcon />
          </span>
          <span className="min-w-0 text-left leading-snug">
            <span className="block font-medium text-foreground">拍照 / 上传题目</span>
            <span className="mt-0.5 block text-xs text-muted-foreground">点击选择或拖拽图片到此处</span>
          </span>
          <span
            aria-hidden
            className="ml-1 hidden shrink-0 text-muted-foreground/80 sm:inline-flex sm:items-center sm:gap-1"
          >
            <UploadIcon />
          </span>
        </label>
      </div>

      {previewUrl ? (
        <div className="flex items-center gap-2 rounded-2xl border border-border/80 bg-card/85 p-2 pr-3 shadow-sm">
          <img
            src={previewUrl}
            alt="已上传的题目图片预览"
            className="h-14 w-14 shrink-0 rounded-xl border border-border/70 object-cover"
          />
          <div className="min-w-0">
            <p className="text-xs font-medium text-foreground">题目图片</p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">已就绪，等待 AI 识别</p>
          </div>
          {onClearPreview ? (
            <button
              type="button"
              onClick={onClearPreview}
              disabled={disabled}
              className="ml-1 shrink-0 rounded-lg border border-border/80 px-2 py-1 text-[11px] text-muted-foreground transition hover:border-accent/45 hover:text-foreground disabled:opacity-50"
            >
              移除
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
