"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  getStructuredKnowledge,
  knowledgePoints,
  SUBJECTS,
  Subject,
  KnowledgePoint,
  StructuredKnowledgeItem,
  usesItemIdKnowledgeDirectory,
} from "@/lib/mockData";
import { CreatableMultiSelect } from "@/components/selectors";
import { AuthHeader } from "@/components/auth-header";
import {
  appendUniqueSelectorValue,
  normalizeSelectorText,
} from "@/components/selectors/selector-utils";
import { StructuredKnowledgePanel } from "@/components/structured-knowledge-panel";
import { EnglishKnowledgePanel } from "@/components/english-knowledge-panel";
import { ChineseKnowledgePanel } from "@/components/chinese-knowledge-panel";
import { LearningDiagnosticsDashboard } from "@/components/learning-diagnostics-dashboard";
import {
  ENGLISH_KNOWLEDGE_TREE,
  findEnglishKnowledgeLeafById,
  findEnglishKnowledgeLeafByTitle,
} from "@/lib/english-knowledge";
import {
  CHINESE_DEFAULT_MODULE_ID,
  CHINESE_KNOWLEDGE_LEAVES,
  CHINESE_KNOWLEDGE_OPTION_LABELS,
  findChineseKnowledgeLeafById,
  findChineseKnowledgeLeafByTitle,
} from "@/lib/chinese-knowledge";
import { KnowledgeInlineMarkdown, KnowledgeMarkdown } from "@/components/knowledge-markdown";
import { getKnowledgeFrequencyMeta } from "@/lib/knowledge-frequency";
import {
  FOCUS_EXAM_SUBJECTS,
  LearningTabKey,
  ScoreRecord,
  TimeManagementRecord,
} from "@/lib/study-data";
import { getFocusExamTemplateBySubjectLabel } from "@/lib/focus-exams";
import { type MistakeItem } from "@/lib/mistakes-model";
import { useStudyRecords } from "@/lib/study-records-context";

type JumpTarget = { id: string } | null;

const CHINESE_KNOWLEDGE_POINTS: KnowledgePoint[] = CHINESE_KNOWLEDGE_LEAVES.map((item) => ({
  id: item.id,
  title: item.selectorLabel,
  summary:
    item.examFormat[0] ??
    item.answeringStrategy[0] ??
    item.universalTemplate[0] ??
    item.pathLabel,
}));

type MistakeBookProps = {
  activeTab?: LearningTabKey;
  onActiveTabChange?: (tab: LearningTabKey) => void;
  isExpanded?: boolean;
  onExpandedChange?: (nextValue: boolean) => void;
};

type EditableScoreBlock = {
  id: string;
  label: string;
  score: string;
  fullScore: string;
};

type ScoreEditorState = {
  recordId: string | null;
  timeManagementRecordId: string | null;
  subjectLabel: string;
  examName: string;
  recordedAt: string;
  blocks: EditableScoreBlock[];
};

type StudyRecordsSnapshot = ReturnType<typeof useStudyRecords>;

type MistakeBookContentProps = MistakeBookProps &
  Omit<StudyRecordsSnapshot, "mistakes"> & {
    mistakes?: MistakeItem[];
  };

function normalizeMistakeEntries(mistakes: MistakeItem[] = []): MistakeItem[] {
  return mistakes.map((item) => {
    const knowledge = Array.isArray(item.knowledge)
      ? item.knowledge.filter((value): value is string => typeof value === "string" && value.trim().length > 0)
      : [];
    const rawKnowledgeIds = Array.isArray(item.knowledgeIds) ? item.knowledgeIds : [];

    return {
      ...item,
      knowledge,
      knowledgeIds: knowledge.map((_, knowledgeIndex) => {
        const value = rawKnowledgeIds[knowledgeIndex];
        return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
      }),
    };
  });
}

function MistakeBookLoadingSkeleton() {
  return (
    <section className="frosted-card flex min-h-0 flex-1 flex-col p-6 lg:p-8">
      <div className="border-b border-border/80 pb-5">
        <h2 className="text-2xl font-semibold tracking-wide">学习功能栏</h2>
        <p className="mt-1 text-sm text-muted-foreground">正在同步错题数据...</p>
      </div>
      <div className="mt-5 space-y-4">
        <div className="h-10 rounded-full border border-border/70 bg-card/70" />
        <div className="grid gap-3">
          <div className="h-10 rounded-xl border border-border/70 bg-card/70" />
          <div className="h-24 rounded-2xl border border-border/70 bg-card/70" />
          <div className="h-24 rounded-2xl border border-border/70 bg-card/70" />
        </div>
      </div>
    </section>
  );
}

function formatMinutesFromSeconds(totalSeconds: number): string {
  const rounded = Math.round((Math.max(0, totalSeconds) / 60) * 10) / 10;
  return Number.isInteger(rounded) ? rounded.toFixed(0) : rounded.toFixed(1);
}

function formatRecordDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "时间未知";
  return new Intl.DateTimeFormat("zh-CN", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatScoreRecordDate(value: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [, month, day] = value.split("-");
    return `${Number(month)}月${Number(day)}日`;
  }
  return formatRecordDate(value);
}

function toDateInputValue(value?: string): string {
  if (value && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }

  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) {
    return new Date().toISOString().slice(0, 10);
  }

  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatPercentage(rate: number | null): string {
  if (rate === null || !Number.isFinite(rate)) return "--";
  const percentage = Math.round(rate * 1000) / 10;
  return `${Number.isInteger(percentage) ? percentage.toFixed(0) : percentage.toFixed(1)}%`;
}

function getRate(score: number, fullScore: number): number | null {
  if (!Number.isFinite(score) || !Number.isFinite(fullScore) || fullScore <= 0) return null;
  return score / fullScore;
}

function getRateBarWidth(rate: number | null): string {
  if (rate === null || !Number.isFinite(rate)) return "0%";
  return `${Math.max(0, Math.min(100, rate * 100))}%`;
}

function getScoreRateStyle(rate: number | null): {
  badgeClassName: string;
  fillClassName: string;
  softClassName: string;
  label: string;
} {
  if (rate === null || !Number.isFinite(rate)) {
    return {
      badgeClassName: "border-border/80 bg-card text-muted-foreground",
      fillClassName: "bg-border",
      softClassName: "border-border/80 bg-background/60",
      label: "待录入",
    };
  }

  if (rate >= 0.85) {
    return {
      badgeClassName: "border-emerald-500/35 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
      fillClassName: "bg-emerald-500/80",
      softClassName: "border-emerald-500/20 bg-emerald-500/5",
      label: "优势",
    };
  }

  if (rate >= 0.7) {
    return {
      badgeClassName: "border-amber-500/35 bg-amber-500/10 text-amber-700 dark:text-amber-300",
      fillClassName: "bg-amber-500/80",
      softClassName: "border-amber-500/20 bg-amber-500/5",
      label: "稳定",
    };
  }

  return {
    badgeClassName: "border-rose-500/35 bg-rose-500/10 text-rose-700 dark:text-rose-300",
    fillClassName: "bg-rose-500/80",
    softClassName: "border-rose-500/20 bg-rose-500/5",
    label: "待提升",
  };
}

function TrashIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M4.75 7.25h14.5" />
      <path d="M9.25 3.75h5.5" />
      <path d="M7.75 7.25v10.5a1.5 1.5 0 0 0 1.5 1.5h5.5a1.5 1.5 0 0 0 1.5-1.5V7.25" />
      <path d="M10 10.5v5.25M14 10.5v5.25" />
    </svg>
  );
}

function buildEditableScoreBlocks(
  blocks: Array<{ id: string; label: string; score?: number; fullScore?: number }>
): EditableScoreBlock[] {
  return blocks.map((block) => ({
    id: block.id,
    label: block.label,
    score: block.score === undefined ? "" : String(block.score),
    fullScore: block.fullScore === undefined ? "" : String(block.fullScore),
  }));
}

function getDefaultScoreBlocks(subjectLabel: string): EditableScoreBlock[] {
  const template = getFocusExamTemplateBySubjectLabel(subjectLabel);
  if (template) {
    return buildEditableScoreBlocks(template.blocks);
  }

  return buildEditableScoreBlocks([{ id: `${subjectLabel}-full`, label: "整卷" }]);
}

function findScoreBlock(
  record: ScoreRecord,
  target: { id: string; label: string }
): ScoreRecord["blocks"][number] | undefined {
  return record.blocks.find((block) => block.id === target.id) ?? record.blocks.find((block) => block.label === target.label);
}

