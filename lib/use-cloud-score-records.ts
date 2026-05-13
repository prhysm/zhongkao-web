"use client";

import type { Dispatch, SetStateAction } from "react";
import { parseStoredScoreRecords, type ScoreRecord } from "@/lib/study-data";
import { useCloudUserJson } from "@/lib/use-cloud-user-json";

type UseCloudScoreRecordsResult = {
  scoreRecords: ScoreRecord[];
  setScoreRecords: Dispatch<SetStateAction<ScoreRecord[]>>;
  ready: boolean;
  saving: boolean;
  error: string | null;
};

export function useCloudScoreRecords(userId: string | undefined): UseCloudScoreRecordsResult {
  const { data, setData, ready, saving, error } = useCloudUserJson<ScoreRecord[]>({
    userId,
    table: "user_score_records",
    column: "records",
    initialValue: [],
    parse: parseStoredScoreRecords,
  });

  return {
    scoreRecords: data,
    setScoreRecords: setData,
    ready,
    saving,
    error,
  };
}
