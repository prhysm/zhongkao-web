import chineseKnowledgeJson from "./chinese-knowledge-structured.json";

export type ChineseHighlightTone = "warning" | "tip" | string;

export type ChineseHighlight = {
  type: ChineseHighlightTone;
  label: string;
  content: string;
};

export type ChineseCorePoint = {
  id: string;
  title: string;
  score_range?: string;
  exam_format?: string[];
  real_exam_examples?: string[];
  answering_strategy?: string[];
  universal_template?: string[];
  highlights?: ChineseHighlight[];
};

export type ChineseCategory = {
  id: string;
  name: string;
  group?: string;
  overview?: string;
  core_points: ChineseCorePoint[];
};

export type ChineseModule = {
  id: string;
  name: string;
  module_highlights?: ChineseHighlight[];
  categories: ChineseCategory[];
};

export type ChineseKnowledgeData = {
  schema_version: string;
  subject: string;
  source: string;
  modules: ChineseModule[];
};

export type ChineseKnowledgeLeaf = {
  id: string;
  title: string;
  selectorLabel: string;
  pathLabel: string;
  pathTitles: string[];
  moduleId: string;
  moduleName: string;
  categoryId: string;
  categoryName: string;
  categoryGroup?: string;
  categoryOverview?: string;
  scoreRange?: string;
  examFormat: string[];
  realExamExamples: string[];
  answeringStrategy: string[];
  universalTemplate: string[];
  highlights: ChineseHighlight[];
};

export type ChineseSkillLeaf = {
  id: string;
  label: string;
  title: string;
  detail: string;
  pathLabel: string;
  pathTitles: string[];
  moduleId: string;
  moduleName: string;
  categoryId: string;
  categoryName: string;
  categoryGroup?: string;
  scoreRange?: string;
  answeringStrategy: string[];
  universalTemplate: string[];
  highlights: ChineseHighlight[];
  examFormat: string[];
};

function normalizeLookupText(value: string): string {
  return value.replace(/\s+/g, "").toLowerCase();
}

function summarizeSkillDetail(leaf: ChineseKnowledgeLeaf): string {
  const preferred =
    leaf.answeringStrategy[0] ??
    leaf.universalTemplate[0] ??
    leaf.highlights[0]?.content ??
    leaf.examFormat[0] ??
    "";

  if (!preferred) return "";
  return preferred.length > 60 ? `${preferred.slice(0, 60)}…` : preferred;
}

const chineseKnowledgeData = chineseKnowledgeJson as ChineseKnowledgeData;

function buildRawLeaves(data: ChineseKnowledgeData): ChineseKnowledgeLeaf[] {
  return data.modules.flatMap((module) =>
    module.categories.flatMap((category) => {
      const categoryPath = [module.name];
      if (category.group && category.group !== category.name) {
        categoryPath.push(category.group);
      }
      categoryPath.push(category.name);

      return category.core_points.map((corePoint) => ({
        id: corePoint.id,
        title: corePoint.title,
        selectorLabel: corePoint.title,
        pathLabel: [...categoryPath, corePoint.title].join(" / "),
        pathTitles: [...categoryPath, corePoint.title],
        moduleId: module.id,
        moduleName: module.name,
        categoryId: category.id,
        categoryName: category.name,
        categoryGroup: category.group,
        categoryOverview: category.overview,
        scoreRange: corePoint.score_range,
        examFormat: corePoint.exam_format ?? [],
        realExamExamples: corePoint.real_exam_examples ?? [],
        answeringStrategy: corePoint.answering_strategy ?? [],
        universalTemplate: corePoint.universal_template ?? [],
        highlights: corePoint.highlights ?? [],
      }));
    })
  );
}

function withUniqueSelectorLabels(leaves: ChineseKnowledgeLeaf[]): ChineseKnowledgeLeaf[] {
  const titleCounts = new Map<string, number>();

  leaves.forEach((leaf) => {
    titleCounts.set(leaf.title, (titleCounts.get(leaf.title) ?? 0) + 1);
  });

  return leaves.map((leaf) => ({
    ...leaf,
    selectorLabel:
      (titleCounts.get(leaf.title) ?? 0) > 1
        ? `${leaf.title}（${leaf.moduleName}·${leaf.categoryName}）`
        : leaf.title,
  }));
}

