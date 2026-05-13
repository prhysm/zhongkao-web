"use client";

import { useCallback, useEffect, useRef, useState, type Dispatch, type SetStateAction } from "react";
import { getBrowserSupabase } from "@/lib/supabase/client";

export type UseCloudUserJsonResult<T> = {
  data: T;
  setData: Dispatch<SetStateAction<T>>;
  ready: boolean;
  saving: boolean;
  error: string | null;
};

type UseCloudUserJsonOptions<T> = {
  userId: string | undefined;
  table: string;
  column: string;
  initialValue: T;
  parse: (raw: string) => T;
  debounceMs?: number;
};

export function useCloudUserJson<T>({
  userId,
  table,
  column,
  initialValue,
  parse,
  debounceMs = 450,
}: UseCloudUserJsonOptions<T>): UseCloudUserJsonResult<T> {
  const [stableInitialValue] = useState(initialValue);
  const [data, setDataState] = useState<T>(() => stableInitialValue);
  const [loadedUserId, setLoadedUserId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const saveTimerRef = useRef<number | null>(null);
  const lastSerializedRef = useRef<string | null>(null);

  useEffect(() => {
    if (saveTimerRef.current) {
      window.clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }

    lastSerializedRef.current = null;

    if (!userId) return;

    const supabase = getBrowserSupabase();
    if (!supabase) {
      queueMicrotask(() => {
        setDataState(stableInitialValue);
        setError("Supabase 未配置");
        setLoadedUserId(userId);
      });
      return;
    }

    let cancelled = false;

    void (async () => {
      const { data: row, error: loadError } = await supabase
        .from(table)
        .select(column)
        .eq("user_id", userId)
        .maybeSingle();

      if (cancelled) return;

      if (loadError) {
        setError(loadError.message);
        setDataState(stableInitialValue);
        setLoadedUserId(userId);
        return;
      }

      const record = (row as Record<string, unknown> | null) ?? null;
      const serialized = JSON.stringify(record?.[column] ?? stableInitialValue);
      setDataState(parse(serialized));
      lastSerializedRef.current = serialized;
      setError(null);
      setLoadedUserId(userId);
    })();

    return () => {
      cancelled = true;
    };
  }, [column, parse, stableInitialValue, table, userId]);

  const persist = useCallback(
    async (nextValue: T) => {
      if (!userId) return;

      const supabase = getBrowserSupabase();
      if (!supabase) {
        setError("Supabase 未配置");
        return;
      }

      const serialized = JSON.stringify(nextValue);
      if (serialized === lastSerializedRef.current) return;

      setSaving(true);
      setError(null);

      const payload = {
        user_id: userId,
        [column]: nextValue,
      } as Record<string, unknown>;

      const { error: upsertError } = await supabase.from(table).upsert(payload, { onConflict: "user_id" });

      if (upsertError) {
        setError(upsertError.message);
      } else {
        lastSerializedRef.current = serialized;
      }

      setSaving(false);
    },
    [column, table, userId]
  );

  const schedulePersist = useCallback(
    (nextValue: T) => {
      if (!userId) return;
      if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
      saveTimerRef.current = window.setTimeout(() => {
        void persist(nextValue);
      }, debounceMs);
    },
    [debounceMs, persist, userId]
  );

  const setData = useCallback<Dispatch<SetStateAction<T>>>(
    (action) => {
      setDataState((prev) => {
        const nextValue = typeof action === "function" ? (action as (value: T) => T)(prev) : action;
        schedulePersist(nextValue);
        return nextValue;
      });
    },
    [schedulePersist]
  );

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    };
  }, []);

  const ready = !userId || loadedUserId === userId;
  const visibleData = userId && loadedUserId === userId ? data : stableInitialValue;
  const visibleSaving = userId && loadedUserId === userId ? saving : false;
  const visibleError = userId && loadedUserId === userId ? error : null;

  return {
    data: visibleData,
    setData,
    ready,
    saving: visibleSaving,
    error: visibleError,
  };
}
