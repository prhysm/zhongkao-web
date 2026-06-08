"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { MistakeItem } from "@/lib/mistakes-model";
import type { Subject } from "@/lib/mockData";
import { exportToCSV } from "@/lib/mistake-export";
import { needsMobileExportFlow } from "@/lib/mobile-export";

function useMobileExportFlow(): boolean {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    setIsMobile(needsMobileExportFlow());
  }, []);
  return isMobile;
}

type MistakeExportMenuProps = {
  mistakes: MistakeItem[];
  subjectLabel: Subject;
  practicePrintCount: number;
  onPrintReview: () => void;
  onPrintPractice: () => void;
};

function ExportActionList({
  practiceDisabled,
  practicePrintCount,
  onPrintPractice,
  onPrintReview,
  onExport,
  className,
}: {
  practiceDisabled: boolean;
  practicePrintCount: number;
  onPrintPractice: () => void;
  onPrintReview: () => void;
  onExport: () => void;
  className?: string;
}) {
  return (
    <div className={className} role="menu">
      <button
        type="button"
        role="menuitem"
        onClick={onPrintPractice}
        disabled={practiceDisabled}
        className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm text-foreground transition hover:bg-accent-soft/35 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <span aria-hidden>📝</span>
        导出为打印版（二次练习）
        {practiceDisabled ? null : (
          <span className="ml-auto text-xs text-muted-foreground">{practicePrintCount} 题</span>
        )}
      </button>
      <button
        type="button"
        role="menuitem"
        onClick={onPrintReview}
        className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm text-foreground transition hover:bg-accent-soft/35"
      >
        <span aria-hidden>🖨️</span>
        打印复盘清单 (PDF)
      </button>
      <button
        type="button"
        role="menuitem"
        onClick={onExport}
        className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm text-foreground transition hover:bg-accent-soft/35"
      >
        <span aria-hidden>📊</span>
        导出数据表格 (CSV)
      </button>
    </div>
  );
}

export function MistakeExportMenu({
  mistakes,
  subjectLabel,
  practicePrintCount,
  onPrintReview,
  onPrintPractice,
}: MistakeExportMenuProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const practiceDisabled = practicePrintCount === 0;
  const useMobileSheet = useMobileExportFlow();

  useEffect(() => {
    if (!open || useMobileSheet) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, useMobileSheet]);

  useEffect(() => {
    if (!open || !useMobileSheet) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open, useMobileSheet]);

  const handlePrintReview = () => {
    setOpen(false);
    onPrintReview();
  };

  const handlePrintPractice = () => {
    if (practiceDisabled) return;
    setOpen(false);
    onPrintPractice();
  };

  const handleExport = () => {
    setOpen(false);
    void exportToCSV(mistakes, subjectLabel);
  };

  const sheet =
    open && useMobileSheet && typeof document !== "undefined"
      ? createPortal(
          <div className="fixed inset-0 z-[85] flex flex-col justify-end print:hidden">
            <button
              type="button"
              aria-label="关闭导出菜单"
              className="absolute inset-0 bg-black/45"
              onClick={() => setOpen(false)}
            />
            <div
              role="dialog"
              aria-modal="true"
              aria-label="导出/打印错题"
              className="relative rounded-t-2xl border border-border/90 bg-card pb-[max(1rem,env(safe-area-inset-bottom))] shadow-2xl"
            >
              <div className="flex justify-center py-3">
                <span className="h-1 w-10 rounded-full bg-border" aria-hidden />
              </div>
              <p className="px-4 pb-2 text-sm font-semibold text-foreground">导出/打印错题</p>
              <ExportActionList
                practiceDisabled={practiceDisabled}
                practicePrintCount={practicePrintCount}
                onPrintPractice={handlePrintPractice}
                onPrintReview={handlePrintReview}
                onExport={handleExport}
              />
            </div>
          </div>,
          document.body
        )
      : null;

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="inline-flex items-center justify-center gap-2 rounded-full border border-border/80 bg-card px-4 py-2 text-sm font-medium text-foreground transition hover:border-accent/55 hover:bg-accent-soft/25"
      >
        导出/打印错题
        <span aria-hidden className="text-xs text-muted-foreground">
          ▾
        </span>
      </button>

      {open && !useMobileSheet ? (
        <ExportActionList
          practiceDisabled={practiceDisabled}
          practicePrintCount={practicePrintCount}
          onPrintPractice={handlePrintPractice}
          onPrintReview={handlePrintReview}
          onExport={handleExport}
          className="absolute right-0 z-30 mt-2 min-w-[17rem] overflow-hidden rounded-xl border border-border/90 bg-card py-1 shadow-lg"
        />
      ) : null}

      {sheet}
    </div>
  );
}