const chineseKnowledgeLeaves = withUniqueSelectorLabels(buildRawLeaves(chineseKnowledgeData));
const chineseKnowledgeLeafMap = new Map(chineseKnowledgeLeaves.map((leaf) => [leaf.id, leaf]));

const chineseSkillLeaves: ChineseSkillLeaf[] = chineseKnowledgeLeaves
  .filter(
    (leaf) =>
      leaf.answeringStrategy.length > 0 ||
      leaf.universalTemplate.length > 0 ||
      leaf.highlights.length > 0
  )
  .map((leaf) => ({
    id: `${leaf.id}__skill`,
    label: leaf.selectorLabel,
    title: leaf.title,
    detail: summarizeSkillDetail(leaf),
    pathLabel: leaf.pathLabel,
    pathTitles: leaf.pathTitles,
    moduleId: leaf.moduleId,
    moduleName: leaf.moduleName,
    categoryId: leaf.categoryId,
    categoryName: leaf.categoryName,
    categoryGroup: leaf.categoryGroup,
    scoreRange: leaf.scoreRange,
    answeringStrategy: leaf.answeringStrategy,
    universalTemplate: leaf.universalTemplate,
    highlights: leaf.highlights,
    examFormat: leaf.examFormat,
  }));

const chineseSkillLeafMap = new Map(chineseSkillLeaves.map((leaf) => [leaf.id, leaf]));

const chineseKnowledgeOptionLabels = chineseKnowledgeLeaves.map((leaf) => leaf.selectorLabel);
const chineseSkillOptionLabels = chineseSkillLeaves.map((leaf) => leaf.label);

function matchChineseKnowledgeLeaf(candidate: ChineseKnowledgeLeaf, value: string): boolean {
  const normalizedTarget = normalizeLookupText(value);
  return [
    candidate.title,
    candidate.selectorLabel,
    candidate.pathLabel,
    candidate.pathTitles.join(" / "),
  ].some((source) => normalizeLookupText(source) === normalizedTarget);
}

function matchChineseSkillLeaf(candidate: ChineseSkillLeaf, value: string): boolean {
  const normalizedTarget = normalizeLookupText(value);
  return [candidate.label, candidate.title, candidate.pathLabel, candidate.pathTitles.join(" / ")].some(
    (source) => normalizeLookupText(source) === normalizedTarget
  );
}

export const CHINESE_KNOWLEDGE_DATA = chineseKnowledgeData;
export const CHINESE_KNOWLEDGE_MODULES = chineseKnowledgeData.modules;
export const CHINESE_DEFAULT_MODULE_ID = chineseKnowledgeData.modules[0]?.id ?? "ancient-literature";
export const CHINESE_KNOWLEDGE_LEAVES = chineseKnowledgeLeaves;
export const CHINESE_SKILL_LEAVES = chineseSkillLeaves;
export const CHINESE_KNOWLEDGE_OPTION_LABELS = chineseKnowledgeOptionLabels;
export const CHINESE_SKILL_OPTION_LABELS = chineseSkillOptionLabels;

export function findChineseKnowledgeLeafById(id: string): ChineseKnowledgeLeaf | undefined {
  return chineseKnowledgeLeafMap.get(id);
}

export function findChineseKnowledgeLeafByTitle(value: string): ChineseKnowledgeLeaf | undefined {
  return chineseKnowledgeLeaves.find((leaf) => matchChineseKnowledgeLeaf(leaf, value));
}

export function findChineseSkillLeafById(id: string): ChineseSkillLeaf | undefined {
  return chineseSkillLeafMap.get(id);
}

export function findChineseSkillLeafByTitle(value: string): ChineseSkillLeaf | undefined {
  return chineseSkillLeaves.find((leaf) => matchChineseSkillLeaf(leaf, value));
}