function normalizeKnowledgeSearchText(value: string): string {
  return value.replace(/\s+/g, "").toLowerCase();
}

function matchesKnowledgeSearch(query: string, values: Array<string | undefined>): boolean {
  if (!query) return true;
  return values.some((value) => normalizeKnowledgeSearchText(value ?? "").includes(query));
}

function getHistoryKnowledgeOptionLabel(item: { chapter?: string; title: string }): string {
  const chapter = item.chapter?.trim();
  return chapter ? `${chapter} · ${item.title}` : item.title;
}

function resolveKnowledgeSelection(
  subject: Subject,
  structuredKnowledge: StructuredKnowledgeItem[] | null,
  rawValue: string
): { label: string; id: string | null } {
  const normalizedKnowledge = normalizeSelectorText(rawValue);
  const fallbackLabel = rawValue.trim() || normalizedKnowledge;
  const matchedChineseKnowledge = subject === "语文" ? findChineseKnowledgeLeafByTitle(rawValue) : undefined;
  const matchedStructuredKnowledge =
    structuredKnowledge?.find((item) => {
      if (normalizeSelectorText(item.title) === normalizedKnowledge) return true;
      if (subject !== "历史") return false;
      return normalizeSelectorText(getHistoryKnowledgeOptionLabel(item)) === normalizedKnowledge;
    }) ??
    (subject === "历史" && structuredKnowledge
      ? (() => {
          const q = normalizedKnowledge.toLowerCase();
          const partialMatches = structuredKnowledge.filter((item) => {
            const title = normalizeSelectorText(item.title).toLowerCase();
            const label = normalizeSelectorText(getHistoryKnowledgeOptionLabel(item)).toLowerCase();
            return title.includes(q) || label.includes(q);
          });
          return partialMatches.length === 1 ? partialMatches[0] : undefined;
        })()
      : undefined);

  const matchedKnowledge =
    (matchedChineseKnowledge
      ? { id: matchedChineseKnowledge.id, title: matchedChineseKnowledge.selectorLabel }
      : undefined) ??
    matchedStructuredKnowledge ??
    knowledgePoints[subject].find((item) => normalizeSelectorText(item.title) === normalizedKnowledge);

  return {
    label: matchedKnowledge?.title ?? fallbackLabel,
    id: matchedKnowledge?.id ?? null,
  };
}

function findStructuredKnowledgeBySelection(
  subject: Subject,
  items: StructuredKnowledgeItem[] | null,
  label: string
): StructuredKnowledgeItem | undefined {
  if (!items) return undefined;

  const normalizedLabel = normalizeSelectorText(label);
  return items.find((entry) => {
    if (normalizeSelectorText(entry.title) === normalizedLabel) return true;
    if (subject !== "历史") return false;
    return normalizeSelectorText(getHistoryKnowledgeOptionLabel(entry)) === normalizedLabel;
  });
}

export function MistakeBook(props: MistakeBookProps) {
  const studyRecords = useStudyRecords();
  const hasMistakeArray = Array.isArray(studyRecords.mistakes);

  if (!hasMistakeArray && !studyRecords.mistakesMounted) {
    return <MistakeBookLoadingSkeleton />;
  }

  return (
    <MistakeBookContent
      {...props}
      {...studyRecords}
      mistakes={hasMistakeArray ? studyRecords.mistakes : []}
    />
  );
}

