"use client";

import {
  Dispatch,
  SetStateAction,
  useCallback,
  useRef,
  useSyncExternalStore,
} from "react";

type UseLocalStorageOptions<T> = {
  /**
   * 自定义解析函数。默认使用 `JSON.parse`。
   * 适合在解析后顺手做一次结构校验（例如 `Array.isArray`），
   * 校验失败时返回安全的兜底值，避免脏数据让 UI 崩。
   */
  parse?: (raw: string) => T;
  /**
   * 自定义序列化函数。默认使用 `JSON.stringify`。
   */
  serialize?: (value: T) => string;
};

const isBrowser = typeof window !== "undefined";

/** 同一标签页内的订阅总线：`storage` 事件本身不会在写入侧触发，需要自己派发。 */
const sameTabListeners = new Map<string, Set<() => void>>();

function emitSameTab(key: string) {
  sameTabListeners.get(key)?.forEach((cb) => cb());
}

const noopSubscribe = () => () => {};
const clientHydrated = () => true;
const serverHydrated = () => false;

/**
 * 把状态同步到 `window.localStorage` 的通用 Hook。
 *
 * 实现上采用 React 18+ 的 `useSyncExternalStore`，把 LocalStorage 视作外部 store：
 * - **SSR / 首次渲染**：读不到 `window`，回退到 `initialValue`，不会抛异常；
 * - **客户端挂载后**：自动从 LocalStorage 取真值，不需要 `useEffect` + `setState` 二次渲染；
 * - **跨标签页同步**：监听 `storage` 事件；
 * - **同一标签页同步**：写入时手动 `emit`，让其他用到同一 key 的组件也立即更新；
 * - **错误兜底**：读 / 写 / 解析任一环节出错都不会抛出，只 `console.warn` 留痕，UI 走默认值。
 *
 * @returns `[value, setValue, hydrated]`
 *   - `value`：当前值；
 *   - `setValue`：用法与 `useState` 完全一致（支持函数式更新），写入会自动 `JSON.stringify`；
 *   - `hydrated`：是否已经在浏览器环境完成首次同步，方便组件渲染「加载中」占位。
 */
export function useLocalStorage<T>(
  key: string,
  initialValue: T | (() => T),
  options: UseLocalStorageOptions<T> = {}
): readonly [T, Dispatch<SetStateAction<T>>, boolean] {
  const { parse, serialize } = options;

  // 仅在第一次需要时计算 initialValue，并记录下来供后续 fallback 复用，避免每次渲染都重新计算。
  const defaultRef = useRef<{ resolved: boolean; value: T }>({
    resolved: false,
    value: undefined as unknown as T,
  });
  const getDefault = useCallback((): T => {
    if (!defaultRef.current.resolved) {
      defaultRef.current.value =
        typeof initialValue === "function" ? (initialValue as () => T)() : initialValue;
      defaultRef.current.resolved = true;
    }
    return defaultRef.current.value;
  }, [initialValue]);

  // 缓存最近一次解析结果。`useSyncExternalStore` 要求 `getSnapshot` 在底层值未变时返回稳定引用，
  // 否则会触发无限渲染。这里用「原始字符串」做相等比较，相同则直接复用上次解析得到的对象。
  const snapshotCacheRef = useRef<{ raw: string | null; value: T } | null>(null);

  const getSnapshot = useCallback((): T => {
    if (!isBrowser) return getDefault();
    let raw: string | null;
    try {
      raw = window.localStorage.getItem(key);
    } catch (error) {
      console.warn(`[useLocalStorage] 读取 "${key}" 失败，使用默认值：`, error);
      return getDefault();
    }
    if (snapshotCacheRef.current && snapshotCacheRef.current.raw === raw) {
      return snapshotCacheRef.current.value;
    }
    let value: T;
    if (raw === null) {
      value = getDefault();
    } else {
      try {
        value = parse ? parse(raw) : (JSON.parse(raw) as T);
      } catch (error) {
        console.warn(`[useLocalStorage] 解析 "${key}" 失败，使用默认值：`, error);
        value = getDefault();
      }
    }
    snapshotCacheRef.current = { raw, value };
    return value;
  }, [key, parse, getDefault]);

  const getServerSnapshot = useCallback(() => getDefault(), [getDefault]);

  const subscribe = useCallback(
    (notify: () => void) => {
      if (!isBrowser) return () => {};
      let bucket = sameTabListeners.get(key);
      if (!bucket) {
        bucket = new Set();
        sameTabListeners.set(key, bucket);
      }
      bucket.add(notify);

      const onStorage = (event: StorageEvent) => {
        // event.key 为 null 表示 localStorage 被整个清空。
        if (event.storageArea !== window.localStorage) return;
        if (event.key === null || event.key === key) notify();
      };
      window.addEventListener("storage", onStorage);

      return () => {
        bucket?.delete(notify);
        window.removeEventListener("storage", onStorage);
      };
    },
    [key]
  );

  const value = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  // SSR 时返回 false，客户端挂载后切换到 true，方便上层渲染「正在加载数据...」之类的占位。
  const hydrated = useSyncExternalStore(noopSubscribe, clientHydrated, serverHydrated);

  const setValue = useCallback<Dispatch<SetStateAction<T>>>(
    (action) => {
      if (!isBrowser) return;
      const current = getSnapshot();
      const next =
        typeof action === "function" ? (action as (prev: T) => T)(current) : action;
      try {
        const payload = serialize ? serialize(next) : JSON.stringify(next);
        window.localStorage.setItem(key, payload);
        snapshotCacheRef.current = { raw: payload, value: next };
        emitSameTab(key);
      } catch (error) {
        console.warn(`[useLocalStorage] 写入 "${key}" 失败：`, error);
      }
    },
    [key, serialize, getSnapshot]
  );

  return [value, setValue, hydrated] as const;
}
