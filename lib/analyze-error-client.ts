import type { AnalyzeErrorRequestBody, AnalyzeErrorResult } from "@/lib/analyze-error";

type AnalyzeErrorApiSuccess = {
  data: AnalyzeErrorResult;
};

type AnalyzeErrorApiFailure = {
  error?: string;
};

function getAnalyzeErrorEndpoint(): string {
  const base = process.env.NEXT_PUBLIC_ANALYZE_ERROR_API_URL?.trim().replace(/\/$/, "") ?? "";
  return `${base}/api/analyze-error`;
}

export async function requestAnalyzeError(
  payload: AnalyzeErrorRequestBody,
  options?: { signal?: AbortSignal }
): Promise<AnalyzeErrorResult> {
  const response = await fetch(getAnalyzeErrorEndpoint(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    signal: options?.signal,
  });

  let body: AnalyzeErrorApiSuccess | AnalyzeErrorApiFailure | null = null;
  try {
    body = (await response.json()) as AnalyzeErrorApiSuccess | AnalyzeErrorApiFailure;
  } catch {
    body = null;
  }

  if (!response.ok) {
    const message =
      body && "error" in body && typeof body.error === "string" && body.error.trim()
        ? body.error
        : `题目分析失败（${response.status}）`;
    throw new Error(message);
  }

  if (!body || !("data" in body) || !body.data) {
    throw new Error("题目分析返回数据无效");
  }

  return body.data;
}
