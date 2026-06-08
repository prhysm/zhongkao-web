"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { cropImageFile, type NormalizedCropRect } from "@/lib/crop-image";

type QuestionImageCropModalProps = {
  imageUrl: string;
  sourceFile: File;
  onConfirm: (file: File) => void;
  onCancel: () => void;
};

type ImageLayout = {
  left: number;
  top: number;
  width: number;
  height: number;
};

type ResizeHandle = "nw" | "ne" | "sw" | "se" | "n" | "s" | "e" | "w";

type DragState =
  | {
      mode: "move";
      pointerId: number;
      startPointer: { x: number; y: number };
      startCrop: NormalizedCropRect;
    }
  | {
      mode: "resize";
      handle: ResizeHandle;
      pointerId: number;
      startPointer: { x: number; y: number };
      startCrop: NormalizedCropRect;
    };

const MIN_CROP_RATIO = 0.08;
const DEFAULT_CROP: NormalizedCropRect = { x: 0.05, y: 0.08, width: 0.9, height: 0.84 };

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function normalizeCrop(rect: NormalizedCropRect): NormalizedCropRect {
  const width = clamp(rect.width, MIN_CROP_RATIO, 1);
  const height = clamp(rect.height, MIN_CROP_RATIO, 1);
  const x = clamp(rect.x, 0, 1 - width);
  const y = clamp(rect.y, 0, 1 - height);
  return { x, y, width, height };
}

function pointerToNormalized(clientX: number, clientY: number, layout: ImageLayout) {
  return {
    x: clamp((clientX - layout.left) / layout.width, 0, 1),
    y: clamp((clientY - layout.top) / layout.height, 0, 1),
  };
}

function resizeCrop(
  handle: ResizeHandle,
  startCrop: NormalizedCropRect,
  pointer: { x: number; y: number },
  startPointer: { x: number; y: number }
): NormalizedCropRect {
  const dx = pointer.x - startPointer.x;
  const dy = pointer.y - startPointer.y;
  let { x, y, width, height } = startCrop;

  if (handle.includes("w")) {
    const nextX = x + dx;
    const maxX = x + width - MIN_CROP_RATIO;
    x = clamp(nextX, 0, maxX);
    width = startCrop.width + (startCrop.x - x);
  }
  if (handle.includes("e")) {
    width = clamp(startCrop.width + dx, MIN_CROP_RATIO, 1 - x);
  }
  if (handle.includes("n")) {
    const nextY = y + dy;
    const maxY = y + height - MIN_CROP_RATIO;
    y = clamp(nextY, 0, maxY);
    height = startCrop.height + (startCrop.y - y);
  }
  if (handle.includes("s")) {
    height = clamp(startCrop.height + dy, MIN_CROP_RATIO, 1 - y);
  }

  return normalizeCrop({ x, y, width, height });
}

