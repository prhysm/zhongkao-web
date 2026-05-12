"use client";

import { ChangeEvent, useEffect, useMemo, useState } from "react";
import { useLocalStorage } from "@/lib/useLocalStorage";
import {
  cloneFocusExamBlocks,
  DEFAULT_TEMPLATE,
  EXAM_TEMPLATES,
  FocusExamBlock,
} from "@/lib/focus-exams";
import {
  FocusSessionEndReason,
  LearningTabKey,
  TIME_MANAGEMENT_STORAGE_KEY,
  TimeManagementRecord,
  parseStoredTimeManagementRecords,
} from "@/lib/study-data";

const DEFAULT_TARGET = "2026-06-20T09:00";
const STORAGE_KEY = "zhongkao-countdown-target";

type TimeLeft = {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  finished: boolean;
};

type RunningExam = {
  subjectId: string;
  subjectLabel: string;
  blocks: FocusExamBlock[];
  totalSeconds: number;
  startedAt: number;
  currentBlockIndex: number;
  currentBlockStartedAt: number;
  actualSeconds: number[];
};

type CountdownProps = {
  isFocusMode?: boolean;
  onFocusModeChange?: (nextValue: boolean) => void;
  onNavigateLearningTab?: (tab: LearningTabKey) => void;
};

function calculateTimeLeft(targetIso: string): TimeLeft {
  const now = Date.now();
  const target = new Date(targetIso).getTime();
  const diff = target - now;

  if (diff <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, finished: true };
  }

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((diff / (1000 * 60)) % 60);
  const seconds = Math.floor((diff / 1000) % 60);

  return { days, hours, minutes, seconds, finished: false };
}

function getStoredTarget(): string {
  if (typeof window === "undefined") return DEFAULT_TARGET;
  return window.localStorage.getItem(STORAGE_KEY) ?? DEFAULT_TARGET;
}

function pad(value: number): string {
  return value.toString().padStart(2, "0");
}

function formatExamClock(totalSeconds: number): string {
  const safeSeconds = Math.max(0, totalSeconds);
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const seconds = safeSeconds % 60;

  return hours > 0
    ? `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`
    : `${pad(minutes)}:${pad(seconds)}`;
}

function formatMinutesValue(totalSeconds: number): string {
  const rounded = Math.round((Math.max(0, totalSeconds) / 60) * 10) / 10;
  return Number.isInteger(rounded) ? rounded.toFixed(0) : rounded.toFixed(1);
}

function buildExamReport(
  session: RunningExam,
  actualSeconds: number[],
  endedBy: FocusSessionEndReason
): TimeManagementRecord {
  const sanitizedSeconds = session.blocks.map((_, index) => Math.max(0, Math.round(actualSeconds[index] ?? 0)));
  const usedSeconds = Math.min(
    session.totalSeconds,
    sanitizedSeconds.reduce((sum, value) => sum + value, 0)
  );

  return {
    id: `time-record-${Date.now()}`,
    subjectLabel: session.subjectLabel,
    blocks: session.blocks.map((block, index) => ({
      ...block,
      actualSeconds: sanitizedSeconds[index] ?? 0,
    })),
    totalSeconds: session.totalSeconds,
    usedSeconds,
    endedAt: new Date().toISOString(),
    endedBy,
  };
}

function getReportIntro(endedBy: FocusSessionEndReason): string {
  switch (endedBy) {
    case "completed":
      return "所有板块已完成，下面是本次时间管理诊断。";
    case "timeout":
      return "总倒计时已归零，下面是本次时间管理诊断。";
    case "manual":
      return "本次模拟已手动结束，下面是当前的时间管理诊断。";
  }
}

function ActionIcon({ type }: { type: "play" | "edit" }) {
  return type === "play" ? (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M6.75 5.5v13l10.5-6.5-10.5-6.5Z" />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M4.75 19.25h4.1l9.35-9.35-4.1-4.1-9.35 9.35v4.1Z" />
      <path d="M12.75 6.25 16.85 10.35" />
    </svg>
  );
}

