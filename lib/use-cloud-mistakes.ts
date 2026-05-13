"use client";

import type { Dispatch, SetStateAction } from "react";
import type { MistakeItem } from "@/lib/mistakes-model";
import { parseStoredMistakes } from "@/lib/mistakes-model";
import { useCloudUserJson } from "@/lib/use-cloud-user-json";

type UseCloudMistakesResult = {
  mistakes: MistakeItem[];
  setMistakes: Dispatch<SetStateAction<MistakeItem[]>>;
  ready: boolean;
  saving: boolean;
  error: string | null;
};

export function useCloudMistakes(userId: string | undefined): UseCloudMistakesResult {
  const { data, setData, ready, saving, error } = useCloudUserJson<MistakeItem[]>({
    userId,
    table: "user_mistakes",
    column: "mistakes",
    initialValue: [],
    parse: parseStoredMistakes,
  });

  return {
    mistakes: data,
    setMistakes: setData,
    ready,
    saving,
    error,
  };
}
