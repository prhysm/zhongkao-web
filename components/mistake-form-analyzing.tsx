"use client";

export function MistakeFormAnalyzing() {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className="rounded-2xl border border-accent/30 bg-accent-soft/20 p-5"
    >
      <div className="flex items-start gap-4">
        <div
          className="mt-0.5 h-9 w-9 shrink-0 animate-spin rounded-full border-2 border-accent/25 border-t-accent"
          aria-hidden
        />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-foreground">AI 正在识别题目并拆解知识点...</p>
          <p className="mt-1 text-xs text-muted-foreground">请稍候，识别完成后将自动填入表单</p>
        </div>
      </div>

      <div className="mt-5 space-y-3" aria-hidden>
        <div className="h-3 w-28 animate-pulse rounded-full bg-border/80" />
        <div className="h-10 animate-pulse rounded-xl bg-border/70" />
        <div className="h-10 animate-pulse rounded-xl bg-border/70" />
        <div className="h-24 animate-pulse rounded-xl bg-border/70" />
        <div className="h-10 animate-pulse rounded-xl bg-border/70" />
      </div>
    </div>
  );
}
