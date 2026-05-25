import { SUBJECTS, Subject } from "@/lib/mockData";
import { normalizeSelectorText } from "@/components/selectors/selector-utils";

export type MistakeItem = {
  id: string;
  subject: Subject;
  source: string;
  /** AI 识别或手填的题目原文，用于二次练习打印 */
  questionText?: string;
  /** 题目图片 URL（Supabase 公开链接或 data URL） */
  questionImageUrl?: string;
  knowledge: string[];
  knowledgeIds: (string | null)[];
  reason: string;
  skill: string;
  skillId?: string;
  solved: boolean;
};

export const MISTAKE_STORAGE_KEY = "zhongkao-multi-tab-mistakes";

/**
 * LocalStorage 里残留的旧数据可能不是数组（被手动改坏 / 旧版本单选结构），
 * 在 parse 阶段做一次兼容和形状校验，校验失败直接退回到空数组，避免后续 .map 等 API 抛错。
 */
export function parseStoredMistakes(raw: string): MistakeItem[] {
  const parsed = JSON.parse(raw) as unknown;
  if (!Array.isArray(parsed)) return [];

  return parsed.flatMap((item, index) => {
    if (!item || typeof item !== "object") return [];

    const record = item as Record<string, unknown>;
    const subject = record.subject;
    if (typeof subject !== "string" || !SUBJECTS.includes(subject as Subject)) return [];

    const knowledge = Array.isArray(record.knowledge)
      ? record.knowledge
          .filter((value): value is string => typeof value === "string")
          .map(normalizeSelectorText)
          .filter(Boolean)
      : typeof record.knowledge === "string"
        ? [normalizeSelectorText(record.knowledge)].filter(Boolean)
        : [];

    const rawKnowledgeIds = Array.isArray(record.knowledgeIds)
      ? record.knowledgeIds
      : typeof record.knowledgeId === "string"
        ? [record.knowledgeId]
        : [];

    const knowledgeIds = knowledge.map((_, knowledgeIndex) => {
      const value = rawKnowledgeIds[knowledgeIndex];
      return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
    });

    return [
      {
        id:
          typeof record.id === "string" && record.id.trim().length > 0
            ? record.id
            : `mistake-${Date.now()}-${index}`,
        subject: subject as Subject,
        source: typeof record.source === "string" ? record.source : "",
        questionText:
          typeof record.questionText === "string" && record.questionText.trim().length > 0
            ? record.questionText.trim()
            : undefined,
        questionImageUrl:
          typeof record.questionImageUrl === "string" && record.questionImageUrl.trim().length > 0
            ? record.questionImageUrl.trim()
            : undefined,
        knowledge,
        knowledgeIds,
        reason: typeof record.reason === "string" ? record.reason : "",
        skill: typeof record.skill === "string" ? record.skill : "",
        skillId:
          typeof record.skillId === "string" && record.skillId.trim().length > 0
            ? record.skillId
            : undefined,
        solved: Boolean(record.solved),
      },
    ];
  });
}
