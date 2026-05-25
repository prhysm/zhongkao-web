import OpenAI from "openai";
import {
  ANALYZE_ERROR_SYSTEM_PROMPT,
  buildAnalyzeErrorJsonSchema,
  normalizeVisionImageUrl,
  parseAnalyzeErrorResult,
  type AnalyzeErrorRequestBody,
} from "@/lib/analyze-error";
import { corsPreflightResponse, jsonWithCors } from "@/lib/api-cors";

export const runtime = "nodejs";
export const maxDuration = 60;

const QWEN_BASE_URL = "https://dashscope.aliyuncs.com/compatible-mode/v1";
const QWEN_VL_MODEL = "qwen-vl-max";

function getOpenAIClient(): OpenAI {
  const apiKey = process.env.QWEN_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("服务端未配置 QWEN_API_KEY 环境变量");
  }

  return new OpenAI({
    apiKey,
    baseURL: QWEN_BASE_URL,
  });
}

function normalizeKnowledgePoints(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  return [...new Set(input.map((item) => (typeof item === "string" ? item.trim() : "")).filter(Boolean))];
}

function buildUserPrompt(availableKnowledgePoints: string[]): string {
  const numberedList = availableKnowledgePoints
    .map((point, index) => `${index + 1}. ${point}`)
    .join("\n");

  return `请分析这道错题图片，并严格按 JSON 格式返回结果。

可选知识点列表（knowledge_points 字段必须且只能从下列条目中挑选 1-3 个最匹配的）：
${numberedList}`;
}

function mapUpstreamError(error: unknown): { status: number; message: string } {
  if (error instanceof OpenAI.APIError) {
    if (error.status === 401) {
      return { status: 502, message: "通义千问 API 密钥无效或未授权" };
    }
    if (error.status === 429) {
      return { status: 429, message: "通义千问请求过于频繁，请稍后再试" };
    }
    return {
      status: error.status ?? 502,
      message: error.message || "通义千问服务调用失败",
    };
  }

  if (error instanceof Error) {
    return { status: 500, message: error.message };
  }

  return { status: 500, message: "服务器内部错误" };
}

export async function OPTIONS(request: Request) {
  return corsPreflightResponse(request);
}

export async function POST(request: Request) {
  try {
    let body: AnalyzeErrorRequestBody;
    try {
      body = (await request.json()) as AnalyzeErrorRequestBody;
    } catch {
      return jsonWithCors(request, { error: "请求体必须是合法 JSON" }, { status: 400 });
    }

    const imageUrl = typeof body.imageUrl === "string" ? body.imageUrl : "";
    const availableKnowledgePoints = normalizeKnowledgePoints(body.availableKnowledgePoints);

    if (!imageUrl.trim()) {
      return jsonWithCors(request, { error: "缺少 imageUrl 参数" }, { status: 400 });
    }

    if (availableKnowledgePoints.length === 0) {
      return jsonWithCors(
        request,
        { error: "availableKnowledgePoints 至少需要包含 1 个知识点" },
        { status: 400 }
      );
    }

    let visionImageUrl: string;
    try {
      visionImageUrl = normalizeVisionImageUrl(imageUrl);
    } catch (error) {
      const message = error instanceof Error ? error.message : "imageUrl 格式无效";
      return jsonWithCors(request, { error: message }, { status: 400 });
    }

    const client = getOpenAIClient();
    const jsonSchema = buildAnalyzeErrorJsonSchema(availableKnowledgePoints);

    const completion = await client.chat.completions.create({
      model: QWEN_VL_MODEL,
      messages: [
        { role: "system", content: ANALYZE_ERROR_SYSTEM_PROMPT },
        {
          role: "user",
          content: [
            { type: "text", text: buildUserPrompt(availableKnowledgePoints) },
            { type: "image_url", image_url: { url: visionImageUrl } },
          ],
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: jsonSchema,
      },
    });

    const rawContent = completion.choices[0]?.message?.content;
    if (!rawContent || typeof rawContent !== "string") {
      return jsonWithCors(request, { error: "模型未返回有效内容" }, { status: 502 });
    }

    let result;
    try {
      result = parseAnalyzeErrorResult(rawContent, availableKnowledgePoints);
    } catch (error) {
      const message = error instanceof Error ? error.message : "模型 JSON 解析失败";
      return jsonWithCors(request, { error: message }, { status: 502 });
    }

    return jsonWithCors(request, { data: result });
  } catch (error) {
    const mapped = mapUpstreamError(error);
    const status = mapped.status >= 400 && mapped.status < 600 ? mapped.status : 500;
    return jsonWithCors(request, { error: mapped.message }, { status });
  }
}
