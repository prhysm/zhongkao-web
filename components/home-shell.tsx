"use client";

import { useRef, useState } from "react";
import dynamic from "next/dynamic";
import { LearningTabKey } from "@/lib/study-data";

const Countdown = dynamic(() => import("@/components/countdown").then((mod) => mod.Countdown), {
  ssr: false,
  loading: () => (
    <section className="w-full max-w-2xl px-6">
      <div className="frosted-card p-8 lg:p-10">
        <p className="text-sm tracking-[0.18em] uppercase text-muted-foreground">距离中考</p>
        <div className="mt-6 text-center">
          <p className="text-[6rem] font-bold leading-none tracking-tight text-foreground/60 md:text-[7rem]">--</p>
          <p className="mt-2 text-2xl font-medium tracking-[0.2em] text-foreground/60">天</p>
        </div>
      </div>
    </section>
  ),
});

const MistakeBook = dynamic(() => import("@/components/mistake-book").then((mod) => mod.MistakeBook), {
  ssr: false,
  loading: () => (
    <section className="frosted-card flex min-h-0 flex-1 flex-col p-6 lg:p-8">
      <div className="border-b border-border/80 pb-5">
        <h2 className="text-2xl font-semibold tracking-wide text-foreground/70">学习功能栏</h2>
        <p className="mt-1 text-sm text-muted-foreground">正在载入学习数据...</p>
      </div>
      <div className="mt-5 grid gap-3">
        <div className="h-10 rounded-xl border border-border/70 bg-card/70" />
        <div className="h-10 rounded-xl border border-border/70 bg-card/70" />
        <div className="h-32 rounded-2xl border border-border/70 bg-card/70" />
      </div>
    </section>
  ),
});

export function HomeShell() {
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [isLearningPanelExpanded, setIsLearningPanelExpanded] = useState(false);
  const [activeLearningTab, setActiveLearningTab] = useState<LearningTabKey>("mistakes");
  const learningPanelRef = useRef<HTMLDivElement | null>(null);

  const handleOpenLearningTab = (nextTab: LearningTabKey) => {
    setActiveLearningTab(nextTab);

    window.setTimeout(() => {
      learningPanelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 60);
  };

  const handleFocusModeChange = (nextValue: boolean) => {
    setIsFocusMode(nextValue);
    if (nextValue) {
      setIsLearningPanelExpanded(false);
    }
  };

  if (isFocusMode) {
    return (
      <div className="min-h-screen pt-14">
        <div className="mx-auto flex min-h-[calc(100vh-3.5rem)] w-full max-w-3xl items-start justify-center px-4 py-8 lg:px-8">
          <Countdown
            isFocusMode
            onFocusModeChange={handleFocusModeChange}
            onNavigateLearningTab={handleOpenLearningTab}
          />
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen pt-14 print:pt-0 ${isLearningPanelExpanded ? "" : "flex flex-col xl:flex-row"}`}>
      {!isLearningPanelExpanded ? (
        <div className="flex items-center justify-center border-b border-border/80 py-12 print:hidden xl:sticky xl:top-14 xl:h-[calc(100vh-3.5rem)] xl:w-[min(34rem,38vw)] xl:border-b-0 xl:border-r xl:py-0">
          <Countdown
            onFocusModeChange={handleFocusModeChange}
            onNavigateLearningTab={handleOpenLearningTab}
          />
        </div>
      ) : null}

      <div
        ref={learningPanelRef}
        className={
          isLearningPanelExpanded
            ? "mx-auto flex min-h-[calc(100vh-3.5rem)] w-full max-w-[1440px] flex-col p-4 md:p-6 print:p-0 xl:p-8"
            : "flex min-h-0 flex-1 flex-col p-4 md:p-6 print:p-0 xl:h-[calc(100vh-3.5rem)] xl:p-8"
        }
      >
        <MistakeBook
          activeTab={activeLearningTab}
          onActiveTabChange={setActiveLearningTab}
          isExpanded={isLearningPanelExpanded}
          onExpandedChange={setIsLearningPanelExpanded}
        />
      </div>
    </div>
  );
}
