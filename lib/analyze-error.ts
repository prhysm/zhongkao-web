export type AnalyzeErrorResult = {
  extracted_text: string;
  knowledge_points: string[];
  error_reason: string;
  solution_technique: string;
};

export type AnalyzeErrorRequestBody = {
  imageUrl: string;
  availableKnowledgePoints: string[];
};

const ANALYZE_ERROR_RESPONSE_SCHEMA_NAME = "mistake_error_analysis";

export function buildAnalyzeErrorJsonSchema(availableKnowledgePoints: string[]) {
  const uniquePoints = [...new Set(availableKnowledgePoints.map((item) => item.trim()).filter(Boolean))];

  return {
    name: ANALYZE_ERROR_RESPONSE_SCHEMA_NAME,
    strict: true,
    schema: {
      type: "object",
      additionalProperties: false,
      properties: {
        extracted_text: {
          type: "string",
          description: "从题目图片中识别出的原始文字，尽量完整保留题面表述。",
        },
        knowledge_points: {
          type: "array",
          description: "从给定知识点列表中挑选的 1-3 个最匹配项。",
          minItems: 1,
          maxItems: 3,
          items: {
            type: "string",
            enum: uniquePoints,
          },
        },
        error_reason: {
          type: "string",
          description: "学生容易犯错的点或本题常见错误原因，语言平实易懂。",
        },
        solution_technique: {
          type: "string",
          description: "针对本题的解题技巧与提醒，便于初中生理解与复盘。",
        },
      },
      required: ["extracted_text", "knowledge_points", "error_reason", "solution_technique"],
    },
  } as const;
}

export function normalizeVisionImageUrl(imageUrl: string): string {
  const trimmed = imageUrl.trim();
  if (!trimmed) {
    throw new Error("imageUrl 不能为空");
  }

  if (
    trimmed.startsWith("data:image/") ||
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://")
  ) {
    return trimmed;
  }

  return `data:image/jpeg;base64,${trimmed}`;
}

export function sanitizeKnowledgePoints(
  knowledgePoints: unknown,
  allowedPoints: string[]
): string[] {
  const allowed = new Set(allowedPoints);
  if (!Array.isArray(knowledgePoints)) return [];

  const picked: string[] = [];
  for (const item of knowledgePoints) {
    if (typeof item !== "string") continue;
    const normalized = item.trim();
    if (!normalized || !allowed.has(normalized)) continue;
    if (!picked.includes(normalized)) picked.push(normalized);
    if (picked.length >= 3) break;
  }
  return picked;
}

export function parseAnalyzeErrorResult(
  raw: string,
  allowedPoints: string[]
): AnalyzeErrorResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("模型返回内容不是合法 JSON");
  }

  if (!parsed || typeof parsed !== "object") {
    throw new Error("模型返回 JSON 结构无效");
  }

  const record = parsed as Record<string, unknown>;
  const extractedText = typeof record.extracted_text === "string" ? record.extracted_text.trim() : "";
  const errorReason = typeof record.error_reason === "string" ? record.error_reason.trim() : "";
  const solutionTechnique =
    typeof record.solution_technique === "string" ? record.solution_technique.trim() : "";
  const knowledgePoints = sanitizeKnowledgePoints(record.knowledge_points, allowedPoints);

  if (!extractedText) throw new Error("缺少 extracted_text 字段");
  if (knowledgePoints.length === 0) throw new Error("knowledge_points 必须包含 1-3 个有效知识点");
  if (!errorReason) throw new Error("缺少 error_reason 字段");
  if (!solutionTechnique) throw new Error("缺少 solution_technique 字段");

  return {
    extracted_text: extractedText,
    knowledge_points: knowledgePoints,
    error_reason: errorReason,
    solution_technique: solutionTechnique,
  };
}

export const ANALYZE_ERROR_SYSTEM_PROMPT = `你是一位耐心且经验丰富的初中教师，擅长帮学生整理错题。
请根据题目图片完成错题分析，语言平实、易懂，避免堆砌艰深术语。
你必须严格按照 JSON 格式输出结果。
knowledge_points 只能从用户提供的知识点列表中挑选 1-3 个最匹配的条目，不得自造列表外的知识点。`;
