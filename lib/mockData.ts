import physicsKnowledgeJson from "./physics-knowledge.json";
import mathKnowledgeJson from "./math-knowledge.json";
import polKnowledgeJson from "./pol-knowledge.json";
import chemKnowledgeJson from "./chem-knowledge.json";
import crossKnowledgeJson from "./cross-knowledge.json";
import historyKnowledgeJson from "./history-knowledge.json";
import { ENGLISH_KNOWLEDGE_LEAVES } from "./english-knowledge";

export const SUBJECTS = ["语文", "数学", "英语", "物理", "化学", "跨学科", "历史", "道法"] as const;

export type Subject = (typeof SUBJECTS)[number];

/** 按章节、小节组织的知识点正文（Markdown），物理 / 数学等科目共用 */
export type StructuredKnowledgeItem = {
  id: string;
  chapter: string;
  book?: string;
  title: string;
  content: string;
  imagePlaceholder?: boolean;
};

/** @deprecated 请使用 StructuredKnowledgeItem */
export type PhysicsKnowledgeItem = StructuredKnowledgeItem;

const unicodeSubscriptMap: Record<string, string> = {
  "₀": "0",
  "₁": "1",
  "₂": "2",
  "₃": "3",
  "₄": "4",
  "₅": "5",
  "₆": "6",
  "₇": "7",
  "₈": "8",
  "₉": "9",
  "₊": "+",
  "₋": "-",
  "₌": "=",
  "₍": "(",
  "₎": ")",
};

function normalizeInlineLatex(text: string): string {
  return text.replace(/\$([^$]+)\$/g, (_match, body: string) => {
    const normalizedBody = body
      .trim()
      .replace(/([A-Za-z\)\]])([₀₁₂₃₄₅₆₇₈₉₊₋₌₍₎]+)/g, (_subMatch, base: string, subscript: string) => {
        const normalizedSubscript = Array.from(subscript)
          .map((char) => unicodeSubscriptMap[char] ?? char)
          .join("");
        return `${base}_{${normalizedSubscript}}`;
      });

    return `$${normalizedBody}$`;
  });
}

function sanitizeChemistryKnowledgeItem(item: StructuredKnowledgeItem): StructuredKnowledgeItem {
  return {
    ...item,
    chapter: normalizeInlineLatex(item.chapter),
    title: normalizeInlineLatex(item.title),
    content: normalizeInlineLatex(item.content),
  };
}

/** 初中物理、数学、道法、化学、跨学科等：文档导入的结构化知识点 */
export const KNOWLEDGE_POINTS: {
  物理: StructuredKnowledgeItem[];
  数学: StructuredKnowledgeItem[];
  道法: StructuredKnowledgeItem[];
  化学: StructuredKnowledgeItem[];
  跨学科: StructuredKnowledgeItem[];
  历史: StructuredKnowledgeItem[];
} = {
  物理: physicsKnowledgeJson as StructuredKnowledgeItem[],
  数学: mathKnowledgeJson as StructuredKnowledgeItem[],
  道法: polKnowledgeJson as StructuredKnowledgeItem[],
  化学: (chemKnowledgeJson as StructuredKnowledgeItem[]).map(sanitizeChemistryKnowledgeItem),
  跨学科: crossKnowledgeJson as StructuredKnowledgeItem[],
  历史: historyKnowledgeJson as StructuredKnowledgeItem[],
};

export const STRUCTURED_KNOWLEDGE_SUBJECTS = ["物理", "数学", "道法", "化学", "跨学科", "历史"] as const satisfies readonly Subject[];

export function getStructuredKnowledge(subject: Subject): StructuredKnowledgeItem[] | null {
  if (subject === "物理") return KNOWLEDGE_POINTS.物理;
  if (subject === "数学") return KNOWLEDGE_POINTS.数学;
  if (subject === "道法") return KNOWLEDGE_POINTS.道法;
  if (subject === "化学") return KNOWLEDGE_POINTS.化学;
  if (subject === "跨学科") return KNOWLEDGE_POINTS.跨学科;
  if (subject === "历史") return KNOWLEDGE_POINTS.历史;
  return null;
}

/** 知识点目录是否按「教材册数」二次分组（chapter 形如「七年级上册 - 第一单元 …」） */
export function usesVolumeGroupedKnowledgeDirectory(subject: Subject): boolean {
  return subject === "道法";
}

/** 化学 / 历史：按分组标题展示卡片网格，详情按条目 id 选中 */
export function usesItemIdKnowledgeDirectory(subject: Subject): boolean {
  return subject === "化学" || subject === "历史";
}

function summarizeForPicker(content: string): string {
  const first = content
    .replace(/\*\*/g, "")
    .split("\n")
    .find((line) => line.trim().length > 0);
  if (!first) return "";
  return first.length > 140 ? `${first.slice(0, 140)}…` : first;
}

export type KnowledgePoint = {
  id: string;
  title: string;
  summary: string;
};

export const knowledgePoints: Record<Subject, KnowledgePoint[]> = {
  语文: [
    { id: "cn-modern-reading", title: "现代文阅读主旨提炼", summary: "先分层再归纳中心句，避免只摘抄原文。"},
    { id: "cn-classic-words", title: "文言实词语境推断", summary: "结合上下句关系与常见义项进行排除。"},
  ],
  数学: KNOWLEDGE_POINTS.数学.map((item) => ({
    id: item.id,
    title: item.title,
    summary: summarizeForPicker(item.content),
  })),
  英语: ENGLISH_KNOWLEDGE_LEAVES.map((item) => ({
    id: item.id,
    title: item.title,
    summary: summarizeForPicker(item.coreContent),
  })),
  物理: KNOWLEDGE_POINTS.物理.map((item) => ({
    id: item.id,
    title: item.title,
    summary: summarizeForPicker(item.content),
  })),
  化学: KNOWLEDGE_POINTS.化学.map((item) => ({
    id: item.id,
    title: item.title,
    summary: summarizeForPicker(item.content),
  })),
  跨学科: KNOWLEDGE_POINTS.跨学科.map((item) => ({
    id: item.id,
    title: item.title,
    summary: summarizeForPicker(item.content),
  })),
  历史: KNOWLEDGE_POINTS.历史.map((item) => ({
    id: item.id,
    title: item.title,
    summary: summarizeForPicker(item.content),
  })),
  道法: KNOWLEDGE_POINTS.道法.map((item) => ({
    id: item.id,
    title: item.title,
    summary: summarizeForPicker(item.content),
  })),
};

