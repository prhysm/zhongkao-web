import { KnowledgeMarkdown } from "@/components/knowledge-markdown";
import { displayMistakeField } from "@/lib/mistake-export";
import type { MistakeItem } from "@/lib/mistakes-model";
import type { Subject } from "@/lib/mockData";

type MistakePracticePrintSheetProps = {
  mistakes: MistakeItem[];
  subjectLabel: Subject;
  className?: string;
};

function formatPrintDate(date = new Date()): string {
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);
}

function resolveQuestionBody(item: MistakeItem): string {
  const questionText = item.questionText?.trim() ?? "";
  if (questionText) return questionText;
  return "";
}

function resolveQuestionImageUrl(item: MistakeItem): string | null {
  const url = item.questionImageUrl?.trim() ?? "";
  if (!url) return null;
  if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("data:image/")) {
    return url;
  }
  return null;
}

export function MistakePracticePrintSheet({
  mistakes,
  subjectLabel,
  className = "mistake-practice-print-sheet hidden print:block",
}: MistakePracticePrintSheetProps) {
  if (mistakes.length === 0) {
    return (
      <div className={className}>
        <p className="text-sm text-neutral-700">未勾选错题，无法生成二次练习打印版。</p>
      </div>
    );
  }

  return (
    <div className={`${className} print:text-black`}>
      <header className="mb-6 border-b border-neutral-300 pb-4">
        <p className="text-xs tracking-[0.2em] text-neutral-500 uppercase">二次练习</p>
        <h1 className="mt-1 text-2xl font-semibold text-black">{subjectLabel} · 错题重做练习卷</h1>
        <p className="mt-2 text-sm text-neutral-600">
          打印日期：{formatPrintDate()} · 共 {mistakes.length} 题 · 请在留白处重新作答
        </p>
      </header>

      <div className="space-y-0">
        {mistakes.map((item, index) => {
          const sourceLabel = displayMistakeField(item.source);
          const questionBody = resolveQuestionBody(item);
          const imageUrl = resolveQuestionImageUrl(item);

          return (
            <article key={item.id} className="mistake-practice-print-item break-inside-avoid">
              <div className="mistake-practice-print-prompt">
                <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-neutral-200 pb-2">
                  <p className="text-sm font-semibold text-black">第 {index + 1} 题</p>
                  <p className="text-xs text-neutral-500">{item.subject}</p>
                </div>

                <div className="mt-3 space-y-3">
                  <div>
                    <p className="text-[11px] font-semibold tracking-[0.14em] text-neutral-500 uppercase">
                      题目出处
                    </p>
                    <p className="mt-1 text-sm leading-relaxed text-black">{sourceLabel}</p>
                  </div>

                  {questionBody ? (
                    <div>
                      <p className="text-[11px] font-semibold tracking-[0.14em] text-neutral-500 uppercase">
                        题目原文
                      </p>
                      <div className="mt-1 text-sm leading-relaxed text-black [&_.text-muted-foreground]:text-neutral-800 [&_p]:mb-2 [&_p:last-child]:mb-0">
                        <KnowledgeMarkdown markdown={questionBody} />
                      </div>
                    </div>
                  ) : null}

                  {imageUrl ? (
                    <div>
                      <p className="text-[11px] font-semibold tracking-[0.14em] text-neutral-500 uppercase">
                        题目图片
                      </p>
                      <img
                        src={imageUrl}
                        alt={`第 ${index + 1} 题题目图片`}
                        className="mistake-practice-print-image mt-2 max-h-[220px] w-auto max-w-full rounded-md border border-neutral-200 object-contain"
                      />
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="mistake-practice-handwriting" aria-label={`第 ${index + 1} 题作答区`}>
                <p className="text-[11px] font-medium tracking-[0.12em] text-neutral-400">作答区</p>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