export function QuestionImageCropModal({
  imageUrl,
  sourceFile,
  onConfirm,
  onCancel,
}: QuestionImageCropModalProps) {
  const titleId = useId();
  const viewportRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const [crop, setCrop] = useState<NormalizedCropRect>(DEFAULT_CROP);
  const [imageLayout, setImageLayout] = useState<ImageLayout | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dragStateRef = useRef<DragState | null>(null);

  const updateImageLayout = useCallback(() => {
    const viewport = viewportRef.current;
    const image = imageRef.current;
    if (!viewport || !image || !image.naturalWidth || !image.naturalHeight) return;

    const viewportRect = viewport.getBoundingClientRect();
    const scale = Math.min(
      viewportRect.width / image.naturalWidth,
      viewportRect.height / image.naturalHeight
    );
    const width = image.naturalWidth * scale;
    const height = image.naturalHeight * scale;
    const left = viewportRect.left + (viewportRect.width - width) / 2;
    const top = viewportRect.top + (viewportRect.height - height) / 2;
    setImageLayout({ left, top, width, height });
  }, []);

  useEffect(() => {
    updateImageLayout();
    const viewport = viewportRef.current;
    if (!viewport) return;

    const observer = new ResizeObserver(() => updateImageLayout());
    observer.observe(viewport);
    window.addEventListener("resize", updateImageLayout);
    window.addEventListener("scroll", updateImageLayout, true);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", updateImageLayout);
      window.removeEventListener("scroll", updateImageLayout, true);
    };
  }, [updateImageLayout]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  const endDrag = useCallback((event: PointerEvent) => {
    const drag = dragStateRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    dragStateRef.current = null;
  }, []);

  const handlePointerMove = useCallback(
    (event: PointerEvent) => {
      const drag = dragStateRef.current;
      if (!drag || drag.pointerId !== event.pointerId || !imageLayout) return;

      const pointer = pointerToNormalized(event.clientX, event.clientY, imageLayout);
      if (drag.mode === "move") {
        const dx = pointer.x - drag.startPointer.x;
        const dy = pointer.y - drag.startPointer.y;
        setCrop(
          normalizeCrop({
            x: drag.startCrop.x + dx,
            y: drag.startCrop.y + dy,
            width: drag.startCrop.width,
            height: drag.startCrop.height,
          })
        );
        return;
      }

      setCrop(resizeCrop(drag.handle, drag.startCrop, pointer, drag.startPointer));
    },
    [imageLayout]
  );

  useEffect(() => {
    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", endDrag);
    window.addEventListener("pointercancel", endDrag);
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", endDrag);
      window.removeEventListener("pointercancel", endDrag);
    };
  }, [endDrag, handlePointerMove]);

  const startDrag = (
    event: React.PointerEvent<HTMLElement>,
    mode: DragState["mode"],
    handle?: ResizeHandle
  ) => {
    if (!imageLayout || isSubmitting) return;
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);

    const pointer = pointerToNormalized(event.clientX, event.clientY, imageLayout);
    dragStateRef.current =
      mode === "move"
        ? {
            mode: "move",
            pointerId: event.pointerId,
            startPointer: pointer,
            startCrop: crop,
          }
        : {
            mode: "resize",
            handle: handle!,
            pointerId: event.pointerId,
            startPointer: pointer,
            startCrop: crop,
          };
  };

  const handleConfirm = async () => {
    setError(null);
    setIsSubmitting(true);
    try {
      const croppedFile = await cropImageFile(sourceFile, crop);
      onConfirm(croppedFile);
    } catch (confirmError) {
      const message = confirmError instanceof Error ? confirmError.message : "裁剪失败";
      setError(message);
      setIsSubmitting(false);
    }
  };

  const selectionStyle = imageLayout
    ? {
        left: `${imageLayout.left + crop.x * imageLayout.width}px`,
        top: `${imageLayout.top + crop.y * imageLayout.height}px`,
        width: `${crop.width * imageLayout.width}px`,
        height: `${crop.height * imageLayout.height}px`,
      }
    : undefined;

  const handles: Array<{ id: ResizeHandle; className: string; cursor: string }> = [
    { id: "nw", className: "left-0 top-0 -translate-x-1/2 -translate-y-1/2", cursor: "nwse-resize" },
    { id: "ne", className: "right-0 top-0 translate-x-1/2 -translate-y-1/2", cursor: "nesw-resize" },
    { id: "sw", className: "left-0 bottom-0 -translate-x-1/2 translate-y-1/2", cursor: "nesw-resize" },
    { id: "se", className: "right-0 bottom-0 translate-x-1/2 translate-y-1/2", cursor: "nwse-resize" },
    { id: "n", className: "left-1/2 top-0 -translate-x-1/2 -translate-y-1/2", cursor: "ns-resize" },
    { id: "s", className: "left-1/2 bottom-0 -translate-x-1/2 translate-y-1/2", cursor: "ns-resize" },
    { id: "w", className: "left-0 top-1/2 -translate-x-1/2 -translate-y-1/2", cursor: "ew-resize" },
    { id: "e", className: "right-0 top-1/2 translate-x-1/2 -translate-y-1/2", cursor: "ew-resize" },
  ];

  return (
    <div
      className="fixed inset-0 z-[90] flex flex-col bg-background/95 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      <div className="border-b border-border/80 px-4 py-4">
        <p id={titleId} className="text-sm font-semibold text-foreground">
          框选题目区域
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          拖动选框移动位置，拖动边角或边缘调整大小
        </p>
      </div>

      <div ref={viewportRef} className="relative min-h-0 flex-1 overflow-hidden px-3 py-4">
        <img
          ref={imageRef}
          src={imageUrl}
          alt="待裁剪的题目图片"
          className="mx-auto block h-full w-full object-contain"
          onLoad={updateImageLayout}
          draggable={false}
        />

        {imageLayout && selectionStyle ? (
          <div className="pointer-events-none fixed inset-0 z-[91]">
            <div
              className="pointer-events-auto absolute touch-none"
              style={selectionStyle}
              onPointerDown={(event) => startDrag(event, "move")}
            >
              <div
                className="absolute inset-0 border-2 border-accent shadow-[0_0_0_9999px_rgba(0,0,0,0.55)]"
                style={{ cursor: "move" }}
              />
              <div className="pointer-events-none absolute -top-7 left-0 rounded-md bg-accent px-2 py-0.5 text-[11px] font-medium text-white">
                题目区域
              </div>
              {handles.map((handle) => (
                <button
                  key={handle.id}
                  type="button"
                  aria-label={`调整${handle.id}边`}
                  className={`absolute h-5 w-5 rounded-full border-2 border-accent bg-background shadow-sm ${handle.className}`}
                  style={{ cursor: handle.cursor, pointerEvents: "auto" }}
                  onPointerDown={(event) => startDrag(event, "resize", handle.id)}
                />
              ))}
            </div>
          </div>
        ) : null}
      </div>

      {error ? (
        <p role="alert" className="px-4 text-xs text-rose-600 dark:text-rose-400">
          {error}
        </p>
      ) : null}

      <div className="flex items-center gap-2 border-t border-border/80 px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <button
          type="button"
          onClick={onCancel}
          disabled={isSubmitting}
          className="flex-1 rounded-xl border border-border/80 bg-card px-4 py-3 text-sm font-medium text-muted-foreground transition hover:border-accent/45 hover:text-foreground disabled:opacity-60"
        >
          取消
        </button>
        <button
          type="button"
          onClick={() => void handleConfirm()}
          disabled={isSubmitting}
          className="flex-1 rounded-xl border border-accent/45 bg-accent px-4 py-3 text-sm font-semibold text-white transition hover:bg-accent/90 disabled:opacity-60"
        >
          {isSubmitting ? "处理中..." : "确认上传"}
        </button>
      </div>
    </div>
  );
}
