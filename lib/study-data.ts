import { SUBJECTS, Subject } from "@/lib/mockData";

export type LearningTabKey =
  | "mistakes"
  | "knowledge"
  | "time-management"
  | "score-stats"
  | "diagnostics";

export type FocusSessionEndReason = "completed" | "timeout" | "manual";

export type TimeManagementBlockRecord = {
  id: string;
  label: string;
  idealMinutes: number;
  actualSeconds: number;
};

export type TimeManagementRecord = {
  id: string;
  subjectLabel: string;
  examName: string;
  totalSeconds: number;
  usedSeconds: number;
  endedAt: string;
  endedBy: FocusSessionEndReason;
  blocks: TimeManagementBlockRecord[];
};

export function getDefaultTimeManagementExamName(subjectLabel: string): string {
  return `${subjectLabel} 模拟考`;
}

export function resolveTimeManagementExamName(
  record: TimeManagementRecord,
  scoreRecord?: ScoreRecord | null
): string {
  const trimmed = record.examName?.trim();
  if (trimmed) return trimmed;

  const scoreName = scoreRecord?.examName?.trim();
  if (scoreName) return scoreName;

  return getDefaultTimeManagementExamName(record.subjectLabel);
}

export type ScoreBlockRecord = {
  id: string;
  label: string;
  score: number;
  fullScore: number;
};

export type ScoreRecord = {
  id: string;
  subjectLabel: string;
  examName: string;
  score: number;
  fullScore: number;
  recordedAt: string;
  blocks: ScoreBlockRecord[];
  timeManagementRecordId: string | null;
};

export const FOCUS_EXAM_SUBJECTS = ["语文", "数学", "英语", "综合测试", "历史", "道法"] as const;

export const TIME_MANAGEMENT_STORAGE_KEY = "zhongkao-time-management-records";
export const SCORE_STATS_STORAGE_KEY = "zhongkao-score-stats";

function isSubject(value: unknown): value is Subject {
  return typeof value === "string" && SUBJECTS.includes(value as Subject);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

export function parseStoredTimeManagementRecords(raw: string): TimeManagementRecord[] {
  const parsed = JSON.parse(raw) as unknown;
  if (!Array.isArray(parsed)) return [];

  return parsed.flatMap((item, index) => {
    if (!item || typeof item !== "object") return [];

    const record = item as Record<string, unknown>;
    const subjectLabel = typeof record.subjectLabel === "string" ? record.subjectLabel.trim() : "";
    if (!subjectLabel) return [];

    const examName =
      typeof record.examName === "string" && record.examName.trim().length > 0
        ? record.examName.trim()
        : getDefaultTimeManagementExamName(subjectLabel);

    const rawBlocks = Array.isArray(record.blocks) ? record.blocks : [];
    const blocks = rawBlocks.flatMap((block, blockIndex) => {
      if (!block || typeof block !== "object") return [];

      const current = block as Record<string, unknown>;
      const label = typeof current.label === "string" ? current.label.trim() : "";
      const idealMinutes = Number(current.idealMinutes);
      const actualSeconds = Number(current.actualSeconds);
      if (!label || !Number.isFinite(idealMinutes) || idealMinutes < 0 || !Number.isFinite(actualSeconds) || actualSeconds < 0) {
        return [];
      }

      return [
        {
          id:
            typeof current.id === "string" && current.id.trim().length > 0
              ? current.id
              : `time-block-${index}-${blockIndex}`,
          label,
          idealMinutes,
          actualSeconds,
        },
      ];
    });

    const totalSeconds = Number(record.totalSeconds);
    const usedSeconds = Number(record.usedSeconds);
    const endedAt = typeof record.endedAt === "string" ? record.endedAt : "";
    const endedBy = record.endedBy;

    if (
      !Number.isFinite(totalSeconds) ||
      totalSeconds < 0 ||
      !Number.isFinite(usedSeconds) ||
      usedSeconds < 0 ||
      !endedAt ||
      (endedBy !== "completed" && endedBy !== "timeout" && endedBy !== "manual")
    ) {
      return [];
    }

    return [
      {
        id:
          typeof record.id === "string" && record.id.trim().length > 0
            ? record.id
            : `time-record-${index}`,
        subjectLabel,
        examName,
        totalSeconds,
        usedSeconds,
        endedAt,
        endedBy,
        blocks,
      },
    ];
  });
}

export function parseStoredScoreRecords(raw: string): ScoreRecord[] {
  const parsed = JSON.parse(raw) as unknown;
  if (!Array.isArray(parsed)) return [];

  return parsed.flatMap((item, index) => {
    if (!item || typeof item !== "object") return [];

    const record = item as Record<string, unknown>;
    const subjectLabel = isNonEmptyString(record.subjectLabel)
      ? record.subjectLabel.trim()
      : isSubject(record.subject)
        ? record.subject
        : "";
    if (!subjectLabel) return [];

    const examName = typeof record.examName === "string" ? record.examName.trim() : "";
    const recordedAt = typeof record.recordedAt === "string" ? record.recordedAt : "";
    const timeManagementRecordId = isNonEmptyString(record.timeManagementRecordId)
      ? record.timeManagementRecordId.trim()
      : null;
    const rawBlocks = Array.isArray(record.blocks) ? record.blocks : [];
    const parsedBlocks = rawBlocks.flatMap((block, blockIndex) => {
      if (!block || typeof block !== "object") return [];

      const current = block as Record<string, unknown>;
      const label = typeof current.label === "string" ? current.label.trim() : "";
      const score = Number(current.score);
      const fullScore = Number(current.fullScore);
      if (!label || !Number.isFinite(score) || !Number.isFinite(fullScore) || fullScore <= 0 || score < 0 || score > fullScore) {
        return [];
      }

      return [
        {
          id:
            typeof current.id === "string" && current.id.trim().length > 0
              ? current.id
              : `score-block-${index}-${blockIndex}`,
          label,
          score,
          fullScore,
        },
      ];
    });

    const normalizedBlocks =
      parsedBlocks.length > 0
        ? parsedBlocks
        : (() => {
            const score = Number(record.score);
            const fullScore = Number(record.fullScore);
            if (!Number.isFinite(score) || !Number.isFinite(fullScore) || fullScore <= 0 || score < 0 || score > fullScore) {
              return [];
            }
            return [
              {
                id: `score-block-${index}-legacy`,
                label: "整卷",
                score,
                fullScore,
              },
            ];
          })();

    if (!examName || normalizedBlocks.length === 0 || !recordedAt) {
      return [];
    }

    const score = normalizedBlocks.reduce((sum, block) => sum + block.score, 0);
    const fullScore = normalizedBlocks.reduce((sum, block) => sum + block.fullScore, 0);

    return [
      {
        id:
          typeof record.id === "string" && record.id.trim().length > 0
            ? record.id
            : `score-record-${index}`,
        subjectLabel,
        examName,
        score,
        fullScore,
        recordedAt,
        blocks: normalizedBlocks,
        timeManagementRecordId,
      },
    ];
  });
}
