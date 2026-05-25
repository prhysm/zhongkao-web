import type { MistakeItem } from "@/lib/mistakes-model";

export type MistakePrintMode = "review" | "practice" | null;

/** 从当前学科错题中筛出用户勾选的条目，保持列表原有顺序。 */
export function pickMistakesForPracticePrint(
  subjectMistakes: MistakeItem[],
  selectedMistakeIds: ReadonlySet<string>
): MistakeItem[] {
  if (selectedMistakeIds.size === 0) return [];
  return subjectMistakes.filter((item) => selectedMistakeIds.has(item.id));
}

export function getPracticePrintSheetClassName(active: boolean): string {
  return active ? "mistake-practice-print-sheet hidden print:block" : "hidden";
}

export function getReviewPrintSheetClassName(active: boolean): string {
  return active ? "mistake-review-print-sheet hidden print:block" : "hidden";
}
