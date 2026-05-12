export type FocusExamBlock = {
  id: string;
  label: string;
  idealMinutes: number;
};

export type FocusExamTemplate = {
  id: string;
  label: string;
  totalMinutes: number;
  blocks: FocusExamBlock[];
};

export const EXAM_TEMPLATES: FocusExamTemplate[] = [
  {
    id: "chinese",
    label: "语文",
    totalMinutes: 100,
    blocks: [
      { id: "dictation", label: "默写", idealMinutes: 5 },
      { id: "classical", label: "文言文", idealMinutes: 7 },
      { id: "social-reading", label: "社科文", idealMinutes: 18 },
      { id: "narrative-reading", label: "记叙文", idealMinutes: 20 },
      { id: "application", label: "综合运用", idealMinutes: 10 },
      { id: "essay", label: "作文", idealMinutes: 40 },
    ],
  },
  {
    id: "math",
    label: "数学",
    totalMinutes: 100,
    blocks: [
      { id: "basic", label: "选择填空", idealMinutes: 20 },
      { id: "medium", label: "中档题", idealMinutes: 30 },
      { id: "hard", label: "压轴题", idealMinutes: 50 },
    ],
  },
  {
    id: "english",
    label: "英语",
    totalMinutes: 90,
    blocks: [
      { id: "listening", label: "听力", idealMinutes: 15 },
      { id: "grammar", label: "语法词汇", idealMinutes: 10 },
      { id: "reading", label: "阅读", idealMinutes: 30 },
      { id: "writing", label: "写作", idealMinutes: 30 },
      { id: "check", label: "检查", idealMinutes: 5 },
    ],
  },
  {
    id: "combined",
    label: "综合测试",
    totalMinutes: 120,
    blocks: [
      { id: "physics", label: "物理", idealMinutes: 60 },
      { id: "chemistry", label: "化学", idealMinutes: 40 },
      { id: "interdisciplinary", label: "跨学科", idealMinutes: 15 },
      { id: "combined-check", label: "检查", idealMinutes: 5 },
    ],
  },
  {
    id: "history",
    label: "历史",
    totalMinutes: 40,
    blocks: [{ id: "history-full", label: "整卷作答", idealMinutes: 40 }],
  },
  {
    id: "politics",
    label: "道法",
    totalMinutes: 40,
    blocks: [{ id: "politics-full", label: "整卷作答", idealMinutes: 40 }],
  },
];

export const DEFAULT_TEMPLATE = EXAM_TEMPLATES[0];

export function cloneFocusExamBlocks(blocks: FocusExamBlock[]): FocusExamBlock[] {
  return blocks.map((block) => ({ ...block }));
}

export function getFocusExamTemplateBySubjectLabel(subjectLabel: string): FocusExamTemplate | undefined {
  return EXAM_TEMPLATES.find((template) => template.label === subjectLabel);
}
