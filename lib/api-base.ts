import { Capacitor } from "@capacitor/core";

/**
 * 统一解析后端 API 的基础地址。
 *
 * - Web（Vercel）：页面与 API Routes 同源，返回空字符串走相对路径。
 * - 移动端（Capacitor 原生环境）：页面运行在 https://localhost，
 *   不存在本地 API Routes，返回 NEXT_PUBLIC_API_BASE_URL 指向已部署的后端。
 *
 * 只有在原生环境下才使用绝对地址，Web 端始终走相对路径，避免引入不必要的跨域。
 */
export function getApiBaseUrl(): string {
  if (!Capacitor.isNativePlatform()) {
    return "";
  }
  return (
    process.env.NEXT_PUBLIC_API_BASE_URL?.trim().replace(/\/$/, "") ?? ""
  );
}

/** 拼接 API base 与具体路径，path 需以 "/" 开头。 */
export function apiUrl(path: string): string {
  return `${getApiBaseUrl()}${path}`;
}
