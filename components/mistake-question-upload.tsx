"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { QuestionImageCropModal } from "@/components/question-image-crop-modal";
import {
  isPickerCancelled,
  pickQuestionImageNative,
  useNativeQuestionImagePicker,
} from "@/lib/question-image-picker";

type MistakeQuestionUploadProps = {
  previewUrl: string | null;
  onImageSelect: (file: File) => void;
  onClearPreview?: () => void;
  disabled?: boolean;
};

function CameraIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className} fill="none" stroke="currentColor" strokeWidth="1.7">
      <path d="M4.75 7.5h2.35l1.2-2h7.4l1.2 2h2.35a2 2 0 0 1 2 2v8.5a2 2 0 0 1-2 2H4.75a2 2 0 0 1-2-2V9.5a2 2 0 0 1 2-2z" />
      <circle cx="12" cy="13" r="3.25" />
    </svg>
  );
}

function UploadIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className} fill="none" stroke="currentColor" strokeWidth="1.7">
      <path d="M12 3.5v11.25" />
      <path d="M8.25 7.75 12 3.5l3.75 4.25" />
      <path d="M5.5 14.75v3.75a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2v-3.75" />
    </svg>
  );
}

const actionButtonClass =
  "inline-flex min-h-[3.25rem] flex-1 items-center justify-center gap-2 rounded-2xl border px-3 py-2.5 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-60";

export function MistakeQuestionUpload({
  previewUrl,
  onImageSelect,
  onClearPreview,
  disabled = false,
}: MistakeQuestionUploadProps) {
  const uploadInputId = useId();
  const uploadInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [pickerError, setPickerError] = useState<string | null>(null);
  const [cropCandidate, setCropCandidate] = useState<{ file: File; previewUrl: string } | null>(null);
  const useNativePicker = useNativeQuestionImagePicker();

  useEffect(() => {
    return () => {
      if (cropCandidate?.previewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(cropCandidate.previewUrl);
      }
    };
  }, [cropCandidate]);

  const clearCropCandidate = useCallback(() => {
    setCropCandidate((previous) => {
      if (previous?.previewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(previous.previewUrl);
      }
      return null;
    });
  }, []);

  const pickImage = useCallback(
    (file: File | undefined) => {
      if (!file || disabled) return;
      if (!file.type.startsWith("image/")) return;
      setPickerError(null);
      clearCropCandidate();
      setCropCandidate({
        file,
        previewUrl: URL.createObjectURL(file),
      });
    },
    [clearCropCandidate, disabled]
  );

  const handleCropConfirm = useCallback(
    (file: File) => {
      clearCropCandidate();
      onImageSelect(file);
    },
    [clearCropCandidate, onImageSelect]
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

  const handleNativePick = async (source: "camera" | "gallery") => {
    if (disabled) return;
    setPickerError(null);
    try {
      const file = await pickQuestionImageNative(source);
      pickImage(file);
    } catch (error) {
      if (isPickerCancelled(error)) return;
      const message = error instanceof Error ? error.message : "选取图片失败";
      setPickerError(message);
    }
  };

  const handleMobileCamera = () => {
    if (disabled) return;
    if (useNativePicker) {
      void handleNativePick("camera");
      return;
    }
    cameraInputRef.current?.click();
  };

  const handleMobileGallery = () => {
    if (disabled) return;
    if (useNativePicker) {
      void handleNativePick("gallery");
      return;
    }
    galleryInputRef.current?.click();
  };

  const compactPickerClass = useNativePicker ? "flex w-full gap-2" : "flex w-full gap-2 md:hidden";
  const desktopPickerClass = useNativePicker ? "hidden" : "relative hidden overflow-hidden rounded-2xl border border-dashed transition md:block";

  return (
    <div className="flex w-full flex-col gap-2 sm:w-auto">
      <div className="flex flex-wrap items-center gap-3">
        <div role="group" aria-label="拍照或上传题目图片" className={compactPickerClass}>
          <button
            type="button"
            onClick={handleMobileCamera}
            disabled={disabled}
            className={`${actionButtonClass} border-accent/45 bg-accent-soft text-accent hover:border-accent/70 hover:bg-accent-soft/80`}
          >
            <CameraIcon className="h-4 w-4" />
            拍照
          </button>
          <button
            type="button"
            onClick={handleMobileGallery}
            disabled={disabled}
            className={`${actionButtonClass} border-border/90 bg-card/70 text-foreground hover:border-accent/45 hover:bg-accent-soft/20`}
          >
            <UploadIcon className="h-4 w-4" />
            上传图片
          </button>
          {!useNativePicker ? (
            <>
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="sr-only"
                disabled={disabled}
                onChange={handleInputChange}
              />
              <input
                ref={galleryInputRef}
                type="file"
                accept="image/*"
                className="sr-only"
                disabled={disabled}
                onChange={handleInputChange}
              />
            </>
          ) : null}
        </div>

        <div
          role="group"
          aria-label="上传题目图片"
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
          className={`${desktopPickerClass} ${
            disabled
              ? "cursor-not-allowed border-border/60 bg-card/50 opacity-60"
              : isDragOver
                ? "border-accent bg-accent-soft/40 shadow-[0_0_0_3px_color-mix(in_srgb,var(--accent)_18%,transparent)]"
                : "border-border/90 bg-card/70 hover:border-accent/55 hover:bg-accent-soft/20"
          }`}
        >
          <input
            ref={uploadInputRef}
            id={uploadInputId}
            type="file"
            accept="image/*"
            className="sr-only"
            disabled={disabled}
            onChange={handleInputChange}
          />
          <label
            htmlFor={uploadInputId}
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
            <span aria-hidden className="ml-1 inline-flex shrink-0 items-center gap-1 text-muted-foreground/80">
              <UploadIcon />
            </span>
          </label>
        </div>

        {previewUrl ? (
          <div className="flex w-full items-center gap-2 rounded-2xl border border-border/80 bg-card/85 p-2 pr-3 shadow-sm sm:w-auto">
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

      {pickerError ? (
        <p role="alert" className="text-xs text-rose-600 dark:text-rose-400">
          {pickerError}
        </p>
      ) : null}

      {cropCandidate ? (
        <QuestionImageCropModal
          imageUrl={cropCandidate.previewUrl}
          sourceFile={cropCandidate.file}
          onConfirm={handleCropConfirm}
          onCancel={clearCropCandidate}
        />
      ) : null}
    </div>
  );
}