function MistakeBookContent({
  activeTab: externalActiveTab,
  onActiveTabChange,
  isExpanded = false,
  onExpandedChange,
  mistakes = [],
  setMistakes,
  mistakesMounted,
  timeManagementRecords = [],
  setTimeManagementRecords,
  timeRecordsMounted,
  scoreRecords = [],
  setScoreRecords,
  scoreRecordsMounted,
  usingCloudRecords,
  syncError,
  syncStatus,
}: MistakeBookContentProps) {
  const [internalActiveTab, setInternalActiveTab] = useState<LearningTabKey>("mistakes");
  const [subject, setSubject] = useState<Subject>("数学");
  const [jumpTarget, setJumpTarget] = useState<JumpTarget>(null);
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const [expandedEnglishKnowledgeNodes, setExpandedEnglishKnowledgeNodes] = useState<Record<string, boolean>>({});
  const [activeChineseKnowledgeModuleId, setActiveChineseKnowledgeModuleId] = useState(CHINESE_DEFAULT_MODULE_ID);
  const [selectedChineseKnowledgeCategoryId, setSelectedChineseKnowledgeCategoryId] = useState<string | null>(null);
  /** 结构化科目：null 为目录；化学为条目 id，其余科目为 chapter 字符串 */
  const [selectedKnowledgeDirectoryKey, setSelectedKnowledgeDirectoryKey] = useState<string | null>(null);

  const [source, setSource] = useState("");
  const [knowledge, setKnowledge] = useState<string[]>([]);
  const [knowledgeQuery, setKnowledgeQuery] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [reason, setReason] = useState("");
  const [skill, setSkill] = useState("");
  const [timeSubjectFilter, setTimeSubjectFilter] = useState<string>("全部");
  const [scoreSubjectFilter, setScoreSubjectFilter] = useState<string>("语文");
  const [scoreEditor, setScoreEditor] = useState<ScoreEditorState | null>(null);
  const [scoreEditorError, setScoreEditorError] = useState<string | null>(null);
  const [pendingDeleteTimeRecord, setPendingDeleteTimeRecord] = useState<TimeManagementRecord | null>(null);

  const knowledgeRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const activeTab = externalActiveTab ?? internalActiveTab;
  const safeMistakes = useMemo(() => normalizeMistakeEntries(mistakes), [mistakes]);

  const changeActiveTab = (nextTab: LearningTabKey) => {
    setInternalActiveTab(nextTab);
    onActiveTabChange?.(nextTab);
  };

  const currentKnowledge = subject === "语文" ? CHINESE_KNOWLEDGE_POINTS : knowledgePoints[subject];
  const structuredKnowledge = getStructuredKnowledge(subject);

  const knowledgeOptions = useMemo(() => {
    if (subject === "语文") {
      return CHINESE_KNOWLEDGE_OPTION_LABELS;
    }
    if (subject === "历史" && structuredKnowledge) {
      return structuredKnowledge.map((item) => getHistoryKnowledgeOptionLabel(item));
    }
    return knowledgePoints[subject].map((item) => item.title);
  }, [subject, structuredKnowledge]);
  const knowledgeMistakeCounts = useMemo(() => {
    const counts = Object.fromEntries(currentKnowledge.map((item) => [item.id, 0])) as Record<string, number>;
    const knownKnowledgeIds = new Set(currentKnowledge.map((item) => item.id));
    const normalizedTitleToId = new Map<string, string>();

    currentKnowledge.forEach((item) => {
      normalizedTitleToId.set(normalizeSelectorText(item.title), item.id);
    });

    if (subject === "历史" && structuredKnowledge) {
      structuredKnowledge.forEach((item) => {
        normalizedTitleToId.set(normalizeSelectorText(getHistoryKnowledgeOptionLabel(item)), item.id);
      });
    }

    safeMistakes.forEach((item) => {
      if (item.subject !== subject) return;

      (item.knowledge ?? []).forEach((label, knowledgeIndex) => {
        const byId = item.knowledgeIds?.[knowledgeIndex];
        const resolvedId =
          (typeof byId === "string" && knownKnowledgeIds.has(byId) ? byId : null) ??
          normalizedTitleToId.get(normalizeSelectorText(label));

        if (!resolvedId) return;
        counts[resolvedId] = (counts[resolvedId] ?? 0) + 1;
      });
    });

    return counts;
  }, [currentKnowledge, safeMistakes, structuredKnowledge, subject]);

  const subjectMistakes = useMemo(
    () => safeMistakes.filter((item) => item.subject === subject),
    [safeMistakes, subject]
  );
  const pendingCount = useMemo(() => subjectMistakes.filter((item) => !item.solved).length, [subjectMistakes]);
  const timeManagementSubjects = useMemo(
    () => ["全部", ...new Set([...FOCUS_EXAM_SUBJECTS, ...timeManagementRecords.map((item) => item.subjectLabel)])],
    [timeManagementRecords]
  );
  const filteredTimeManagementRecords = useMemo(() => {
    const sortedRecords = [...timeManagementRecords].sort(
      (a, b) => new Date(b.endedAt).getTime() - new Date(a.endedAt).getTime()
    );

    return timeSubjectFilter === "全部"
      ? sortedRecords
      : sortedRecords.filter((item) => item.subjectLabel === timeSubjectFilter);
  }, [timeManagementRecords, timeSubjectFilter]);
  const groupedTimeManagementRecords = useMemo(() => {
    const groups = new Map<string, TimeManagementRecord[]>();
    filteredTimeManagementRecords.forEach((record) => {
      const bucket = groups.get(record.subjectLabel);
      if (bucket) {
        bucket.push(record);
      } else {
        groups.set(record.subjectLabel, [record]);
      }
    });
    return Array.from(groups.entries());
  }, [filteredTimeManagementRecords]);
  const overtimeExamCount = useMemo(
    () => timeManagementRecords.filter((record) => record.usedSeconds > record.totalSeconds * 1.1).length,
    [timeManagementRecords]
  );
  const scoreSubjectOptions = useMemo(
    () =>
      Array.from(
        new Set([...SUBJECTS, ...FOCUS_EXAM_SUBJECTS, scoreSubjectFilter, ...scoreRecords.map((item) => item.subjectLabel)])
      ),
    [scoreRecords, scoreSubjectFilter]
  );
  const scoreRecordByTimeManagementId = useMemo(() => {
    const map = new Map<string, ScoreRecord>();
    scoreRecords.forEach((record) => {
      if (record.timeManagementRecordId) {
        map.set(record.timeManagementRecordId, record);
      }
    });
    return map;
  }, [scoreRecords]);
  const selectedSubjectScoreRecords = useMemo(
    () =>
      [...scoreRecords]
        .filter((record) => record.subjectLabel === scoreSubjectFilter)
        .sort((a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime()),
    [scoreRecords, scoreSubjectFilter]
  );
  const averageScoreRate = useMemo(() => {
    if (selectedSubjectScoreRecords.length === 0) return null;
    return (
      selectedSubjectScoreRecords.reduce((sum, item) => sum + item.score / item.fullScore, 0) /
      selectedSubjectScoreRecords.length
    );
  }, [selectedSubjectScoreRecords]);
  const bestScoreRate = useMemo(() => {
    if (selectedSubjectScoreRecords.length === 0) return null;
    return Math.max(...selectedSubjectScoreRecords.map((item) => item.score / item.fullScore));
  }, [selectedSubjectScoreRecords]);
  const selectedSubjectDiagnosticExamCount = useMemo(
    () =>
      timeManagementRecords.filter(
        (record) => record.subjectLabel === scoreSubjectFilter && scoreRecordByTimeManagementId.has(record.id)
      ).length,
    [scoreRecordByTimeManagementId, scoreSubjectFilter, timeManagementRecords]
  );
  const scoreEditorSummary = useMemo(() => {
    if (!scoreEditor) return null;

    let totalScore = 0;
    let totalFullScore = 0;
    let isValid = scoreEditor.blocks.length > 0;

    scoreEditor.blocks.forEach((block) => {
      const score = Number(block.score);
      const fullScore = Number(block.fullScore);
      if (
        block.label.trim().length === 0 ||
        !Number.isFinite(score) ||
        !Number.isFinite(fullScore) ||
        fullScore <= 0 ||
        score < 0 ||
        score > fullScore
      ) {
        isValid = false;
        return;
      }
      totalScore += score;
      totalFullScore += fullScore;
    });

    if (totalFullScore <= 0) {
      isValid = false;
    }

    return {
      totalScore,
      totalFullScore,
      rate: totalFullScore > 0 ? totalScore / totalFullScore : null,
      isValid,
    };
  }, [scoreEditor]);
  const allDataMounted = mistakesMounted && timeRecordsMounted && scoreRecordsMounted;

  /** 化学等：条目级详情沉浸式阅读，隐藏顶部分区与学科切换 */
  const knowledgeImmersiveDetail =
    usesItemIdKnowledgeDirectory(subject) &&
    activeTab === "knowledge" &&
    structuredKnowledge !== null &&
    selectedKnowledgeDirectoryKey !== null;

  const showKnowledgeSearch =
    activeTab === "knowledge" &&
    !knowledgeImmersiveDetail &&
    (subject === "英语" || structuredKnowledge === null || selectedKnowledgeDirectoryKey === null);

  const effectiveKnowledgeSearchQuery = showKnowledgeSearch
    ? normalizeKnowledgeSearchText(debouncedSearchQuery)
    : "";

  const filteredCurrentKnowledge = useMemo(
    () =>
      currentKnowledge.filter((item) =>
        matchesKnowledgeSearch(effectiveKnowledgeSearchQuery, [item.title, item.summary])
      ),
    [currentKnowledge, effectiveKnowledgeSearchQuery]
  );

  useEffect(() => {
    if (!jumpTarget) return;
    const { id } = jumpTarget;
    let done = false;
    const tryScroll = () => {
      if (done) return;
      const el = knowledgeRefs.current[id];
      if (!el) return;
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      setHighlightId(id);
      setJumpTarget(null);
      done = true;
      window.setTimeout(() => setHighlightId(null), 1800);
    };
    let raf1 = 0;
    let raf2 = 0;
    let fallbackTimer = 0;
    raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => {
        tryScroll();
        if (!done) {
          fallbackTimer = window.setTimeout(tryScroll, 260);
        }
      });
    });
    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
      window.clearTimeout(fallbackTimer);
    };
  }, [jumpTarget, activeTab, subject]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedSearchQuery(searchQuery.trim());
    }, 220);

    return () => window.clearTimeout(timeoutId);
  }, [searchQuery]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextKnowledge =
      knowledgeQuery.trim().length > 0
        ? appendUniqueSelectorValue(knowledge, knowledgeQuery, knowledgeOptions)
        : knowledge;

    if (!source.trim() || nextKnowledge.length === 0 || !reason.trim() || !skill.trim()) return;

    const resolvedKnowledge = nextKnowledge.map((item) =>
      resolveKnowledgeSelection(subject, structuredKnowledge, item)
    );

    setMistakes((prev) => {
      const previousMistakes = Array.isArray(prev) ? prev : [];
      return [
        {
          id: `mistake-${Date.now()}`,
          subject,
          source: source.trim(),
          knowledge: resolvedKnowledge.map((item) => item.label),
          knowledgeIds: resolvedKnowledge.map((item) => item.id),
          reason: reason.trim(),
          skill: skill.trim(),
          solved: false,
        },
        ...previousMistakes,
      ];
    });
    setSource("");
    setKnowledge([]);
    setKnowledgeQuery("");
    setReason("");
    setSkill("");
  };

  const openScoreEditor = (options: {
    subjectLabel: string;
    existingRecord?: ScoreRecord;
    timeManagementRecord?: TimeManagementRecord;
  }) => {
    const { subjectLabel, existingRecord, timeManagementRecord } = options;
    const baseBlocks = existingRecord
      ? buildEditableScoreBlocks(existingRecord.blocks)
      : timeManagementRecord
        ? buildEditableScoreBlocks(
            timeManagementRecord.blocks.map((block) => ({
              id: block.id,
              label: block.label,
            }))
          )
        : getDefaultScoreBlocks(subjectLabel);

    setScoreEditorError(null);
    setScoreEditor({
      recordId: existingRecord?.id ?? null,
      timeManagementRecordId: timeManagementRecord?.id ?? existingRecord?.timeManagementRecordId ?? null,
      subjectLabel,
      examName:
        existingRecord?.examName ??
        (timeManagementRecord ? `${subjectLabel} 模拟考` : `${subjectLabel} 成绩记录`),
      recordedAt: toDateInputValue(existingRecord?.recordedAt ?? timeManagementRecord?.endedAt),
      blocks: baseBlocks,
    });
    setScoreSubjectFilter(subjectLabel);
  };

  const closeScoreEditor = () => {
    setScoreEditor(null);
    setScoreEditorError(null);
  };

  const handleScoreBlockChange = (
    blockId: string,
    field: "score" | "fullScore",
    value: string
  ) => {
    setScoreEditor((current) => {
      if (!current) return current;
      return {
        ...current,
        blocks: current.blocks.map((block) => (block.id === blockId ? { ...block, [field]: value } : block)),
      };
    });
    if (scoreEditorError) {
      setScoreEditorError(null);
    }
  };

  const handleScoreSave = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!scoreEditor || !scoreEditorSummary) return;

    if (!scoreEditor.examName.trim()) {
      setScoreEditorError("请先填写考试名称。");
      return;
    }

    if (!scoreEditorSummary.isValid) {
      setScoreEditorError("请检查各板块满分和实际得分，确保满分大于 0，且得分不超过满分。");
      return;
    }

    const nextRecord: ScoreRecord = {
      id: scoreEditor.recordId ?? `score-${Date.now()}`,
      subjectLabel: scoreEditor.subjectLabel,
      examName: scoreEditor.examName.trim(),
      recordedAt: scoreEditor.recordedAt || toDateInputValue(),
      score: scoreEditorSummary.totalScore,
      fullScore: scoreEditorSummary.totalFullScore,
      blocks: scoreEditor.blocks.map((block) => ({
        id: block.id,
        label: block.label,
        score: Number(block.score),
        fullScore: Number(block.fullScore),
      })),
      timeManagementRecordId: scoreEditor.timeManagementRecordId,
    };

    setScoreRecords((prev) => {
      const filtered = prev.filter(
        (record) =>
          record.id !== nextRecord.id &&
          (!nextRecord.timeManagementRecordId || record.timeManagementRecordId !== nextRecord.timeManagementRecordId)
      );
      return [nextRecord, ...filtered];
    });
    closeScoreEditor();
  };

  const handleDeleteScoreRecord = (recordId: string) => {
    setScoreRecords((prev) => prev.filter((record) => record.id !== recordId));
    if (scoreEditor?.recordId === recordId) {
      closeScoreEditor();
    }
  };

  const handleRequestDeleteTimeManagementRecord = (record: TimeManagementRecord) => {
    setPendingDeleteTimeRecord(record);
  };

  const handleConfirmDeleteTimeManagementRecord = () => {
    if (!pendingDeleteTimeRecord) return;

    const recordId = pendingDeleteTimeRecord.id;
    setTimeManagementRecords((prev) => prev.filter((record) => record.id !== recordId));
    setScoreRecords((prev) => prev.filter((record) => record.timeManagementRecordId !== recordId));

    if (scoreEditor?.timeManagementRecordId === recordId) {
      closeScoreEditor();
    }

    setPendingDeleteTimeRecord(null);
  };

  const handleKnowledgeJump = (item: MistakeItem, knowledgeIndex: number) => {
    setSubject(item.subject);
    changeActiveTab("knowledge");

    const knowledgeLabel = item.knowledge?.[knowledgeIndex];
    if (!knowledgeLabel) return;

    const byId = item.knowledgeIds?.[knowledgeIndex] ?? null;
    if (item.subject === "英语") {
      const entry = (byId ? findEnglishKnowledgeLeafById(byId) : undefined) ?? findEnglishKnowledgeLeafByTitle(knowledgeLabel);
      if (!entry) return;

      setExpandedEnglishKnowledgeNodes((prev) => {
        const next = { ...prev };
        for (const id of entry.pathIds) {
          next[id] = true;
        }
        return next;
      });
      setJumpTarget({ id: entry.id });
      return;
    }

    if (item.subject === "语文") {
      const entry = (byId ? findChineseKnowledgeLeafById(byId) : undefined) ?? findChineseKnowledgeLeafByTitle(knowledgeLabel);
      if (!entry) return;

      setActiveChineseKnowledgeModuleId(entry.moduleId);
      setSelectedChineseKnowledgeCategoryId(entry.categoryId);
      setJumpTarget({ id: entry.id });
      return;
    }

    const list = getStructuredKnowledge(item.subject);
    const byTitle = findStructuredKnowledgeBySelection(item.subject, list, knowledgeLabel)?.id;
    const targetId = byId ?? byTitle;
    if (targetId && list) {
      const entry = list.find((e) => e.id === targetId);
      if (entry) {
        setSelectedKnowledgeDirectoryKey(
          usesItemIdKnowledgeDirectory(item.subject) ? targetId : entry.chapter
        );
      }
    }
    if (targetId) setJumpTarget({ id: targetId });
  };

  return (
    <section className="frosted-card flex min-h-0 flex-1 flex-col p-6 lg:p-8">
      <div
        className={`flex flex-col gap-4 pb-4 sm:flex-row sm:items-start sm:justify-between ${
          knowledgeImmersiveDetail ? "border-0 pb-3" : "border-b border-border/80"
        }`}
      >
        <div className="min-w-0">
          <h2 className="text-2xl font-semibold tracking-wide">学习功能栏</h2>
          {knowledgeImmersiveDetail ? (
            <p className="mt-1 text-sm text-muted-foreground">知识点 · {subject} · 阅读模式</p>
          ) : activeTab === "time-management" ? (
            <p className="mt-1 text-sm text-muted-foreground">
              已沉淀 {timeManagementRecords.length} 次模拟考 · 超时 {overtimeExamCount} 次
            </p>
          ) : activeTab === "score-stats" ? (
            <p className="mt-1 text-sm text-muted-foreground">
              已录入 {scoreRecords.length} 次成绩 · 当前查看 {scoreSubjectFilter}
            </p>
          ) : activeTab === "diagnostics" ? (
            <p className="mt-1 text-sm text-muted-foreground">
              已关联 {selectedSubjectDiagnosticExamCount} 次考试 · 当前诊断 {scoreSubjectFilter}
            </p>
          ) : (
            <p className="mt-1 text-sm text-muted-foreground">
              待巩固 {pendingCount} 题 · {subject} 共记录 {subjectMistakes.length} 题
            </p>
          )}
          {!knowledgeImmersiveDetail ? (
            <p
              className={`mt-2 max-w-2xl text-xs ${
                usingCloudRecords && syncError
                  ? "text-rose-600 dark:text-rose-300"
                  : "text-muted-foreground"
              }`}
            >
              {syncStatus}
            </p>
          ) : null}
        </div>
        {!knowledgeImmersiveDetail ? (
          <div className="flex shrink-0 flex-col items-stretch gap-3 sm:items-end">
            <AuthHeader />
            {onExpandedChange ? (
              <button
                type="button"
                onClick={() => onExpandedChange(!isExpanded)}
                aria-pressed={isExpanded}
                className="inline-flex shrink-0 items-center justify-center rounded-full border border-border/80 bg-card px-4 py-2 text-sm font-medium text-foreground transition hover:border-accent/55 hover:bg-accent-soft/25"
              >
                {isExpanded ? "恢复双栏布局" : "展开学习功能栏"}
              </button>
            ) : null}
          </div>
        ) : null}
      </div>

      {!knowledgeImmersiveDetail ? (
        <>
          <div className="mt-4 -mx-1 overflow-x-auto pb-1">
            <div className="flex min-w-max gap-2 px-1">
              {[
                { key: "mistakes", label: "错题本" },
                { key: "knowledge", label: "知识点" },
                { key: "time-management", label: "时间管理" },
                { key: "score-stats", label: "得分统计" },
                { key: "diagnostics", label: "学情诊断" },
              ].map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => changeActiveTab(tab.key as LearningTabKey)}
                  className={`shrink-0 whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                    activeTab === tab.key
                      ? "border-accent/60 bg-accent-soft text-foreground"
                      : "border-border bg-card text-muted-foreground"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {activeTab === "time-management" ? (
            <div className="mt-3 -mx-1 overflow-x-auto pb-1">
              <div className="flex min-w-max gap-2 px-1">
                {timeManagementSubjects.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setTimeSubjectFilter(item)}
                    className={`glow-tab shrink-0 whitespace-nowrap rounded-full border px-3 py-1 text-xs ${
                      timeSubjectFilter === item
                        ? "border-accent/70 bg-accent-soft text-foreground"
                        : "border-border text-muted-foreground"
                    }`}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>
          ) : activeTab === "score-stats" || activeTab === "diagnostics" ? (
            <div className="mt-3 -mx-1 overflow-x-auto pb-1">
              <div className="flex min-w-max gap-2 px-1">
                {scoreSubjectOptions.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setScoreSubjectFilter(item)}
                    className={`glow-tab shrink-0 whitespace-nowrap rounded-full border px-3 py-1 text-xs ${
                      scoreSubjectFilter === item
                        ? "border-accent/70 bg-accent-soft text-foreground"
                        : "border-border text-muted-foreground"
                    }`}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="mt-3 -mx-1 overflow-x-auto pb-1">
              <div className="flex min-w-max gap-2 px-1">
                {SUBJECTS.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => {
                      setSubject(item);
                      setSelectedKnowledgeDirectoryKey(null);
                    }}
                    className={`glow-tab shrink-0 whitespace-nowrap rounded-full border px-3 py-1 text-xs ${
                      subject === item ? "border-accent/70 bg-accent-soft text-foreground" : "border-border text-muted-foreground"
                    }`}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>
          )}

          {showKnowledgeSearch ? (
            <div className="mt-3 flex justify-end">
              <label className="flex w-full items-center gap-3 rounded-full border border-border/80 bg-card/85 px-4 py-3 shadow-sm sm:w-[320px]">
                <span aria-hidden className="text-sm text-muted-foreground">
                  🔍
                </span>
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="搜索章节名称或知识点内容"
                  aria-label="搜索知识点"
                  className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground/80"
                />
              </label>
            </div>
          ) : null}
        </>
      ) : null}

      <div
        className={
          knowledgeImmersiveDetail
            ? "flex min-h-0 flex-1 flex-col overflow-hidden"
            : "min-h-0 flex-1 overflow-y-auto pb-20"
        }
      >
      {!allDataMounted ? <p className="mt-6 text-sm text-muted-foreground">正在加载数据...</p> : null}

      {activeTab === "mistakes" ? (
        <div>
          <form onSubmit={handleSubmit} className="mt-5 grid gap-4 rounded-2xl border border-border/80 bg-card p-4">
            <div>
              <label className="text-sm text-muted-foreground">题目出处</label>
              <input
                value={source}
                onChange={(event) => setSource(event.target.value)}
                placeholder="例如：徐汇区二模数学第18题"
                className="mt-2 h-10 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none transition focus:border-accent/70"
              />
            </div>
            <CreatableMultiSelect
              label="知识点"
              value={knowledge}
              inputValue={knowledgeQuery}
              onInputChange={setKnowledgeQuery}
              onChange={setKnowledge}
              options={knowledgeOptions}
              placeholder={subject === "历史" ? "可输入册别或单元，例如：七上 / 第三单元" : "可搜索或自定义输入"}
              continuePlaceholder="继续搜索下一个知识点"
              emptyStateText="未找到匹配知识点，按回车可添加自定义项。"
              removeItemAriaLabel={(item) => `删除知识点 ${item}`}
            />
            <div>
              <label className="text-sm text-muted-foreground">错误原因</label>
              <textarea
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                className="mt-2 min-h-24 w-full rounded-xl border border-border bg-background p-3 text-sm outline-none transition focus:border-accent/70"
                placeholder="例如：忽略了定义域限制，导致范围判断错误"
              />
            </div>
            <div>
              <label className="text-sm text-muted-foreground">解题技巧</label>
              <input
                value={skill}
                onChange={(event) => setSkill(event.target.value)}
                placeholder="可直接输入本题的解题提醒"
                className="mt-2 h-10 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none transition focus:border-accent/70"
              />
            </div>
            <button className="h-10 rounded-xl bg-foreground text-background text-sm font-medium">保存错题</button>
          </form>

          <div className="mt-5 space-y-3">
            {subjectMistakes.length === 0 ? (
              <p className="text-sm text-muted-foreground">当前学科还没有记录，先添加第一题。</p>
            ) : (
              subjectMistakes.map((item) => (
                <article key={item.id} className="rounded-2xl border border-border/90 bg-card p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className="rounded-full border border-border px-2 py-1 text-[11px] text-muted-foreground">
                        {item.subject}
                      </span>
                      <span className="text-xs text-muted-foreground">{item.source}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setMistakes((prev) => {
                          const previousMistakes = Array.isArray(prev) ? prev : [];
                          return previousMistakes.map((x) =>
                            x.id === item.id ? { ...x, solved: !x.solved } : x
                          );
                        })
                      }
                      className="text-xs text-muted-foreground underline underline-offset-4"
                    >
                      {item.solved ? "标记未掌握" : "标记已掌握"}
                    </button>
                  </div>
                  <div className="mt-3">
                    <KnowledgeMarkdown markdown={item.reason} />
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {(item.knowledge ?? []).map((knowledgeLabel, knowledgeIndex) => (
                      <button
                        key={`${item.id}-knowledge-${knowledgeLabel}-${knowledgeIndex}`}
                        type="button"
                        onClick={() => handleKnowledgeJump(item, knowledgeIndex)}
                        className="rounded-full border border-accent/55 bg-accent-soft px-2.5 py-1 text-xs"
                      >
                        知识点：{knowledgeLabel}
                      </button>
                    ))}
                    <span className="rounded-full border border-accent/55 bg-accent-soft px-2.5 py-1 text-xs">
                      技巧：{item.skill}
                    </span>
                  </div>
                </article>
              ))
            )}
          </div>
        </div>
      ) : null}

      {activeTab === "knowledge" ? (
        <div
          className={
            knowledgeImmersiveDetail ? "flex min-h-0 flex-1 flex-col pt-2" : "space-y-3"
          }
        >
          {subject === "语文" ? (
            <ChineseKnowledgePanel
              activeModuleId={activeChineseKnowledgeModuleId}
              onActiveModuleIdChange={setActiveChineseKnowledgeModuleId}
              selectedCategoryId={selectedChineseKnowledgeCategoryId}
              onSelectedCategoryIdChange={setSelectedChineseKnowledgeCategoryId}
              highlightId={highlightId}
              knowledgeRefs={knowledgeRefs}
              knowledgeFrequencies={knowledgeMistakeCounts}
              searchQuery={showKnowledgeSearch ? debouncedSearchQuery : ""}
            />
          ) : subject === "英语" ? (
            <EnglishKnowledgePanel
              tree={ENGLISH_KNOWLEDGE_TREE}
              expandedNodeIds={expandedEnglishKnowledgeNodes}
              setExpandedNodeIds={setExpandedEnglishKnowledgeNodes}
              highlightId={highlightId}
              knowledgeRefs={knowledgeRefs}
              knowledgeFrequencies={knowledgeMistakeCounts}
              searchQuery={showKnowledgeSearch ? debouncedSearchQuery : ""}
            />
          ) : structuredKnowledge ? (
            <StructuredKnowledgePanel
              subject={subject}
              items={structuredKnowledge}
              selectedDirectoryKey={selectedKnowledgeDirectoryKey}
              onSelectDirectoryKey={setSelectedKnowledgeDirectoryKey}
              highlightId={highlightId}
              knowledgeRefs={knowledgeRefs}
              knowledgeFrequencies={knowledgeMistakeCounts}
              searchQuery={showKnowledgeSearch ? debouncedSearchQuery : ""}
            />
          ) : (
            <div className="mt-5 space-y-3">
              {filteredCurrentKnowledge.length > 0 ? (
                filteredCurrentKnowledge.map((item: KnowledgePoint) => {
                  const frequencyMeta = getKnowledgeFrequencyMeta(knowledgeMistakeCounts[item.id] ?? 0);

                  return (
                    <div
                      key={item.id}
                      id={item.id}
                      ref={(el) => {
                        knowledgeRefs.current[item.id] = el;
                      }}
                      className={`rounded-2xl border p-4 transition ${frequencyMeta.surfaceClassName} ${
                        highlightId === item.id
                          ? "border-accent shadow-[0_0_0_2px_rgba(111,149,255,0.28)]"
                          : "shadow-sm"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <h3 className="text-sm font-semibold">
                          <KnowledgeInlineMarkdown markdown={item.title} />
                        </h3>
                        {frequencyMeta.badgeLabel ? (
                          <span
                            className={`shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-medium ${frequencyMeta.badgeClassName}`}
                          >
                            {frequencyMeta.badgeLabel}
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-2 text-sm text-muted-foreground">{item.summary}</p>
                    </div>
                  );
                })
              ) : (
                <div className="rounded-2xl border border-dashed border-border/80 bg-card/70 px-5 py-8 text-center">
                  <p className="text-sm font-medium text-foreground">
                    没有找到相关的知识点，请换个关键词试试
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      ) : null}

      {activeTab === "time-management" ? (
        <div className="mt-5 space-y-5">
          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-2xl border border-border/80 bg-card p-4">
              <p className="text-xs tracking-[0.16em] uppercase text-muted-foreground">累计模拟考</p>
              <p className="mt-2 text-3xl font-semibold text-foreground">{timeManagementRecords.length}</p>
              <p className="mt-1 text-xs text-muted-foreground">已自动归档到时间管理</p>
            </div>
            <div className="rounded-2xl border border-border/80 bg-card p-4">
              <p className="text-xs tracking-[0.16em] uppercase text-muted-foreground">控时达标</p>
              <p className="mt-2 text-3xl font-semibold text-foreground">
                {timeManagementRecords.length === 0
                  ? "--"
                  : `${Math.round(
                      (timeManagementRecords.filter((record) => record.usedSeconds <= record.totalSeconds * 1.1).length /
                        timeManagementRecords.length) *
                        100
                    )}%`}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">总用时未超出理想值 10% 以上</p>
            </div>
            <div className="rounded-2xl border border-border/80 bg-card p-4">
              <p className="text-xs tracking-[0.16em] uppercase text-muted-foreground">当前筛选</p>
              <p className="mt-2 text-3xl font-semibold text-foreground">{timeSubjectFilter}</p>
              <p className="mt-1 text-xs text-muted-foreground">{filteredTimeManagementRecords.length} 条记录</p>
            </div>
          </div>

          {filteredTimeManagementRecords.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border/80 bg-card/70 px-5 py-8 text-center">
              <p className="text-sm font-medium text-foreground">暂无历史记录，去进行一次模拟考吧</p>
              <p className="mt-2 text-sm text-muted-foreground">
                从左侧点击“开启模拟考”并完成一次考试后，这里会自动按学科沉淀时间数据。
              </p>
            </div>
          ) : (
            groupedTimeManagementRecords.map(([subjectLabel, records]) => (
              <section key={subjectLabel} className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-foreground">{subjectLabel}</h3>
                  <span className="rounded-full border border-border/80 bg-card px-3 py-1 text-xs text-muted-foreground">
                    {records.length} 次记录
                  </span>
                </div>

                {records.map((record) => {
                  const isOvertime = record.usedSeconds > record.totalSeconds * 1.1;
                  const scoreRecord = scoreRecordByTimeManagementId.get(record.id);
                  const overallRate = getRate(scoreRecord?.score ?? NaN, scoreRecord?.fullScore ?? NaN);
                  const overallRateStyle = getScoreRateStyle(overallRate);

                  return (
                    <article key={record.id} className="group relative rounded-2xl border border-border/90 bg-card p-5">
                      <button
                        type="button"
                        onClick={() => handleRequestDeleteTimeManagementRecord(record)}
                        aria-label={`删除 ${record.subjectLabel} ${formatRecordDate(record.endedAt)} 的考试记录`}
                        title="删除记录"
                        className="absolute right-4 top-4 inline-flex h-9 w-9 items-center justify-center rounded-full border border-transparent bg-background/35 text-muted-foreground/70 opacity-55 transition hover:border-red-500/30 hover:bg-red-500/10 hover:text-red-700 hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/35 dark:hover:text-red-300"
                      >
                        <TrashIcon />
                      </button>
                      <div className="flex flex-col gap-3 pr-10 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <p className="text-sm font-semibold text-foreground">{formatRecordDate(record.endedAt)}</p>
                          <p className="mt-1 text-sm text-muted-foreground">
                            理想 {formatMinutesFromSeconds(record.totalSeconds)} 分钟 · 实际{" "}
                            {formatMinutesFromSeconds(record.usedSeconds)} 分钟
                          </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                          <span
                            className={`rounded-full border px-3 py-1.5 text-xs font-medium ${
                              isOvertime
                                ? "border-red-500/35 bg-red-500/10 text-red-700 dark:text-red-300"
                                : "border-emerald-500/35 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                            }`}
                          >
                            {isOvertime ? "总时长超时" : "总时长达标"}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              openScoreEditor({
                                subjectLabel: record.subjectLabel,
                                existingRecord: scoreRecord,
                                timeManagementRecord: record,
                              })
                            }
                            className="rounded-full border border-accent/45 bg-accent-soft/30 px-3 py-1.5 text-xs font-medium text-foreground transition hover:bg-accent-soft/45"
                          >
                            录入/编辑成绩
                          </button>
                        </div>
                      </div>

                      <div className="mt-4 rounded-3xl border border-border/80 bg-background/45 p-4">
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
                          <div className={`rounded-3xl border px-4 py-4 lg:w-56 ${overallRateStyle.softClassName}`}>
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="text-xs tracking-[0.16em] uppercase text-muted-foreground">整体得分率</p>
                                <p className="mt-2 text-3xl font-semibold text-foreground">{formatPercentage(overallRate)}</p>
                              </div>
                              <span className={`rounded-full border px-2.5 py-1 text-[11px] font-medium ${overallRateStyle.badgeClassName}`}>
                                {overallRateStyle.label}
                              </span>
                            </div>
                            <p className="mt-2 text-xs text-muted-foreground">
                              {scoreRecord ? `${scoreRecord.score} / ${scoreRecord.fullScore}` : "尚未录入成绩"}
                            </p>
                            <div className="mt-3 h-2.5 rounded-full bg-border/60">
                              <div
                                className={`h-2.5 rounded-full transition-all ${overallRateStyle.fillClassName}`}
                                style={{ width: getRateBarWidth(overallRate) }}
                              />
                            </div>
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-3">
                              <p className="text-xs tracking-[0.16em] uppercase text-muted-foreground">板块得分率</p>
                              {scoreRecord?.timeManagementRecordId ? (
                                <span className="rounded-full border border-border/80 bg-card px-2.5 py-1 text-[11px] text-muted-foreground">
                                  已关联本次模拟考
                                </span>
                              ) : null}
                            </div>
                            {scoreRecord ? (
                              <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                                {record.blocks.map((block) => {
                                  const scoreBlock = findScoreBlock(scoreRecord, block);
                                  const blockRate = getRate(scoreBlock?.score ?? NaN, scoreBlock?.fullScore ?? NaN);
                                  const blockRateStyle = getScoreRateStyle(blockRate);
                                  return (
                                    <div
                                      key={`${record.id}-${block.id}-score-rate`}
                                      className={`rounded-2xl border px-3 py-3 ${blockRateStyle.softClassName}`}
                                    >
                                      <div className="flex items-start justify-between gap-3">
                                        <p className="text-sm font-semibold text-foreground">{block.label}</p>
                                        <span
                                          className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${blockRateStyle.badgeClassName}`}
                                        >
                                          {blockRateStyle.label}
                                        </span>
                                      </div>
                                      <div className="mt-3 flex items-end justify-between gap-3">
                                        <p className="text-xl font-semibold text-foreground">{formatPercentage(blockRate)}</p>
                                        <p className="text-[11px] text-muted-foreground">
                                          {scoreBlock ? `${scoreBlock.score} / ${scoreBlock.fullScore}` : "未录入"}
                                        </p>
                                      </div>
                                      <div className="mt-2 h-2 rounded-full bg-border/60">
                                        <div
                                          className={`h-2 rounded-full transition-all ${blockRateStyle.fillClassName}`}
                                          style={{ width: getRateBarWidth(blockRate) }}
                                        />
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            ) : (
                              <p className="mt-3 rounded-2xl border border-dashed border-border/80 bg-card/60 px-4 py-4 text-sm text-muted-foreground">
                                点击“录入/编辑成绩”，会自动带出本次计时的板块并实时计算得分率。
                              </p>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 space-y-3">
                        {record.blocks.map((block) => {
                          const blockOvertime = block.actualSeconds > block.idealMinutes * 60 * 1.1;
                          const blockIdealWidth = Math.min(100, (block.idealMinutes / Math.max(1, record.totalSeconds / 60)) * 100);
                          const blockActualWidth = Math.min(100, ((block.actualSeconds / 60) / Math.max(1, record.totalSeconds / 60)) * 100);
                          const scoreBlock = scoreRecord ? findScoreBlock(scoreRecord, block) : undefined;
                          const scoreBlockRate = getRate(scoreBlock?.score ?? NaN, scoreBlock?.fullScore ?? NaN);

                          return (
                            <div key={`${record.id}-${block.id}`} className="rounded-2xl border border-border/75 bg-background/55 p-4">
                              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                <div>
                                  <p className="font-medium text-foreground">{block.label}</p>
                                  <p className="text-xs text-muted-foreground">
                                    理想 {block.idealMinutes} 分钟 · 实际 {formatMinutesFromSeconds(block.actualSeconds)} 分钟
                                  </p>
                                </div>
                                <span
                                  className={`rounded-full border px-2.5 py-1 text-xs ${
                                    blockOvertime
                                      ? "border-red-500/35 bg-red-500/10 text-red-700 dark:text-red-300"
                                      : "border-emerald-500/35 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                                  }`}
                                >
                                  {blockOvertime ? "需提速" : "节奏稳定"}
                                </span>
                              </div>

                              {scoreBlock ? (
                                <div className="mt-3 flex items-center justify-between rounded-xl border border-accent/35 bg-accent-soft/20 px-3 py-2 text-xs">
                                  <span className="text-muted-foreground">本板块得分率</span>
                                  <span className="font-semibold text-foreground">
                                    {formatPercentage(scoreBlockRate)} · {scoreBlock.score} / {scoreBlock.fullScore}
                                  </span>
                                </div>
                              ) : null}

                              <div className="mt-3 space-y-2">
                                <div>
                                  <div className="mb-1 flex items-center justify-between text-[11px] text-muted-foreground">
                                    <span>理想用时</span>
                                    <span>{block.idealMinutes} 分钟</span>
                                  </div>
                                  <div className="h-2 rounded-full bg-border/60">
                                    <div className="h-2 rounded-full bg-accent/70" style={{ width: `${blockIdealWidth}%` }} />
                                  </div>
                                </div>
                                <div>
                                  <div className="mb-1 flex items-center justify-between text-[11px] text-muted-foreground">
                                    <span>实际用时</span>
                                    <span>{formatMinutesFromSeconds(block.actualSeconds)} 分钟</span>
                                  </div>
                                  <div className="h-2 rounded-full bg-border/60">
                                    <div
                                      className={`h-2 rounded-full ${blockOvertime ? "bg-red-500/80" : "bg-emerald-500/80"}`}
                                      style={{ width: `${blockActualWidth}%` }}
                                    />
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </article>
                  );
                })}
              </section>
            ))
          )}
        </div>
      ) : null}

      {activeTab === "score-stats" ? (
        <div className="mt-5 space-y-5">
          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-2xl border border-border/80 bg-card p-4">
              <p className="text-xs tracking-[0.16em] uppercase text-muted-foreground">{scoreSubjectFilter} 平均得分率</p>
              <p className="mt-2 text-3xl font-semibold text-foreground">
                {formatPercentage(averageScoreRate)}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">基于当前学科已录入成绩</p>
            </div>
            <div className="rounded-2xl border border-border/80 bg-card p-4">
              <p className="text-xs tracking-[0.16em] uppercase text-muted-foreground">{scoreSubjectFilter} 最佳得分率</p>
              <p className="mt-2 text-3xl font-semibold text-foreground">
                {formatPercentage(bestScoreRate)}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">当前学科历史最高表现</p>
            </div>
            <div className="rounded-2xl border border-border/80 bg-card p-4">
              <p className="text-xs tracking-[0.16em] uppercase text-muted-foreground">{scoreSubjectFilter} 录入次数</p>
              <p className="mt-2 text-3xl font-semibold text-foreground">{selectedSubjectScoreRecords.length}</p>
              <p className="mt-1 text-xs text-muted-foreground">可从左侧“成绩录入”快速进入</p>
            </div>
          </div>

          <div className="rounded-2xl border border-border/80 bg-card p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-lg font-semibold text-foreground">成绩录入模板</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  使用和模拟考历史卡片一致的板块式录入，支持实时得分率计算，以及后续编辑、删除。
                </p>
              </div>
              <button
                type="button"
                onClick={() => openScoreEditor({ subjectLabel: scoreSubjectFilter })}
                className="rounded-xl border border-accent/45 bg-accent-soft/30 px-4 py-2.5 text-sm font-medium text-foreground transition hover:bg-accent-soft/45"
              >
                新增成绩记录
              </button>
            </div>
          </div>

          <div className="space-y-3">
            {selectedSubjectScoreRecords.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border/80 bg-card/70 px-5 py-8 text-center">
                <p className="text-sm font-medium text-foreground">当前学科还没有成绩记录。</p>
                <p className="mt-2 text-sm text-muted-foreground">点击上方按钮，即可按板块录入并实时查看得分率。</p>
              </div>
            ) : (
              selectedSubjectScoreRecords.map((record) => {
                const recordRate = getRate(record.score, record.fullScore);
                const recordRateStyle = getScoreRateStyle(recordRate);
                return (
                  <article key={record.id} className="rounded-3xl border border-border/90 bg-card p-5">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-lg font-semibold text-foreground">{record.examName}</p>
                          <span className={`rounded-full border px-2.5 py-1 text-[11px] font-medium ${recordRateStyle.badgeClassName}`}>
                            {recordRateStyle.label}
                          </span>
                          {record.timeManagementRecordId ? (
                            <span className="rounded-full border border-border/80 bg-background px-2.5 py-1 text-[11px] text-muted-foreground">
                              关联模拟考
                            </span>
                          ) : null}
                        </div>
                        <p className="mt-1 text-sm text-muted-foreground">{formatScoreRecordDate(record.recordedAt)}</p>
                        <div className="mt-4 rounded-3xl border border-border/80 bg-background/50 p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-xs tracking-[0.16em] uppercase text-muted-foreground">整体得分率</p>
                              <p className="mt-2 text-3xl font-semibold text-foreground">{formatPercentage(recordRate)}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-lg font-semibold text-foreground">{record.score} / {record.fullScore}</p>
                              <p className="text-xs text-muted-foreground">总分汇总</p>
                            </div>
                          </div>
                          <div className="mt-3 h-2.5 rounded-full bg-border/60">
                            <div
                              className={`h-2.5 rounded-full transition-all ${recordRateStyle.fillClassName}`}
                              style={{ width: getRateBarWidth(recordRate) }}
                            />
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-2 lg:flex-col">
                        <button
                          type="button"
                          onClick={() =>
                            openScoreEditor({
                              subjectLabel: record.subjectLabel,
                              existingRecord: record,
                            })
                          }
                          className="rounded-xl border border-border/80 bg-background px-3 py-2 text-xs font-medium text-foreground transition hover:border-accent/45 hover:bg-accent-soft/20"
                        >
                          编辑
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteScoreRecord(record.id)}
                          className="rounded-xl border border-border/80 bg-background px-3 py-2 text-xs font-medium text-muted-foreground transition hover:border-red-500/35 hover:bg-red-500/10 hover:text-red-700 dark:hover:text-red-300"
                        >
                          删除
                        </button>
                      </div>
                    </div>

                    <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                      {record.blocks.map((block) => {
                        const blockRate = getRate(block.score, block.fullScore);
                        const blockRateStyle = getScoreRateStyle(blockRate);
                        return (
                          <div
                            key={`${record.id}-${block.id}`}
                            className={`rounded-2xl border px-3 py-3 ${blockRateStyle.softClassName}`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <p className="text-sm font-semibold text-foreground">{block.label}</p>
                              <span
                                className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${blockRateStyle.badgeClassName}`}
                              >
                                {blockRateStyle.label}
                              </span>
                            </div>
                            <div className="mt-3 flex items-end justify-between gap-3">
                              <p className="text-xl font-semibold text-foreground">{formatPercentage(blockRate)}</p>
                              <p className="text-[11px] text-muted-foreground">
                                {block.score} / {block.fullScore}
                              </p>
                            </div>
                            <div className="mt-2 h-2 rounded-full bg-border/60">
                              <div
                                className={`h-2 rounded-full transition-all ${blockRateStyle.fillClassName}`}
                                style={{ width: getRateBarWidth(blockRate) }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </article>
                );
              })
            )}
          </div>
        </div>
      ) : null}

      {activeTab === "diagnostics" ? (
        <LearningDiagnosticsDashboard
          scoreRecords={scoreRecords}
          subjectLabel={scoreSubjectFilter}
          timeManagementRecords={timeManagementRecords}
        />
      ) : null}

      {pendingDeleteTimeRecord ? (
        <div
          className="fixed inset-0 z-[80] overflow-y-auto bg-background/75 p-4 backdrop-blur-sm"
          onClick={() => setPendingDeleteTimeRecord(null)}
        >
          <div className="mx-auto flex min-h-full w-full max-w-2xl items-center justify-center">
            <div
              className="frosted-card my-4 w-full max-w-md overflow-hidden"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="border-b border-border/80 px-6 py-6">
                <div className="flex items-start gap-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-red-500/25 bg-red-500/10 text-red-700 dark:text-red-300">
                    <TrashIcon />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm tracking-[0.18em] uppercase text-muted-foreground">删除考试记录</p>
                    <h3 className="mt-2 text-xl font-semibold text-foreground">确定要删除这条考试记录吗？</h3>
                    <p className="mt-2 text-sm text-muted-foreground">
                      删除后相关统计数据将同步更新且不可恢复。
                    </p>
                    <p className="mt-3 text-xs text-muted-foreground">
                      {pendingDeleteTimeRecord.subjectLabel} · {formatRecordDate(pendingDeleteTimeRecord.endedAt)}
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-end gap-2 px-6 py-4">
                <button
                  type="button"
                  onClick={() => setPendingDeleteTimeRecord(null)}
                  className="rounded-xl border border-border/80 bg-card px-4 py-2 text-sm font-medium text-muted-foreground transition hover:border-accent/45 hover:text-foreground"
                >
                  取消
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDeleteTimeManagementRecord}
                  className="rounded-xl border border-red-500/35 bg-red-500/10 px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-500/15 dark:text-red-300"
                >
                  确认删除
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {scoreEditor ? (
        <div
          className="fixed inset-0 z-[70] overflow-y-auto bg-background/75 p-4 backdrop-blur-sm"
          onClick={closeScoreEditor}
        >
          <div className="mx-auto flex min-h-full w-full max-w-4xl items-center justify-center">
            <div
              className="frosted-card my-4 flex max-h-[calc(100vh-2rem)] w-full max-w-3xl flex-col overflow-hidden"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="border-b border-border/80 px-6 py-6 lg:px-8">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-sm tracking-[0.18em] uppercase text-muted-foreground">成绩录入</p>
                    <h3 className="mt-2 text-2xl font-semibold text-foreground">
                      {scoreEditor.recordId ? "编辑成绩" : "录入成绩"}
                    </h3>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {scoreEditor.subjectLabel} · 按板块录入后会自动汇总整体得分率。
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={closeScoreEditor}
                    className="rounded-xl border border-border/80 bg-card px-4 py-2 text-sm text-muted-foreground transition hover:border-accent/45 hover:text-foreground"
                  >
                    关闭
                  </button>
                </div>
              </div>

              <form onSubmit={handleScoreSave} className="flex min-h-0 flex-1 flex-col">
                <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-6 lg:px-8 lg:pb-8">
                  <div className="sticky top-0 z-10 -mx-6 border-b border-border/70 bg-background/92 px-6 py-5 backdrop-blur-sm lg:-mx-8 lg:px-8">
                    {(() => {
                      const summaryRate = scoreEditorSummary?.rate ?? null;
                      const summaryRateStyle = getScoreRateStyle(summaryRate);
                      return (
                        <div className={`rounded-2xl border p-3 shadow-sm ${summaryRateStyle.softClassName}`}>
                          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_170px_220px] lg:items-center">
                            <div className="min-w-0">
                              <label className="text-[11px] tracking-[0.14em] uppercase text-muted-foreground">考试名称</label>
                              <input
                                value={scoreEditor.examName}
                                onChange={(event) => {
                                  setScoreEditor((current) =>
                                    current
                                      ? {
                                          ...current,
                                          examName: event.target.value,
                                        }
                                      : current
                                  );
                                  if (scoreEditorError) {
                                    setScoreEditorError(null);
                                  }
                                }}
                                placeholder={`例如：${scoreEditor.subjectLabel} 二模`}
                                className="mt-1.5 h-10 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none transition focus:border-accent/70"
                              />
                            </div>

                            <div>
                              <label className="text-[11px] tracking-[0.14em] uppercase text-muted-foreground">录入日期</label>
                              <input
                                type="date"
                                value={scoreEditor.recordedAt}
                                onChange={(event) =>
                                  setScoreEditor((current) =>
                                    current
                                      ? {
                                          ...current,
                                          recordedAt: event.target.value,
                                        }
                                      : current
                                  )
                                }
                                className="mt-1.5 h-10 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none transition focus:border-accent/70"
                              />
                            </div>

                            <div className="rounded-2xl border border-border/70 bg-background/65 px-3 py-3">
                              <div className="flex items-center justify-between gap-3">
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2">
                                    <p className="text-[11px] tracking-[0.14em] uppercase text-muted-foreground">整体汇总</p>
                                    <span
                                      className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${summaryRateStyle.badgeClassName}`}
                                    >
                                      {summaryRateStyle.label}
                                    </span>
                                  </div>
                                  <p className="mt-1 text-lg font-semibold text-foreground">
                                    {scoreEditorSummary ? `${scoreEditorSummary.totalScore} / ${scoreEditorSummary.totalFullScore}` : "--"}
                                  </p>
                                </div>
                                <p className="shrink-0 text-2xl font-semibold text-foreground">
                                  {scoreEditorSummary ? formatPercentage(scoreEditorSummary.rate) : "--"}
                                </p>
                              </div>
                              <div className="mt-2 h-2 rounded-full bg-border/60">
                                <div
                                  className={`h-2 rounded-full transition-all ${summaryRateStyle.fillClassName}`}
                                  style={{ width: getRateBarWidth(summaryRate) }}
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                  </div>

                  <div className="space-y-5 pt-5">
                    <div className="space-y-3">
                      {scoreEditor.blocks.map((block) => {
                        const blockScore = Number(block.score);
                        const blockFullScore = Number(block.fullScore);
                        const blockRate = getRate(blockScore, blockFullScore);
                        const blockRateStyle = getScoreRateStyle(blockRate);
                        return (
                          <div
                            key={block.id}
                            className={`rounded-3xl border p-4 ${blockRateStyle.softClassName}`}
                          >
                            <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
                              <div className="min-w-0 flex-1">
                                <div className="flex items-start justify-between gap-3">
                                  <div>
                                    <p className="text-base font-semibold text-foreground">{block.label}</p>
                                    <p className="mt-1 text-xs text-muted-foreground">按本次考试板块单独录入满分和得分</p>
                                  </div>
                                  <span
                                    className={`shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-medium ${blockRateStyle.badgeClassName}`}
                                  >
                                    {blockRateStyle.label}
                                  </span>
                                </div>

                                <div className="mt-4 rounded-2xl border border-border/70 bg-background/60 p-4">
                                  <div className="flex items-end justify-between gap-3">
                                    <div>
                                      <p className="text-xs tracking-[0.16em] uppercase text-muted-foreground">当前得分率</p>
                                      <p className="mt-2 text-3xl font-semibold text-foreground">{formatPercentage(blockRate)}</p>
                                    </div>
                                    <div className="text-right">
                                      <p className="text-lg font-semibold text-foreground">
                                        {block.score.trim() || "--"} / {block.fullScore.trim() || "--"}
                                      </p>
                                      <p className="text-xs text-muted-foreground">当前录入</p>
                                    </div>
                                  </div>
                                  <div className="mt-3 h-2.5 rounded-full bg-border/60">
                                    <div
                                      className={`h-2.5 rounded-full transition-all ${blockRateStyle.fillClassName}`}
                                      style={{ width: getRateBarWidth(blockRate) }}
                                    />
                                  </div>
                                </div>
                              </div>

                              <div className="grid gap-3 sm:grid-cols-2 lg:w-[320px] lg:grid-cols-1 xl:w-[360px] xl:grid-cols-2">
                                <div className="rounded-2xl border border-border/70 bg-background/70 p-3">
                                  <label className="text-xs text-muted-foreground">板块满分</label>
                                  <input
                                    type="number"
                                    min={1}
                                    step={1}
                                    value={block.fullScore}
                                    onChange={(event) => handleScoreBlockChange(block.id, "fullScore", event.target.value)}
                                    className="mt-2 h-11 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none transition focus:border-accent/70"
                                  />
                                </div>
                                <div className="rounded-2xl border border-border/70 bg-background/70 p-3">
                                  <label className="text-xs text-muted-foreground">实际得分</label>
                                  <input
                                    type="number"
                                    min={0}
                                    step={1}
                                    value={block.score}
                                    onChange={(event) => handleScoreBlockChange(block.id, "score", event.target.value)}
                                    className="mt-2 h-11 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none transition focus:border-accent/70"
                                  />
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {scoreEditorError ? (
                      <div className="rounded-xl border border-red-500/35 bg-red-500/10 px-4 py-3 text-sm text-red-700 dark:text-red-300">
                        {scoreEditorError}
                      </div>
                    ) : null}
                  </div>
                </div>

                <div className="border-t border-border/80 bg-background/88 px-6 py-3 backdrop-blur-sm lg:px-8">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      {scoreEditor.recordId ? (
                        <button
                          type="button"
                          onClick={() => handleDeleteScoreRecord(scoreEditor.recordId!)}
                          className="rounded-lg border border-border/80 bg-background px-3 py-2 text-xs font-medium text-muted-foreground transition hover:border-red-500/35 hover:bg-red-500/10 hover:text-red-700 dark:hover:text-red-300"
                        >
                          删除
                        </button>
                      ) : (
                        <span className="text-xs text-muted-foreground">录入后可继续编辑或删除</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={closeScoreEditor}
                        className="rounded-lg border border-border/80 bg-card px-3 py-2 text-xs font-medium text-muted-foreground transition hover:border-accent/45 hover:text-foreground"
                      >
                        取消
                      </button>
                      <button
                        type="submit"
                        className="rounded-lg border border-accent/60 bg-accent-soft/45 px-4 py-2 text-xs font-semibold text-foreground transition hover:bg-accent-soft/60"
                      >
                        保存成绩
                      </button>
                    </div>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      ) : null}
      </div>
    </section>
  );
}
