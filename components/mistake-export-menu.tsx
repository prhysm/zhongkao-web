"use client";

import { useEffect, useRef, useState } from "react";
import type { MistakeItem } from "@/lib/mistakes-model";
import { exportToCSV } from "@/lib/mistake-export";

type MistakeExportMenuProps = {
  mistakes: MistakeItem[];
};

export function MistakeExportMenu({ mistakes }: MistakeExportMenuProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  const handlePrint = () => {
    setOpen(false);
    window.print();
  };

  const handleExport = () => {
    setOpen(false);
    exportToCSV(mistakes);
  };

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

      {open ? (
        <div
          role="menu"
          className="absolute right-0 z-30 mt-2 min-w-[15rem] overflow-hidden rounded-xl border border-border/90 bg-card py-1 shadow-lg"
        >
          <button
            type="button"
            role="menuitem"
            onClick={handlePrint}
            className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-foreground transition hover:bg-accent-soft/35"
          >
            <span aria-hidden>🖨️</span>
            打印复盘清单 (PDF)
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={handleExport}
            className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-foreground transition hover:bg-accent-soft/35"
          >
            <span aria-hidden>📊</span>
            导出数据表格 (CSV)
          </button>
        </div>
      ) : null}
    </div>
  );
}
