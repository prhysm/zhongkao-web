"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";
import { useAuth } from "@/lib/auth-context";
import { MISTAKE_STORAGE_KEY, parseStoredMistakes, type MistakeItem } from "@/lib/mistakes-model";
import {
  SCORE_STATS_STORAGE_KEY,
  TIME_MANAGEMENT_STORAGE_KEY,
  parseStoredScoreRecords,
  parseStoredTimeManagementRecords,
  type ScoreRecord,
  type TimeManagementRecord,
} from "@/lib/study-data";
import { useCloudMistakes } from "@/lib/use-cloud-mistakes";
import { useCloudScoreRecords } from "@/lib/use-cloud-score-records";
import { useCloudTimeManagementRecords } from "@/lib/use-cloud-time-management-records";
import { useLocalStorage } from "@/lib/useLocalStorage";

type StudyRecordsContextValue = {
  mistakes: MistakeItem[];
  setMistakes: Dispatch<SetStateAction<MistakeItem[]>>;
  mistakesMounted: boolean;
  timeManagementRecords: TimeManagementRecord[];
  setTimeManagementRecords: Dispatch<SetStateAction<TimeManagementRecord[]>>;
  timeRecordsMounted: boolean;
  scoreRecords: ScoreRecord[];
  setScoreRecords: Dispatch<SetStateAction<ScoreRecord[]>>;
  scoreRecordsMounted: boolean;
  configured: boolean;
  authLoading: boolean;
  usingCloudRecords: boolean;
  userEmail: string | null;
  saving: boolean;
  syncError: string | null;
  syncStatus: string;
};

const StudyRecordsContext = createContext<StudyRecordsContextValue | null>(null);

