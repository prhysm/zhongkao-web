"use client";

import type { Dispatch, SetStateAction } from "react";
import {
  parseStoredTimeManagementRecords,
  type TimeManagementRecord,
} from "@/lib/study-data";
import { useCloudUserJson } from "@/lib/use-cloud-user-json";

type UseCloudTimeManagementRecordsResult = {
  timeManagementRecords: TimeManagementRecord[];
  setTimeManagementRecords: Dispatch<SetStateAction<TimeManagementRecord[]>>;
  ready: boolean;
  saving: boolean;
  error: string | null;
};

export function useCloudTimeManagementRecords(
  userId: string | undefined
): UseCloudTimeManagementRecordsResult {
  const { data, setData, ready, saving, error } = useCloudUserJson<TimeManagementRecord[]>({
    userId,
    table: "user_time_management_records",
    column: "records",
    initialValue: [],
    parse: parseStoredTimeManagementRecords,
  });

  return {
    timeManagementRecords: data,
    setTimeManagementRecords: setData,
    ready,
    saving,
    error,
  };
}
