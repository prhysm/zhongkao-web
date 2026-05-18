import { KnowledgeMarkdown } from "@/components/knowledge-markdown";
import { displayMistakeField, formatMistakeKnowledge } from "@/lib/mistake-export";
import type { MistakeItem } from "@/lib/mistakes-model";
import type { Subject } from "@/lib/mockData";

type MistakePrintSheetProps = {
  mistakes: MistakeItem[];
  subjectLabel: Subject;
};

function formatPrintDate(date = new Date()): string {
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);
}

export function MistakePrintSheet({ mistakes, subjectLabel }: MistakePrintSheetProps) {
  if (mistakes.length === 0) {
    return (
      <div className="hidden print:block">
        <p className="text-sm text-neutral-700">
          {subjectLabel} 暂无错题记录，添加后再打印复盘清单。
        </p>
      </div>
    );
  }

  return (
    <div className="hidden print:block print:text-black">
      <header className="mb-6 border-b border-neutral-300 pb-4">
        <p className="text-xs tracking-[0.2em] text-neutral-500 uppercase">考前复盘</p>
        <h1 className="mt-1 text-2xl font-semibold text-black">{subjectLabel} · 错题本复盘清单</h1>
        <p className="mt-2 text-sm text-neutral-600">
          打印日期：{formatPrintDate()} · {subjectLabel} 共 {mistakes.length} 题
        </p>
      </header>

      <div className="space-y-4">
        {mistakes.map((item, index) => {
          const knowledgeLabel = formatMistakeKnowledge(item.knowledge);
          const sourceLabel = displayMistakeField(item.source);

          return (
            <article
              key={item.id}
              className="break-inside-avoid rounded-lg border border-neutral-300 bg-white p-4 shadow-none"
            >
              <div className="flex flex-wrap items-start justify-between gap-2 border-b border-neutral-200 pb-3">
                <div className="min-w-0 flex-1">
                  <p className="text-base font-semibold leading-snug text-black">{knowledgeLabel}</p>
                  <p className="mt-1 text-sm font-medium text-neutral-800">出处：{sourceLabel}</p>
                </div>
                <span className="shrink-0 text-xs text-neutral-500">
                  第 {index + 1} 题{item.solved ? " · 已掌握" : ""}
                </span>
              </div>

              <div className="mt-3 space-y-3">
                <div className="rounded-md border border-neutral-200 px-3 py-2.5">
                  <p className="text-[11px] font-semibold tracking-[0.14em] text-neutral-500 uppercase">
                    错误原因
                  </p>
                  <div className="mt-1.5 text-sm leading-relaxed text-black [&_.text-muted-foreground]:text-neutral-800 [&_p]:mb-2 [&_p:last-child]:mb-0">
                    {item.reason.trim() ? (
                      <KnowledgeMarkdown markdown={item.reason} />
                    ) : (
                      <p>-</p>
                    )}
                  </div>
                </div>

                <div className="rounded-md border border-neutral-200 px-3 py-2.5">
                  <p className="text-[11px] font-semibold tracking-[0.14em] text-neutral-500 uppercase">
                    解题技巧
                  </p>
                  <p className="mt-1.5 text-sm leading-relaxed text-black">{displayMistakeField(item.skill)}</p>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
