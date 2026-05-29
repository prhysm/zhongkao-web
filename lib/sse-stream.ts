/**
 * 基于 XMLHttpRequest 的 SSE 流式 POST 读取。
 *
 * 为什么不用 fetch + ReadableStream：
 * Android WebView（Capacitor）对 fetch 响应体的流式读取（response.body.getReader）
 * 支持不稳定，常常表现为 read() 永不返回 / 不增量刷新，导致界面一直加载没有输出。
 * XHR 的 onprogress 在 WebView 与桌面浏览器里都能可靠地增量拿到文本。
 */

export interface SsePostResult {
  status: number;
  ok: boolean;
  /** 非 2xx 时的原始响应文本，便于解析错误信息。 */
  rawText: string;
}

export function streamSsePost(
  url: string,
  body: unknown,
  onChunk: (textDelta: string) => void,
  options?: { signal?: AbortSignal },
): Promise<SsePostResult> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", url, true);
    xhr.setRequestHeader("Content-Type", "application/json");
    xhr.responseType = "text";

    let lastIndex = 0;

    const pump = () => {
      const text = xhr.responseText;
      if (text.length > lastIndex) {
        const delta = text.slice(lastIndex);
        lastIndex = text.length;
        // 仅在 2xx 时把数据当作流式内容回吐，错误响应留给调用方整体解析。
        if (xhr.status >= 200 && xhr.status < 300) {
          onChunk(delta);
        }
      }
    };

    xhr.onprogress = () => pump();

    xhr.onload = () => {
      pump();
      resolve({
        status: xhr.status,
        ok: xhr.status >= 200 && xhr.status < 300,
        rawText: xhr.responseText,
      });
    };

    xhr.onerror = () => reject(new Error("网络请求失败，请检查网络后重试。"));
    xhr.ontimeout = () => reject(new Error("请求超时，请稍后再试。"));
    xhr.onabort = () => reject(new DOMException("Aborted", "AbortError"));

    if (options?.signal) {
      if (options.signal.aborted) {
        xhr.abort();
        return;
      }
      options.signal.addEventListener("abort", () => xhr.abort(), { once: true });
    }

    xhr.send(JSON.stringify(body));
  });
}
