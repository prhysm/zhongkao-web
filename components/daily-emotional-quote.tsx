"use client";

import { useSyncExternalStore } from "react";
import {
  DEFAULT_DAILY_EMOTIONAL_QUOTE,
  getDailyEmotionalQuote,
} from "@/lib/emotional-first-aid";

const noopSubscribe = () => () => {};

export function DailyEmotionalQuote() {
  const quote = useSyncExternalStore(
    noopSubscribe,
    () => getDailyEmotionalQuote(),
    () => DEFAULT_DAILY_EMOTIONAL_QUOTE
  );

  return (
    <div className="flex min-w-0 w-full items-center justify-center">
      <p
        className="block min-w-0 max-w-[34rem] truncate px-2 text-center text-[11px] font-normal leading-none tracking-[0.04em] text-muted-foreground sm:text-xs md:text-[13px]"
        title={quote}
      >
        {quote}
      </p>
    </div>
  );
}
