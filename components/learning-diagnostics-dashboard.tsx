"use client";

import { useMemo, useState } from "react";
import {
  CartesianGrid,
  LabelList,
  Line,
  LineChart,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ScoreRecord, TimeManagementRecord } from "@/lib/study-data";

type LearningDiagnosticsDashboardProps = {
  scoreRecords: ScoreRecord[];
  subjectLabel: string;
  timeManagementRecords: TimeManagementRecord[];
};

type DiagnosticBlock = {
  actualMinutes: number;
  fullScore: number;
  id: string;
  idealMinutes: number;
  label: string;
  score: number;
  scoreRate: number;
  timeRate: number;
};

type DiagnosticExam = {
  endedAt: string;
  examId: string;
  examName: string;
  overallScoreRate: number;
  blocks: DiagnosticBlock[];
};

type TrendPoint = {
  dateLabel: string;
  examName: string;
  fullDateLabel: string;
  scoreRatePercent: number;
};

type ScatterPoint = {
  actualMinutes: number;
  idealMinutes: number;
  label: string;
  scoreRatePercent: number;
  scoreText: string;
  timeRate: number;
};

type DiagnosticQuadrant =
  | "careless-low-time"
  | "weakness-high-time"
  | "not-fluent-high-time"
  | "strength-low-time";

type DiagnosticAdvice = {
  actions: string[];
  focus: string;
  quadrant: DiagnosticQuadrant;
  quadrantLabel: string;
  signal: string;
  target: string;
  title: string;
};

function formatShortDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "--";
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

function formatLongDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "时间未知";
  return new Intl.DateTimeFormat("zh-CN", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatExamOptionLabel(exam: DiagnosticExam): string {
  return `${exam.examName} · ${formatLongDate(exam.endedAt)}`;
}

function formatPercentValue(value: number): number {
  return Math.round(value * 1000) / 10;
}

function formatPercentText(value: number): string {
  const rounded = formatPercentValue(value);
  return `${Number.isInteger(rounded) ? rounded.toFixed(0) : rounded.toFixed(1)}%`;
}

function formatTimeRateText(value: number): string {
  const rounded = Math.round(value * 100) / 100;
  return `${Number.isInteger(rounded) ? rounded.toFixed(0) : rounded.toFixed(2)}x`;
}

function getScatterDotColor(scoreRatePercent: number, timeRate: number): string {
  if (scoreRatePercent >= 50 && timeRate <= 1) return "#10b981";
  if (scoreRatePercent >= 50 && timeRate > 1) return "#f59e0b";
  if (scoreRatePercent < 50 && timeRate <= 1) return "#fb7185";
  return "#ef4444";
}

function getDiagnosticQuadrant(scoreRatePercent: number, timeRate: number): DiagnosticQuadrant {
  if (scoreRatePercent >= 50 && timeRate <= 1) return "strength-low-time";
  if (scoreRatePercent >= 50 && timeRate > 1) return "not-fluent-high-time";
  if (scoreRatePercent < 50 && timeRate <= 1) return "careless-low-time";
  return "weakness-high-time";
}

function getDiagnosticAdvice(point: ScatterPoint): DiagnosticAdvice {
  const quadrant = getDiagnosticQuadrant(point.scoreRatePercent, point.timeRate);

  switch (quadrant) {
    case "careless-low-time":
      return {
        quadrant,
        quadrantLabel: "粗心大意区",
        title: "先稳正确率，再谈压时间",
        signal: "用时低于理想值，但得分率偏低，说明这类题更像是做得过快、检查不足。",
        focus: "优先修正审题、步骤完整度和复核习惯，而不是继续追求更快。",
        actions: [
          "把该板块最后 10% 时间固定留给复核，至少检查条件、单位、答题完整度。",
          "回看最近错题，统计是审题漏看、步骤跳写还是计算失误，形成固定检查清单。",
          "练习时先用“限时但不抢时”的节奏，确保正确率回升后再逐步压缩用时。",
        ],
        target: "下次目标：维持 1.00x 内完成，同时把得分率先抬到 60%-70% 以上。",
      };
    case "weakness-high-time":
      return {
        quadrant,
        quadrantLabel: "核心薄弱区",
        title: "这是当前最该优先补的板块",
        signal: "花了比理想更多的时间，得分率仍然偏低，说明问题主要在知识理解或解题路径。",
        focus: "先补底层知识和典型题型，再做限时训练，否则只会越做越慢。",
        actions: [
          "把这个板块拆成 2-3 个高频题型，逐类复盘错因，建立对应解题模板。",
          "先做不计时的针对练，把“会做”稳定下来，再切回限时模拟。",
          "整理 1 页该板块的易错点清单，下一次考试前快速过一遍再进场。",
        ],
        target: "下次目标：先把耗时率压回 1.10x 左右，同时把得分率提升到 50% 以上。",
      };
    case "not-fluent-high-time":
      return {
        quadrant,
        quadrantLabel: "熟练度不足区",
        title: "会做，但还不够顺",
        signal: "得分率已经不错，但耗时偏高，说明理解基本到位，卡点在熟练度和路径选择。",
        focus: "重点训练提速和步骤模板化，把“会做”升级成“稳定快做”。",
        actions: [
          "把常见题型的起手步骤写成固定模板，减少临场试错和停顿。",
          "做 3-5 题同类微型限时训练，目标是每次比上次更快但不掉正确率。",
          "复盘哪些步骤最耗时，看看能否通过先判断题型、先列框架来缩短思考时间。",
        ],
        target: "下次目标：在保持当前得分率的前提下，把耗时率压到 1.00x 附近。",
      };
    case "strength-low-time":
      return {
        quadrant,
        quadrantLabel: "优势安全区",
        title: "这是你的稳定拿分区",
        signal: "得分率高且耗时率低，说明这个板块已经形成明显优势。",
        focus: "以维持手感为主，同时把节省下来的时间分配给更薄弱板块。",
        actions: [
          "保持低频但稳定的保温训练，避免因为长期不练导致手感回落。",
          "总结这类题的高效做法，把能复用的流程迁移到相近板块。",
          "考试中把这里作为“时间回收区”，为后面的弱项留出额外思考时间。",
        ],
        target: "下次目标：继续稳定在高分低时，并把节省出的时间投向薄弱板块。",
      };
  }
}

function buildLinkedDiagnosticExams(
  scoreRecords: ScoreRecord[],
  subjectLabel: string,
  timeManagementRecords: TimeManagementRecord[]
): DiagnosticExam[] {
  const scoreRecordByTimeId = new Map<string, ScoreRecord>();
  scoreRecords.forEach((record) => {
    if (record.subjectLabel !== subjectLabel || !record.timeManagementRecordId) return;
    scoreRecordByTimeId.set(record.timeManagementRecordId, record);
  });

  return [...timeManagementRecords]
    .filter((record) => record.subjectLabel === subjectLabel)
    .sort((a, b) => new Date(b.endedAt).getTime() - new Date(a.endedAt).getTime())
    .flatMap((timeRecord) => {
      const scoreRecord = scoreRecordByTimeId.get(timeRecord.id);
      if (!scoreRecord || scoreRecord.fullScore <= 0) return [];

      const blocks = timeRecord.blocks.flatMap((timeBlock) => {
        const scoreBlock =
          scoreRecord.blocks.find((block) => block.id === timeBlock.id) ??
          scoreRecord.blocks.find((block) => block.label === timeBlock.label);
        if (!scoreBlock || scoreBlock.fullScore <= 0 || timeBlock.idealMinutes <= 0) return [];

        return [
          {
            id: timeBlock.id,
            label: timeBlock.label,
            score: scoreBlock.score,
            fullScore: scoreBlock.fullScore,
            scoreRate: scoreBlock.score / scoreBlock.fullScore,
            idealMinutes: timeBlock.idealMinutes,
            actualMinutes: timeBlock.actualSeconds / 60,
            timeRate: timeBlock.actualSeconds / (timeBlock.idealMinutes * 60),
          },
        ];
      });

      if (blocks.length === 0) return [];

      return [
        {
          examId: timeRecord.id,
          examName: scoreRecord.examName,
          endedAt: timeRecord.endedAt,
          overallScoreRate: scoreRecord.score / scoreRecord.fullScore,
          blocks,
        },
      ];
    });
}

export function LearningDiagnosticsDashboard({
  scoreRecords,
  subjectLabel,
  timeManagementRecords,
}: LearningDiagnosticsDashboardProps) {
  const linkedExams = useMemo(
    () => buildLinkedDiagnosticExams(scoreRecords, subjectLabel, timeManagementRecords),
    [scoreRecords, subjectLabel, timeManagementRecords]
  );
  const blockOptions = useMemo(
    () => Array.from(new Set(linkedExams.flatMap((exam) => exam.blocks.map((block) => block.label)))),
    [linkedExams]
  );
  const [selectedBlockLabel, setSelectedBlockLabel] = useState("");
  const [selectedDiagnosticExamId, setSelectedDiagnosticExamId] = useState("");
  const [selectedScatterLabel, setSelectedScatterLabel] = useState("");
  const activeBlockLabel = blockOptions.includes(selectedBlockLabel) ? selectedBlockLabel : (blockOptions[0] ?? "");

  const trendData = useMemo<TrendPoint[]>(() => {
    if (!activeBlockLabel) return [];

    return linkedExams
      .flatMap((exam) => {
        const targetBlock = exam.blocks.find((block) => block.label === activeBlockLabel);
        if (!targetBlock) return [];
        return [
          {
            dateLabel: formatShortDate(exam.endedAt),
            fullDateLabel: formatLongDate(exam.endedAt),
            examName: exam.examName,
            scoreRatePercent: formatPercentValue(targetBlock.scoreRate),
          },
        ];
      })
      .slice(0, 8)
      .reverse();
  }, [activeBlockLabel, linkedExams]);

  const latestExam = linkedExams[0] ?? null;
  const activeDiagnosticExam =
    linkedExams.find((exam) => exam.examId === selectedDiagnosticExamId) ?? latestExam;
  const scatterData = useMemo<ScatterPoint[]>(() => {
    if (!activeDiagnosticExam) return [];
    return activeDiagnosticExam.blocks.map((block) => ({
      label: block.label,
      scoreRatePercent: formatPercentValue(block.scoreRate),
      timeRate: Math.round(block.timeRate * 100) / 100,
      actualMinutes: Math.round(block.actualMinutes * 10) / 10,
      idealMinutes: block.idealMinutes,
      scoreText: `${block.score} / ${block.fullScore}`,
    }));
  }, [activeDiagnosticExam]);

  const scatterUpperDomain = useMemo(() => {
    if (scatterData.length === 0) return 2;
    const maxTimeRate = Math.max(...scatterData.map((item) => item.timeRate));
    return Math.max(2, Math.ceil(maxTimeRate * 10) / 10);
  }, [scatterData]);
  const activeScatterLabel = scatterData.some((item) => item.label === selectedScatterLabel)
    ? selectedScatterLabel
    : (scatterData[0]?.label ?? "");
  const activeScatterPoint = scatterData.find((item) => item.label === activeScatterLabel) ?? null;
  const activeScatterAdvice = activeScatterPoint ? getDiagnosticAdvice(activeScatterPoint) : null;

  if (linkedExams.length === 0) {
    return (
      <div className="mt-5 rounded-2xl border border-dashed border-border/80 bg-card/70 px-5 py-8 text-center">
        <p className="text-sm font-medium text-foreground">当前学科还没有可用于诊断的历史考试。</p>
        <p className="mt-2 text-sm text-muted-foreground">
          先在“时间管理”历史记录里为考试录入板块成绩，系统才能同时拿到得分率和耗时率数据。
        </p>
      </div>
    );
  }

  return (
    <div className="mt-5 space-y-5">
      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded-2xl border border-border/80 bg-card p-4">
          <p className="text-xs tracking-[0.16em] uppercase text-muted-foreground">已关联考试</p>
          <p className="mt-2 text-3xl font-semibold text-foreground">{linkedExams.length}</p>
          <p className="mt-1 text-xs text-muted-foreground">仅统计同时具备控时和成绩的记录</p>
        </div>
        <div className="rounded-2xl border border-border/80 bg-card p-4">
          <p className="text-xs tracking-[0.16em] uppercase text-muted-foreground">最近一次考试</p>
          <p className="mt-2 text-lg font-semibold text-foreground">{latestExam?.examName ?? "--"}</p>
          <p className="mt-1 text-xs text-muted-foreground">{latestExam ? formatLongDate(latestExam.endedAt) : "时间未知"}</p>
        </div>
        <div className="rounded-2xl border border-border/80 bg-card p-4">
          <p className="text-xs tracking-[0.16em] uppercase text-muted-foreground">最近整卷得分率</p>
          <p className="mt-2 text-3xl font-semibold text-foreground">
            {latestExam ? formatPercentText(latestExam.overallScoreRate) : "--"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">用于快速判断最新一次整体表现</p>
        </div>
      </div>

      <div className="grid gap-5">
        <section className="rounded-3xl border border-border/90 bg-card p-5 md:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm tracking-[0.18em] uppercase text-muted-foreground">趋势折线图</p>
              <h3 className="mt-2 text-xl font-semibold text-foreground">板块得分率波动趋势</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                观察最近 5-8 次考试里同一板块是否稳定上升。
              </p>
            </div>
            <label className="block">
              <span className="text-xs text-muted-foreground">选择板块</span>
              <select
                value={activeBlockLabel}
                onChange={(event) => setSelectedBlockLabel(event.target.value)}
                className="mt-2 h-10 min-w-[180px] rounded-xl border border-border bg-background px-3 text-sm text-foreground outline-none transition focus:border-accent/70"
              >
                {blockOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {trendData.length === 0 ? (
            <div className="mt-5 rounded-2xl border border-dashed border-border/80 bg-background/50 px-5 py-10 text-center">
              <p className="text-sm font-medium text-foreground">这个板块的历史数据还不够。</p>
              <p className="mt-2 text-sm text-muted-foreground">继续录入几次考试后，这里会自动绘制趋势线。</p>
            </div>
          ) : (
            <div className="mt-5">
              <div className="mb-3 flex items-center justify-between text-xs text-muted-foreground">
                <span>最近 {trendData.length} 次考试</span>
                <span>纵轴：得分率</span>
              </div>
              <div className="h-[340px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trendData} margin={{ top: 12, right: 12, bottom: 6, left: 0 }}>
                    <CartesianGrid stroke="rgba(148, 163, 184, 0.18)" strokeDasharray="4 4" />
                    <XAxis dataKey="dateLabel" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                    <YAxis
                      domain={[0, 100]}
                      tickFormatter={(value) => `${value}%`}
                      tick={{ fontSize: 12 }}
                      tickLine={false}
                      axisLine={false}
                      width={46}
                    />
                    <Tooltip
                      cursor={{ stroke: "rgba(111,149,255,0.35)", strokeWidth: 1.5 }}
                      content={({ active, payload }) => {
                        if (!active || !payload || payload.length === 0) return null;
                        const point = payload[0]?.payload as TrendPoint | undefined;
                        if (!point) return null;
                        return (
                          <div className="rounded-2xl border border-border/80 bg-background/95 px-4 py-3 shadow-xl">
                            <p className="text-sm font-semibold text-foreground">{point.examName}</p>
                            <p className="mt-1 text-xs text-muted-foreground">{point.fullDateLabel}</p>
                            <p className="mt-2 text-sm text-foreground">得分率：{point.scoreRatePercent}%</p>
                          </div>
                        );
                      }}
                    />
                    <ReferenceLine y={60} stroke="rgba(148, 163, 184, 0.35)" strokeDasharray="3 3" />
                    <Line
                      type="monotone"
                      dataKey="scoreRatePercent"
                      stroke="#7c8cff"
                      strokeWidth={3}
                      dot={{ r: 4, strokeWidth: 0, fill: "#7c8cff" }}
                      activeDot={{ r: 6, strokeWidth: 0, fill: "#5b6fff" }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </section>

        <section className="rounded-3xl border border-border/90 bg-card p-5 md:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm tracking-[0.18em] uppercase text-muted-foreground">四象限散点图</p>
              <h3 className="mt-2 text-xl font-semibold text-foreground">指定考试核心诊断</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                横轴看得分率，纵轴看耗时率，快速识别薄弱板块与稳定优势。
              </p>
            </div>
            <label className="block">
              <span className="text-xs text-muted-foreground">选择考试</span>
              <select
                value={activeDiagnosticExam?.examId ?? ""}
                onChange={(event) => {
                  setSelectedDiagnosticExamId(event.target.value);
                  setSelectedScatterLabel("");
                }}
                className="mt-2 h-10 min-w-[220px] rounded-xl border border-border bg-background px-3 text-sm text-foreground outline-none transition focus:border-accent/70"
              >
                {linkedExams.map((exam) => (
                  <option key={exam.examId} value={exam.examId}>
                    {formatExamOptionLabel(exam)}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {activeDiagnosticExam && scatterData.length > 0 ? (
            <div className="mt-5">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                <span>{activeDiagnosticExam.examName}</span>
                <span>{formatLongDate(activeDiagnosticExam.endedAt)}</span>
              </div>
              <div className="space-y-4">
                <div className="h-[420px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <ScatterChart margin={{ top: 16, right: 22, bottom: 20, left: 8 }}>
                      <CartesianGrid stroke="rgba(148, 163, 184, 0.18)" strokeDasharray="4 4" />
                      <XAxis
                        type="number"
                        dataKey="scoreRatePercent"
                        domain={[0, 100]}
                        tickFormatter={(value) => `${value}%`}
                        tick={{ fontSize: 12 }}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis
                        type="number"
                        dataKey="timeRate"
                        domain={[0, scatterUpperDomain]}
                        tickFormatter={(value) => `${value}x`}
                        tick={{ fontSize: 12 }}
                        tickLine={false}
                        axisLine={false}
                        width={52}
                      />
                      <Tooltip
                        cursor={{ strokeDasharray: "3 3" }}
                        content={({ active, payload }) => {
                          if (!active || !payload || payload.length === 0) return null;
                          const point = payload[0]?.payload as ScatterPoint | undefined;
                          if (!point) return null;
                          return (
                            <div className="rounded-2xl border border-border/80 bg-background/95 px-4 py-3 shadow-xl">
                              <p className="text-sm font-semibold text-foreground">{point.label}</p>
                              <div className="mt-2 space-y-1 text-sm text-foreground">
                                <p>得分率：{point.scoreRatePercent}%</p>
                                <p>得分：{point.scoreText}</p>
                                <p>耗时率：{formatTimeRateText(point.timeRate)}</p>
                                <p>用时：{point.actualMinutes} / {point.idealMinutes} 分钟</p>
                              </div>
                            </div>
                          );
                        }}
                      />
                      <ReferenceArea
                        x1={0}
                        x2={50}
                        y1={0}
                        y2={1}
                        fill="#fb7185"
                        fillOpacity={0.08}
                        label={{ value: "粗心大意区", position: "insideBottomLeft", fill: "rgba(100,116,139,0.9)", fontSize: 11 }}
                      />
                      <ReferenceArea
                        x1={0}
                        x2={50}
                        y1={1}
                        y2={scatterUpperDomain}
                        fill="#ef4444"
                        fillOpacity={0.08}
                        label={{ value: "核心薄弱区", position: "insideTopLeft", fill: "rgba(100,116,139,0.9)", fontSize: 11 }}
                      />
                      <ReferenceArea
                        x1={50}
                        x2={100}
                        y1={1}
                        y2={scatterUpperDomain}
                        fill="#f59e0b"
                        fillOpacity={0.08}
                        label={{ value: "熟练度不足区", position: "insideTopRight", fill: "rgba(100,116,139,0.9)", fontSize: 11 }}
                      />
                      <ReferenceArea
                        x1={50}
                        x2={100}
                        y1={0}
                        y2={1}
                        fill="#10b981"
                        fillOpacity={0.08}
                        label={{ value: "优势安全区", position: "insideBottomRight", fill: "rgba(100,116,139,0.9)", fontSize: 11 }}
                      />
                      <ReferenceLine x={50} stroke="rgba(99,102,241,0.55)" strokeDasharray="4 4" />
                      <ReferenceLine y={1} stroke="rgba(99,102,241,0.55)" strokeDasharray="4 4" />
                      <Scatter
                        data={scatterData}
                        shape={(props) => {
                          const point = props.payload as ScatterPoint;
                          const isActive = point.label === activeScatterLabel;
                          return (
                            <circle
                              cx={props.cx}
                              cy={props.cy}
                              r={isActive ? 10 : 8}
                              fill={getScatterDotColor(point.scoreRatePercent, point.timeRate)}
                              stroke={isActive ? "rgba(99,102,241,0.95)" : "rgba(15,23,42,0.2)"}
                              strokeWidth={isActive ? 3 : 2}
                              style={{ cursor: "pointer" }}
                              onClick={() => setSelectedScatterLabel(point.label)}
                            />
                          );
                        }}
                      >
                        <LabelList dataKey="label" position="top" offset={10} fontSize={11} fill="currentColor" />
                      </Scatter>
                    </ScatterChart>
                  </ResponsiveContainer>
                </div>

                <div className="flex flex-wrap gap-2 text-[11px] text-muted-foreground">
                  <span className="rounded-full border border-border/80 bg-background px-2.5 py-1">横轴中线：50%</span>
                  <span className="rounded-full border border-border/80 bg-background px-2.5 py-1">纵轴中线：1.00x 理想用时</span>
                  <span className="rounded-full border border-accent/35 bg-accent-soft/20 px-2.5 py-1 text-foreground">
                    点击散点查看建议
                  </span>
                </div>

                {activeScatterPoint && activeScatterAdvice ? (
                  <aside className="rounded-3xl border border-border/80 bg-background/50 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs tracking-[0.16em] uppercase text-muted-foreground">板块诊断建议</p>
                        <h4 className="mt-2 text-lg font-semibold text-foreground">{activeScatterPoint.label}</h4>
                      </div>
                      <span className="rounded-full border border-accent/45 bg-accent-soft/25 px-2.5 py-1 text-[11px] font-medium text-foreground">
                        {activeScatterAdvice.quadrantLabel}
                      </span>
                    </div>

                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <div className="rounded-2xl border border-border/75 bg-card/80 px-3 py-3">
                        <p className="text-[11px] tracking-[0.14em] uppercase text-muted-foreground">得分率</p>
                        <p className="mt-1 text-xl font-semibold text-foreground">{activeScatterPoint.scoreRatePercent}%</p>
                        <p className="text-[11px] text-muted-foreground">{activeScatterPoint.scoreText}</p>
                      </div>
                      <div className="rounded-2xl border border-border/75 bg-card/80 px-3 py-3">
                        <p className="text-[11px] tracking-[0.14em] uppercase text-muted-foreground">耗时率</p>
                        <p className="mt-1 text-xl font-semibold text-foreground">{formatTimeRateText(activeScatterPoint.timeRate)}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {activeScatterPoint.actualMinutes} / {activeScatterPoint.idealMinutes} 分钟
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 rounded-2xl border border-border/75 bg-card/80 px-4 py-4">
                      <p className="text-sm font-semibold text-foreground">{activeScatterAdvice.title}</p>
                      <p className="mt-2 text-sm text-muted-foreground">{activeScatterAdvice.signal}</p>
                    </div>

                    <div className="mt-4 rounded-2xl border border-border/75 bg-card/80 px-4 py-4">
                      <p className="text-xs tracking-[0.14em] uppercase text-muted-foreground">本轮训练重点</p>
                      <p className="mt-2 text-sm text-foreground">{activeScatterAdvice.focus}</p>
                    </div>

                    <div className="mt-4 rounded-2xl border border-border/75 bg-card/80 px-4 py-4">
                      <p className="text-xs tracking-[0.14em] uppercase text-muted-foreground">建议动作</p>
                      <div className="mt-3 space-y-2">
                        {activeScatterAdvice.actions.map((action) => (
                          <div
                            key={action}
                            className="rounded-xl border border-border/70 bg-background/60 px-3 py-2 text-sm text-foreground"
                          >
                            {action}
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="mt-4 rounded-2xl border border-accent/35 bg-accent-soft/20 px-4 py-4">
                      <p className="text-xs tracking-[0.14em] uppercase text-muted-foreground">下次考试目标</p>
                      <p className="mt-2 text-sm font-medium text-foreground">{activeScatterAdvice.target}</p>
                    </div>
                  </aside>
                ) : null}
              </div>
            </div>
          ) : (
            <div className="mt-5 rounded-2xl border border-dashed border-border/80 bg-background/50 px-5 py-10 text-center">
              <p className="text-sm font-medium text-foreground">最近一次考试还没有足够的板块数据。</p>
              <p className="mt-2 text-sm text-muted-foreground">请先为该场考试录入板块成绩，散点图会自动生成。</p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