export function Countdown({
  isFocusMode = false,
  onFocusModeChange,
  onNavigateLearningTab,
}: CountdownProps) {
  const [targetDate, setTargetDate] = useState(DEFAULT_TARGET);
  const [timeLeft, setTimeLeft] = useState<TimeLeft>({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
    finished: false,
  });
  const [selectedTemplateId, setSelectedTemplateId] = useState(DEFAULT_TEMPLATE.id);
  const [draftBlocks, setDraftBlocks] = useState<FocusExamBlock[]>(() => cloneFocusExamBlocks(DEFAULT_TEMPLATE.blocks));
  const [runningExam, setRunningExam] = useState<RunningExam | null>(null);
  const [report, setReport] = useState<TimeManagementRecord | null>(null);
  const [examNow, setExamNow] = useState(() => Date.now());
  const [, setTimeManagementRecords] = useLocalStorage<TimeManagementRecord[]>(
    TIME_MANAGEMENT_STORAGE_KEY,
    [],
    { parse: parseStoredTimeManagementRecords }
  );

  useEffect(() => {
    const syncStoredTarget = window.setTimeout(() => {
      const storedTarget = getStoredTarget();
      setTargetDate(storedTarget);
    }, 0);

    return () => {
      window.clearTimeout(syncStoredTarget);
    };
  }, []);

  useEffect(() => {
    const initialUpdate = setTimeout(() => {
      setTimeLeft(calculateTimeLeft(targetDate));
    }, 0);
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft(targetDate));
    }, 1000);

    return () => {
      clearTimeout(initialUpdate);
      clearInterval(timer);
    };
  }, [targetDate]);

  useEffect(() => {
    if (!runningExam) return;

    const timer = window.setInterval(() => {
      const nextNow = Date.now();
      const elapsedSeconds = Math.max(0, Math.floor((nextNow - runningExam.startedAt) / 1000));

      if (elapsedSeconds >= runningExam.totalSeconds) {
        const timeoutAt = runningExam.startedAt + runningExam.totalSeconds * 1000;
        const actualSeconds = [...runningExam.actualSeconds];
        actualSeconds[runningExam.currentBlockIndex] =
          (actualSeconds[runningExam.currentBlockIndex] ?? 0) +
          Math.max(0, Math.floor((timeoutAt - runningExam.currentBlockStartedAt) / 1000));

        window.clearInterval(timer);
        const nextReport = buildExamReport(runningExam, actualSeconds, "timeout");
        setTimeManagementRecords((current) => [nextReport, ...current].slice(0, 60));
        setReport(nextReport);
        setRunningExam(null);
        return;
      }

      setExamNow(nextNow);
    }, 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, [runningExam, setTimeManagementRecords]);

  const selectedTemplate = useMemo(
    () => EXAM_TEMPLATES.find((item) => item.id === selectedTemplateId) ?? DEFAULT_TEMPLATE,
    [selectedTemplateId]
  );

  const blocks = useMemo(
    () => [
      { label: "天", value: timeLeft.days.toString() },
      { label: "时", value: pad(timeLeft.hours) },
      { label: "分", value: pad(timeLeft.minutes) },
      { label: "秒", value: pad(timeLeft.seconds) },
    ],
    [timeLeft]
  );

  const totalIdealMinutes = useMemo(
    () => draftBlocks.reduce((sum, block) => sum + Math.max(0, block.idealMinutes), 0),
    [draftBlocks]
  );
  const draftIsValid =
    draftBlocks.length > 0 &&
    draftBlocks.every((block) => Number.isFinite(block.idealMinutes) && block.idealMinutes > 0);

  const elapsedExamSeconds = runningExam ? Math.max(0, Math.floor((examNow - runningExam.startedAt) / 1000)) : 0;
  const remainingExamSeconds = runningExam ? Math.max(0, runningExam.totalSeconds - elapsedExamSeconds) : 0;
  const currentBlock = runningExam ? runningExam.blocks[runningExam.currentBlockIndex] : null;
  const currentBlockElapsedSeconds = runningExam
    ? Math.max(0, Math.floor((examNow - runningExam.currentBlockStartedAt) / 1000))
    : 0;

  const handleTargetChange = (event: ChangeEvent<HTMLInputElement>) => {
    const nextTarget = event.target.value;
    setTargetDate(nextTarget);
    setTimeLeft(calculateTimeLeft(nextTarget));
    window.localStorage.setItem(STORAGE_KEY, nextTarget);
  };

  const handleTemplateSelect = (templateId: string) => {
    const nextTemplate = EXAM_TEMPLATES.find((item) => item.id === templateId);
    if (!nextTemplate) return;
    setSelectedTemplateId(templateId);
    setDraftBlocks(cloneFocusExamBlocks(nextTemplate.blocks));
  };

  const handleIdealMinutesChange = (index: number, value: string) => {
    const parsedValue = Number(value);
    const nextValue = Number.isFinite(parsedValue) ? Math.max(0, parsedValue) : 0;

    setDraftBlocks((currentBlocks) =>
      currentBlocks.map((block, blockIndex) =>
        blockIndex === index
          ? {
              ...block,
              idealMinutes: nextValue,
            }
          : block
      )
    );
  };

  const handleEnableFocusMode = () => {
    onFocusModeChange?.(true);
  };

  const handleExitFocusMode = () => {
    setRunningExam(null);
    setReport(null);
    onFocusModeChange?.(false);
  };

  const handleStartExam = () => {
    if (!draftIsValid) return;

    const startedAt = Date.now();
    const nextBlocks = cloneFocusExamBlocks(draftBlocks);

    setExamNow(startedAt);
    setReport(null);
    setRunningExam({
      subjectId: selectedTemplate.id,
      subjectLabel: selectedTemplate.label,
      blocks: nextBlocks,
      totalSeconds: totalIdealMinutes * 60,
      startedAt,
      currentBlockIndex: 0,
      currentBlockStartedAt: startedAt,
      actualSeconds: new Array(nextBlocks.length).fill(0),
    });
  };

  const handleAdvanceBlock = () => {
    if (!runningExam) return;

    const completedAt = Date.now();
    const nextActualSeconds = [...runningExam.actualSeconds];
    nextActualSeconds[runningExam.currentBlockIndex] =
      (nextActualSeconds[runningExam.currentBlockIndex] ?? 0) +
      Math.max(0, Math.floor((completedAt - runningExam.currentBlockStartedAt) / 1000));

    if (runningExam.currentBlockIndex === runningExam.blocks.length - 1) {
      const nextReport = buildExamReport(runningExam, nextActualSeconds, "completed");
      setTimeManagementRecords((current) => [nextReport, ...current].slice(0, 60));
      setReport(nextReport);
      setRunningExam(null);
      return;
    }

    setExamNow(completedAt);
    setRunningExam({
      ...runningExam,
      actualSeconds: nextActualSeconds,
      currentBlockIndex: runningExam.currentBlockIndex + 1,
      currentBlockStartedAt: completedAt,
    });
  };

  const handleManualFinish = () => {
    if (!runningExam) return;

    const finishedAt = Date.now();
    const nextActualSeconds = [...runningExam.actualSeconds];
    nextActualSeconds[runningExam.currentBlockIndex] =
      (nextActualSeconds[runningExam.currentBlockIndex] ?? 0) +
      Math.max(0, Math.floor((finishedAt - runningExam.currentBlockStartedAt) / 1000));

    const nextReport = buildExamReport(runningExam, nextActualSeconds, "manual");
    setTimeManagementRecords((current) => [nextReport, ...current].slice(0, 60));
    setReport(nextReport);
    setRunningExam(null);
  };

  const handleCloseReport = () => {
    setReport(null);
    onFocusModeChange?.(false);
    onNavigateLearningTab?.("time-management");
  };

  const handleOpenScoreEntry = () => {
    onNavigateLearningTab?.("score-stats");
  };

  const reportMaxMinutes = report
    ? Math.max(
        1,
        ...report.blocks.map((block) => Math.max(block.idealMinutes, block.actualSeconds / 60))
      )
    : 1;

  return (
    <section className="w-full max-w-2xl px-6">
      <div className="space-y-6">
        <div className="frosted-card p-8 lg:p-10">
          <p className="text-sm tracking-[0.18em] uppercase text-muted-foreground">距离中考</p>

          {timeLeft.finished ? (
            <h2 className="mt-8 text-3xl font-semibold tracking-wide lg:text-4xl">考试加油，稳住发挥！</h2>
          ) : (
            <div className="mt-6">
              <div className="text-center">
                <p className="text-[6rem] font-bold leading-none tracking-tight text-foreground tabular-nums md:text-[7rem]">
                  {blocks[0]?.value}
                </p>
                <p className="mt-2 text-2xl font-medium tracking-[0.2em] text-foreground/90">天</p>
              </div>

              <div className="mt-8 grid grid-cols-3 gap-3">
                {blocks.slice(1).map((block) => (
                  <div
                    key={block.label}
                    className="rounded-2xl border border-border/80 bg-card-strong/65 px-4 py-4 text-center"
                  >
                    <p className="text-2xl font-medium tracking-wide text-foreground tabular-nums md:text-3xl">
                      {block.value}
                    </p>
                    <p className="mt-1 text-sm font-medium text-muted-foreground">{block.label}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mt-8">
            <label className="text-xs tracking-wide text-muted-foreground">目标时间（可修改）</label>
            <div className="mt-2 flex items-center gap-2 rounded-xl border border-border bg-card px-3 shadow-inner shadow-black/30">
              <svg
                viewBox="0 0 24 24"
                aria-hidden="true"
                className="h-4 w-4 text-muted-foreground"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
              >
                <rect x="3.5" y="4.5" width="17" height="16" rx="2.5" />
                <path d="M7.5 2.8v3.4M16.5 2.8v3.4M3.5 9.5h17" />
              </svg>
              <input
                type="datetime-local"
                value={targetDate}
                onChange={handleTargetChange}
                className="h-11 w-full bg-transparent text-sm tracking-wide text-foreground outline-none"
              />
            </div>
          </div>
        </div>

        {!isFocusMode ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={handleEnableFocusMode}
              className="group flex h-16 items-center justify-between rounded-2xl border border-border/80 bg-background/45 px-5 text-left text-foreground transition hover:border-accent/45 hover:bg-card/85"
            >
              <span className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-full border border-border/80 bg-card/80 text-muted-foreground transition group-hover:border-accent/45 group-hover:text-foreground">
                  <ActionIcon type="play" />
                </span>
                <span>
                  <span className="block text-sm font-semibold">开启模拟考</span>
                  <span className="block text-xs text-muted-foreground">进入专注模式并开始打点计时</span>
                </span>
              </span>
            </button>

            <button
              type="button"
              onClick={handleOpenScoreEntry}
              className="group flex h-16 items-center justify-between rounded-2xl border border-border/80 bg-background/45 px-5 text-left text-foreground transition hover:border-accent/45 hover:bg-card/85"
            >
              <span className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-full border border-border/80 bg-card/80 text-muted-foreground transition group-hover:border-accent/45 group-hover:text-foreground">
                  <ActionIcon type="edit" />
                </span>
                <span>
                  <span className="block text-sm font-semibold">成绩录入</span>
                  <span className="block text-xs text-muted-foreground">快速跳转到得分统计面板</span>
                </span>
              </span>
            </button>
          </div>
        ) : null}

        {isFocusMode ? (
          <div className="frosted-card p-6 lg:p-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-sm tracking-[0.18em] uppercase text-muted-foreground">专注考试诊断</p>
                <h2 className="mt-2 text-2xl font-semibold tracking-wide text-foreground">打点计时与控时复盘</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  进入模拟考后会隐藏右侧错题本，并按当前分块理想用时生成专属总倒计时。
                </p>
              </div>

              {!runningExam ? (
                <button
                  type="button"
                  onClick={handleExitFocusMode}
                  className="rounded-xl border border-border/80 bg-card px-4 py-2.5 text-sm font-medium text-muted-foreground transition hover:border-accent/45 hover:bg-accent-soft/20 hover:text-foreground"
                >
                  退出专注模式
                </button>
              ) : (
                <span className="rounded-full border border-accent/45 bg-accent-soft/45 px-3 py-1.5 text-xs font-medium text-foreground">
                  专注模式进行中
                </span>
              )}
            </div>

            {runningExam ? (
              <div className="mt-6 space-y-5">
                <div className="rounded-3xl border border-accent/45 bg-accent-soft/30 px-6 py-6 text-center">
                  <p className="text-sm tracking-[0.18em] uppercase text-muted-foreground">模拟考总倒计时</p>
                  <p className="mt-3 font-mono text-5xl font-semibold tracking-tight text-foreground sm:text-6xl">
                    {formatExamClock(remainingExamSeconds)}
                  </p>
                  <p className="mt-3 text-sm text-muted-foreground">
                    {runningExam.subjectLabel} · 第 {runningExam.currentBlockIndex + 1} / {runningExam.blocks.length} 板块
                  </p>
                </div>

                <div className="rounded-2xl border border-accent/45 bg-accent-soft/25 px-5 py-4">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-xs tracking-[0.18em] uppercase text-muted-foreground">当前板块</p>
                      <p className="mt-1 text-xl font-semibold text-foreground">{currentBlock?.label}</p>
                    </div>
                    <div className="rounded-full border border-accent/45 bg-background/60 px-3 py-1 text-sm text-foreground">
                      已用 {formatMinutesValue(currentBlockElapsedSeconds)} 分钟
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row">
                  <button
                    type="button"
                    onClick={handleAdvanceBlock}
                    className="flex-1 rounded-2xl border-2 border-accent/60 bg-accent-soft/50 px-6 py-4 text-base font-semibold text-foreground shadow-sm transition hover:bg-accent-soft/70"
                  >
                    {runningExam.currentBlockIndex === runningExam.blocks.length - 1
                      ? "完成最后板块，查看诊断报告"
                      : "完成当前板块，进入下一板块"}
                  </button>
                  <button
                    type="button"
                    onClick={handleManualFinish}
                    className="rounded-2xl border border-border/80 bg-card px-5 py-4 text-sm font-medium text-muted-foreground transition hover:border-accent/45 hover:bg-accent-soft/20 hover:text-foreground"
                  >
                    提前结束并结算
                  </button>
                </div>

                <div className="space-y-3">
                  {runningExam.blocks.map((block, index) => {
                    const isCurrent = index === runningExam.currentBlockIndex;
                    const isCompleted = index < runningExam.currentBlockIndex;
                    const actualSeconds = runningExam.actualSeconds[index] ?? 0;

                    return (
                      <div
                        key={block.id}
                        className={`rounded-2xl border px-4 py-4 transition ${
                          isCurrent
                            ? "border-accent/60 bg-accent-soft/35 shadow-sm"
                            : isCompleted
                              ? "border-border/80 bg-card/85"
                              : "border-border/70 bg-background/45"
                        }`}
                      >
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <p className="font-semibold text-foreground">{block.label}</p>
                            <p className="text-xs text-muted-foreground">理想用时 {block.idealMinutes} 分钟</p>
                          </div>
                          <span
                            className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                              isCurrent
                                ? "border border-accent/50 bg-accent-soft/55 text-foreground"
                                : isCompleted
                                  ? "border border-emerald-500/35 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                                  : "border border-border/70 bg-background/55 text-muted-foreground"
                            }`}
                          >
                            {isCurrent ? "进行中" : isCompleted ? "已完成" : "待开始"}
                          </span>
                        </div>
                        <p className="mt-3 text-sm text-muted-foreground">
                          {isCurrent
                            ? `当前已用 ${formatMinutesValue(currentBlockElapsedSeconds)} 分钟`
                            : isCompleted
                              ? `实际用时 ${formatMinutesValue(actualSeconds)} 分钟`
                              : "点击大按钮后自动切换到该板块"}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="mt-6 space-y-6">
                <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
                  {EXAM_TEMPLATES.map((template) => {
                    const isSelected = template.id === selectedTemplateId;

                    return (
                      <button
                        key={template.id}
                        type="button"
                        onClick={() => handleTemplateSelect(template.id)}
                        className={`rounded-2xl border p-4 text-left shadow-sm transition ${
                          isSelected
                            ? "border-accent/60 bg-accent-soft/40"
                            : "border-border/80 bg-card/80 hover:border-accent/45 hover:bg-accent-soft/20"
                        }`}
                      >
                        <p className="font-semibold text-foreground">{template.label}</p>
                        <p className="mt-1 text-xs text-muted-foreground">{template.totalMinutes} 分钟</p>
                      </button>
                    );
                  })}
                </div>

                <div className="rounded-2xl border border-border/80 bg-card/75 p-5">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-lg font-semibold text-foreground">{selectedTemplate.label} 分块理想用时</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        支持手动调整分钟数，开始考试后总倒计时会按下方分块之和自动生成。
                      </p>
                    </div>
                    <div className="rounded-full border border-accent/45 bg-accent-soft/35 px-3 py-1 text-sm font-medium text-foreground">
                      当前总时长 {totalIdealMinutes} 分钟
                    </div>
                  </div>

                  <div className="mt-5 space-y-3">
                    {draftBlocks.map((block, index) => (
                      <div
                        key={block.id}
                        className="flex flex-col gap-3 rounded-2xl border border-border/75 bg-background/55 px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div>
                          <p className="font-medium text-foreground">{block.label}</p>
                          <p className="text-xs text-muted-foreground">第 {index + 1} 板块</p>
                        </div>
                        <label className="flex items-center gap-2 text-sm text-muted-foreground">
                          预计分钟数
                          <input
                            type="number"
                            min={1}
                            step={1}
                            value={block.idealMinutes}
                            onChange={(event) => handleIdealMinutesChange(index, event.target.value)}
                            className="w-24 rounded-xl border border-border bg-card px-3 py-2 text-right text-sm text-foreground outline-none transition focus:border-accent/55"
                          />
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleStartExam}
                  disabled={!draftIsValid}
                  className="w-full rounded-2xl border-2 border-accent/60 bg-accent-soft/50 px-6 py-4 text-base font-semibold text-foreground shadow-sm transition hover:bg-accent-soft/70 disabled:cursor-not-allowed disabled:border-border/70 disabled:bg-card disabled:text-muted-foreground"
                >
                  开始考试
                </button>
              </div>
            )}
          </div>
        ) : null}
      </div>

      {report ? (
        <div className="fixed inset-0 z-[60] overflow-y-auto bg-background/75 p-4 backdrop-blur-sm">
          <div className="mx-auto flex min-h-full w-full max-w-4xl items-center justify-center">
            <div className="frosted-card my-4 flex max-h-[calc(100vh-2rem)] w-full flex-col overflow-hidden p-6 lg:p-8">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-sm tracking-[0.18em] uppercase text-muted-foreground">时间管理诊断报告</p>
                  <h3 className="mt-2 text-2xl font-semibold text-foreground">{report.subjectLabel} · 模拟考结算</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{getReportIntro(report.endedBy)}</p>
                </div>
                <div className="rounded-2xl border border-border/80 bg-card/75 px-4 py-3 text-sm text-foreground">
                  <p>理想总时长 {formatMinutesValue(report.totalSeconds)} 分钟</p>
                  <p className="mt-1 text-muted-foreground">实际用时 {formatMinutesValue(report.usedSeconds)} 分钟</p>
                </div>
              </div>

              <div className="mt-6 flex-1 space-y-4 overflow-y-auto pr-1">
                {report.blocks.map((block) => {
                  const actualMinutes = block.actualSeconds / 60;
                  const isTimedPerfectly = actualMinutes <= block.idealMinutes * 1.1 && block.actualSeconds > 0;
                  const isOvertime = actualMinutes > block.idealMinutes * 1.1;
                  const statusText =
                    block.actualSeconds <= 0
                      ? "未完成"
                      : isOvertime
                        ? "超时，需针对性提速"
                        : "控时完美";
                  const statusClass =
                    block.actualSeconds <= 0
                      ? "border-border/80 bg-card text-muted-foreground"
                      : isTimedPerfectly
                        ? "border-emerald-500/35 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                        : "border-red-500/35 bg-red-500/10 text-red-700 dark:text-red-300";
                  const idealWidth = `${Math.min(100, (block.idealMinutes / reportMaxMinutes) * 100)}%`;
                  const actualWidth = `${Math.min(100, ((block.actualSeconds / 60) / reportMaxMinutes) * 100)}%`;

                  return (
                    <div key={block.id} className="rounded-2xl border border-border/80 bg-card/75 p-5">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <p className="text-lg font-semibold text-foreground">{block.label}</p>
                          <p className="mt-1 text-sm text-muted-foreground">
                            理想 {block.idealMinutes} 分钟 · 实际 {formatMinutesValue(block.actualSeconds)} 分钟
                          </p>
                        </div>
                        <span className={`rounded-full border px-3 py-1.5 text-xs font-medium ${statusClass}`}>
                          {statusText}
                        </span>
                      </div>

                      <div className="mt-4 space-y-3">
                        <div>
                          <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
                            <span>理想用时</span>
                            <span>{block.idealMinutes} 分钟</span>
                          </div>
                          <div className="h-2.5 rounded-full bg-border/60">
                            <div
                              className="h-2.5 rounded-full bg-accent/70"
                              style={{ width: idealWidth }}
                            />
                          </div>
                        </div>

                        <div>
                          <div
                            className={`mb-1 flex items-center justify-between text-xs ${
                              block.actualSeconds <= 0
                                ? "text-muted-foreground"
                                : isOvertime
                                  ? "text-red-700 dark:text-red-300"
                                  : "text-emerald-700 dark:text-emerald-300"
                            }`}
                          >
                            <span>实际用时</span>
                            <span>{formatMinutesValue(block.actualSeconds)} 分钟</span>
                          </div>
                          <div className="h-2.5 rounded-full bg-border/60">
                            <div
                              className={`h-2.5 rounded-full ${
                                block.actualSeconds <= 0
                                  ? "bg-border"
                                  : isOvertime
                                    ? "bg-red-500/80"
                                    : "bg-emerald-500/80"
                              }`}
                              style={{ width: actualWidth }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={handleCloseReport}
                className="mt-6 w-full shrink-0 rounded-2xl border-2 border-accent/60 bg-accent-soft/45 px-6 py-4 text-base font-semibold text-foreground shadow-sm transition hover:bg-accent-soft/65"
              >
                结束复盘
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
