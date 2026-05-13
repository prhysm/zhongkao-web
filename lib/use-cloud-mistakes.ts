"use client";

import { useCallback, useEffect, useRef, useState, type Dispatch, type SetStateAction } from "react";
import { getBrowserSupabase } from "@/lib/supabase/client";
import type { MistakeItem } from "@/lib/mistakes-model";
import { parseStoredMistakes } from "@/lib/mistakes-model";

type UseCloudMistakesResult = {
  mistakes: MistakeItem[];
  setMistakes: Dispatch<SetStateAction<MistakeItem[]>>;
  ready: boolean;
  saving: boolean;
  error: string | null;
};

/**
 * 将错题列表以 JSON 形式存到 `public.user_mistakes` 单行记录中（按 user_id 分用户）。
 * 写入做了轻量 debounce，避免频繁点击导致请求风暴。
 */
export function useCloudMistakes(userId: string | undefined): UseCloudMistakesResult {
  const [mistakes, setMistakesState] = useState<MistakeItem[]>([]);
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
        setMistakesState([]);
        setError("Supabase 未配置");
        setLoadedUserId(userId);
      });
      return;
    }

    let cancelled = false;

    void (async () => {
      const { data, error: loadError } = await supabase
        .from("user_mistakes")
        .select("mistakes")
        .eq("user_id", userId)
        .maybeSingle();

      if (cancelled) return;

      if (loadError) {
        setError(loadError.message);
        setMistakesState([]);
        setLoadedUserId(userId);
        return;
      }

      const serialized = JSON.stringify(data?.mistakes ?? []);
      setMistakesState(parseStoredMistakes(serialized));
      lastSerializedRef.current = serialized;
      setError(null);
      setLoadedUserId(userId);
    })();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  const persist = useCallback(
    async (rows: MistakeItem[]) => {
      if (!userId) return;

      const supabase = getBrowserSupabase();
      if (!supabase) {
        setError("Supabase 未配置");
        return;
      }

      const serialized = JSON.stringify(rows);
      if (serialized === lastSerializedRef.current) return;

      setSaving(true);
      setError(null);

      const { error: upsertError } = await supabase.from("user_mistakes").upsert(
        {
          user_id: userId,
          mistakes: rows,
        },
        { onConflict: "user_id" }
      );

      if (upsertError) {
        setError(upsertError.message);
      } else {
        lastSerializedRef.current = serialized;
      }

      setSaving(false);
    },
    [userId]
  );

  const schedulePersist = useCallback(
    (rows: MistakeItem[]) => {
      if (!userId) return;
      if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
      saveTimerRef.current = window.setTimeout(() => {
        void persist(rows);
      }, 450);
    },
    [persist, userId]
  );

  const setMistakes = useCallback<Dispatch<SetStateAction<MistakeItem[]>>>(
    (action) => {
      setMistakesState((prev) => {
        const next = typeof action === "function" ? (action as (p: MistakeItem[]) => MistakeItem[])(prev) : action;
        schedulePersist(next);
        return next;
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
  const visibleMistakes = userId && loadedUserId === userId ? mistakes : [];
  const visibleSaving = userId && loadedUserId === userId ? saving : false;
  const visibleError = userId && loadedUserId === userId ? error : null;

  return { mistakes: visibleMistakes, setMistakes, ready, saving: visibleSaving, error: visibleError };
}
