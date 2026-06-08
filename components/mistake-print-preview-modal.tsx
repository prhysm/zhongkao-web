"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { MistakePracticePrintSheet } from "@/components/mistake-practice-print-sheet";
import { MistakePrintSheet } from "@/components/mistake-print-sheet";
import { needsMobileExportFlow } from "@/lib/mobile-export";
import type { MistakePrintMode } from "@/lib/mistake-practice-print";
import type { MistakeItem } from "@/lib/mistakes-model";
import type { Subject } from "@/lib/mockData";

type MistakePrintPreviewModalProps = {
  mode: Exclude<MistakePrintMode, null>;
  mistakes: MistakeItem[];
  subjectLabel: Subject;
  onClose: () => void;
};

export function MistakePrintPreviewModal({
  mode,
  mistakes,
  subjectLabel,
  onClose,
}: MistakePrintPreviewModalProps) {
  const title = mode === "review" ? "错题复盘清单" : "二次练习卷";
  const isMobile = needsMobileExportFlow();

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  const handlePrint = () => {
    window.print();
  };

  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      className="mistake-print-preview-modal fixed inset-0 z-[95] flex flex-col bg-background print:static print:inset-auto print:z-auto print:block print:bg-white"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-border/80 bg-background/95 px-4 py-3 backdrop-blur-sm print:hidden">
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition hover:bg-accent-soft/35 hover:text-foreground"
        >
          关闭
        </button>
        <p className="min-w-0 truncate text-sm font-semibold text-foreground">{title}</p>
        <button
          type="button"
          onClick={handlePrint}
          className="shrink-0 rounded-lg bg-accent px-3 py-2 text-sm font-medium text-accent-foreground transition hover:opacity-90"
        >
          {isMobile ? "保存 PDF" : "打印"}
        </button>
      </header>

      {isMobile ? (
        <p className="shrink-0 border-b border-border/60 bg-accent-soft/20 px-4 py-2 text-xs leading-relaxed text-muted-foreground print:hidden">
          点击「保存 PDF」后，在系统菜单中选择「存储到文件」或「分享」即可保存。
        </p>
      ) : null}

      <div className="min-h-0 flex-1 overflow-y-auto bg-white p-4 print:overflow-visible print:p-0 md:p-8">
        {mode === "review" ? (
          <MistakePrintSheet
            mistakes={mistakes}
            subjectLabel={subjectLabel}
            className="mistake-review-print-sheet block text-black"
          />
        ) : (
          <MistakePracticePrintSheet
            mistakes={mistakes}
            subjectLabel={subjectLabel}
            className="mistake-practice-print-sheet block text-black"
          />
        )}
      </div>
    </div>,
    document.body
  );
}