export function StudyRecordsProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading, configured } = useAuth();
  const [localMistakes, setLocalMistakes, localMistakesMounted] = useLocalStorage<MistakeItem[]>(
    MISTAKE_STORAGE_KEY,
    [],
    { parse: parseStoredMistakes }
  );
  const [localTimeManagementRecords, setLocalTimeManagementRecords, localTimeRecordsMounted] =
    useLocalStorage<TimeManagementRecord[]>(TIME_MANAGEMENT_STORAGE_KEY, [], {
      parse: parseStoredTimeManagementRecords,
    });
  const [localScoreRecords, setLocalScoreRecords, localScoreRecordsMounted] = useLocalStorage<ScoreRecord[]>(
    SCORE_STATS_STORAGE_KEY,
    [],
    { parse: parseStoredScoreRecords }
  );

  const {
    mistakes: cloudMistakes,
    setMistakes: setCloudMistakes,
    ready: cloudMistakesReady,
    saving: cloudMistakesSaving,
    error: cloudMistakesError,
  } = useCloudMistakes(user?.id);
  const {
    timeManagementRecords: cloudTimeManagementRecords,
    setTimeManagementRecords: setCloudTimeManagementRecords,
    ready: cloudTimeManagementRecordsReady,
    saving: cloudTimeManagementRecordsSaving,
    error: cloudTimeManagementRecordsError,
  } = useCloudTimeManagementRecords(user?.id);
  const {
    scoreRecords: cloudScoreRecords,
    setScoreRecords: setCloudScoreRecords,
    ready: cloudScoreRecordsReady,
    saving: cloudScoreRecordsSaving,
    error: cloudScoreRecordsError,
  } = useCloudScoreRecords(user?.id);

  const importedLocalDataForUserRef = useRef<{
    mistakes: string | null;
    timeManagementRecords: string | null;
    scoreRecords: string | null;
  }>({
    mistakes: null,
    timeManagementRecords: null,
    scoreRecords: null,
  });

  const usingCloudRecords = Boolean(user);
  const waitingForAuth = configured && authLoading;

  const mistakes = usingCloudRecords ? cloudMistakes : localMistakes;
  const setMistakes = usingCloudRecords ? setCloudMistakes : setLocalMistakes;
  const mistakesMounted = waitingForAuth ? false : usingCloudRecords ? cloudMistakesReady : localMistakesMounted;

  const timeManagementRecords = usingCloudRecords
    ? cloudTimeManagementRecords
    : localTimeManagementRecords;
  const setTimeManagementRecords = usingCloudRecords
    ? setCloudTimeManagementRecords
    : setLocalTimeManagementRecords;
  const timeRecordsMounted = waitingForAuth
    ? false
    : usingCloudRecords
      ? cloudTimeManagementRecordsReady
      : localTimeRecordsMounted;

  const scoreRecords = usingCloudRecords ? cloudScoreRecords : localScoreRecords;
  const setScoreRecords = usingCloudRecords ? setCloudScoreRecords : setLocalScoreRecords;
  const scoreRecordsMounted = waitingForAuth ? false : usingCloudRecords ? cloudScoreRecordsReady : localScoreRecordsMounted;

  useEffect(() => {
    if (!user?.id) {
      importedLocalDataForUserRef.current.mistakes = null;
      return;
    }
    if (!cloudMistakesReady || !localMistakesMounted) return;
    if (importedLocalDataForUserRef.current.mistakes === user.id) return;

    importedLocalDataForUserRef.current.mistakes = user.id;
    if (cloudMistakes.length > 0 || localMistakes.length === 0) return;
    setCloudMistakes(localMistakes);
  }, [
    cloudMistakes,
    cloudMistakesReady,
    localMistakes,
    localMistakesMounted,
    setCloudMistakes,
    user?.id,
  ]);

  useEffect(() => {
    if (!user?.id) {
      importedLocalDataForUserRef.current.timeManagementRecords = null;
      return;
    }
    if (!cloudTimeManagementRecordsReady || !localTimeRecordsMounted) return;
    if (importedLocalDataForUserRef.current.timeManagementRecords === user.id) return;

    importedLocalDataForUserRef.current.timeManagementRecords = user.id;
    if (cloudTimeManagementRecords.length > 0 || localTimeManagementRecords.length === 0) return;
    setCloudTimeManagementRecords(localTimeManagementRecords);
  }, [
    cloudTimeManagementRecords,
    cloudTimeManagementRecordsReady,
    localTimeManagementRecords,
    localTimeRecordsMounted,
    setCloudTimeManagementRecords,
    user?.id,
  ]);

  useEffect(() => {
    if (!user?.id) {
      importedLocalDataForUserRef.current.scoreRecords = null;
      return;
    }
    if (!cloudScoreRecordsReady || !localScoreRecordsMounted) return;
    if (importedLocalDataForUserRef.current.scoreRecords === user.id) return;

    importedLocalDataForUserRef.current.scoreRecords = user.id;
    if (cloudScoreRecords.length > 0 || localScoreRecords.length === 0) return;
    setCloudScoreRecords(localScoreRecords);
  }, [
    cloudScoreRecords,
    cloudScoreRecordsReady,
    localScoreRecords,
    localScoreRecordsMounted,
    setCloudScoreRecords,
    user?.id,
  ]);

  const syncError =
    cloudMistakesError
      ? `错题本：${cloudMistakesError}`
      : cloudTimeManagementRecordsError
        ? `时间管理：${cloudTimeManagementRecordsError}`
        : cloudScoreRecordsError
          ? `成绩统计：${cloudScoreRecordsError}`
          : null;
  const saving =
    usingCloudRecords &&
    (cloudMistakesSaving || cloudTimeManagementRecordsSaving || cloudScoreRecordsSaving);

  const syncStatus = useMemo(() => {
    if (!configured) {
      return "当前还是本地模式。配置 Supabase 后，不同学生登录会读取各自的错题、时间管理和成绩数据。";
    }
    if (authLoading) {
      return "正在检查登录状态...";
    }
    if (!user) {
      return "未登录时，学习数据仍保存在当前浏览器；登录后会自动切换到个人云端空间。";
    }
    if (syncError) {
      return `云端同步失败：${syncError}`;
    }
    if (saving) {
      return "正在同步你的学习数据到云端...";
    }
    return `已登录 ${user.email ?? "当前账号"}，错题、时间管理、成绩统计和学情诊断都会按账号隔离。`;
  }, [authLoading, configured, saving, syncError, user]);

  const value = useMemo<StudyRecordsContextValue>(
    () => ({
      mistakes,
      setMistakes,
      mistakesMounted,
      timeManagementRecords,
      setTimeManagementRecords,
      timeRecordsMounted,
      scoreRecords,
      setScoreRecords,
      scoreRecordsMounted,
      configured,
      authLoading,
      usingCloudRecords,
      userEmail: user?.email ?? null,
      saving,
      syncError,
      syncStatus,
    }),
    [
      authLoading,
      configured,
      mistakes,
      mistakesMounted,
      saving,
      scoreRecords,
      scoreRecordsMounted,
      setMistakes,
      setScoreRecords,
      setTimeManagementRecords,
      syncError,
      syncStatus,
      timeManagementRecords,
      timeRecordsMounted,
      user?.email,
      usingCloudRecords,
    ]
  );

  return <StudyRecordsContext.Provider value={value}>{children}</StudyRecordsContext.Provider>;
}

export function useStudyRecords(): StudyRecordsContextValue {
  const context = useContext(StudyRecordsContext);
  if (!context) {
    throw new Error("useStudyRecords must be used within StudyRecordsProvider");
  }
  return context;
}
