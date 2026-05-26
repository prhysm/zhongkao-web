import OpenAI from "openai";
import daofaChunksJson from "@/daofa_chunks.json";
import { getServiceSupabase } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 60;

const QWEN_BASE_URL = "https://dashscope.aliyuncs.com/compatible-mode/v1";
const EMBEDDING_MODEL = "text-embedding-v2";
const CHAT_MODEL = "qwen-plus";
const EMBEDDING_DIMENSIONS = 1536;
const MATCH_THRESHOLD = 0.62;
const MATCH_COUNT = 6;
const LOCAL_FALLBACK_COUNT = 6;

const REFUSAL_LINE =
  "请把注意力收回来，答案常常就在下一步里，让我们聚焦道法知识。";

type DaofaChunkMatch = {
  book_title: string;
  chapter_name: string;
  page_number: number | null;
  content: string;
  similarity?: number;
};

const daofaChunks = daofaChunksJson as DaofaChunkMatch[];

function getQwenApiKey(): string {
  const apiKey =
    process.env.QWEN_API_KEY?.trim() ||
    process.env.EMBEDDING_API_KEY?.trim() ||
    process.env.OPENAI_API_KEY?.trim();

  if (!apiKey) {
    throw new Error("服务端未配置 QWEN_API_KEY 环境变量");
  }
  return apiKey;
}

function getOpenAIClient(): OpenAI {
  return new OpenAI({
    apiKey: getQwenApiKey(),
    baseURL: QWEN_BASE_URL,
  });
}

async function embedQuestion(client: OpenAI, question: string): Promise<number[]> {
  const response = await client.embeddings.create({
    model: EMBEDDING_MODEL,
    input: question,
  });

  const embedding = response.data[0]?.embedding;
  if (!Array.isArray(embedding) || embedding.length !== EMBEDDING_DIMENSIONS) {
    throw new Error(
      `Embedding 维度异常：期望 ${EMBEDDING_DIMENSIONS}，实际 ${embedding?.length ?? 0}`,
    );
  }

  return embedding;
}

async function retrieveChunks(embedding: number[]): Promise<DaofaChunkMatch[]> {
  const supabase = getServiceSupabase();

  const { data, error } = await supabase.rpc("match_daofa_chunks", {
    query_embedding: embedding,
    match_threshold: MATCH_THRESHOLD,
    match_count: MATCH_COUNT,
  });

  if (error) {
    throw new Error(`教材检索失败: ${error.message}`);
  }

  return (data ?? []) as DaofaChunkMatch[];
}

function normalizeSearchText(value: string): string {
  return value
    .toLowerCase()
    .replace(/[，。！？；：“”‘’"'、（）()《》【】\[\]\s]/g, "");
}

function extractQuotedTerms(question: string): string[] {
  const terms: string[] = [];
  const patterns = [/“([^”]+)”/g, /"([^"]+)"/g, /《([^》]+)》/g, /【([^】]+)】/g];

  for (const pattern of patterns) {
    for (const match of question.matchAll(pattern)) {
      const term = match[1]?.trim();
      if (term && term.length >= 2) terms.push(term);
    }
  }

  return terms;
}

function extractSearchTerms(question: string): string[] {
  const stopWords = [
    "为我",
    "帮我",
    "整理",
    "教材",
    "中",
    "相关",
    "关于",
    "知识点",
    "道法",
    "道德与法治",
    "哪些",
    "什么",
    "如何",
    "请",
  ];
  const cleaned = question.replace(/[“”"《》【】]/g, " ");
  const looseTerms = cleaned
    .split(/[，。！？；、\s]+/)
    .map((term) => term.trim())
    .filter((term) => term.length >= 2)
    .map((term) => {
      let next = term;
      for (const stopWord of stopWords) {
        next = next.replaceAll(stopWord, "");
      }
      return next.trim();
    })
    .filter((term) => term.length >= 2);

  return [...new Set([...extractQuotedTerms(question), ...looseTerms])];
}

function retrieveLocalChunks(question: string): DaofaChunkMatch[] {
  const terms = extractSearchTerms(question);
  if (terms.length === 0) return [];

  const normalizedTerms = terms.map(normalizeSearchText).filter(Boolean);
  const scored = daofaChunks
    .map((chunk) => {
      const haystack = normalizeSearchText(
        `${chunk.book_title} ${chunk.chapter_name} ${chunk.content}`,
      );
      const score = normalizedTerms.reduce((sum, term) => {
        if (!term) return sum;
        if (haystack.includes(term)) return sum + term.length * 4;
        return sum;
      }, 0);

      return { chunk, score };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score);

  return scored.slice(0, LOCAL_FALLBACK_COUNT).map((item) => item.chunk);
}

function formatChunkLine(chunk: DaofaChunkMatch): string {
  const pageLabel =
    chunk.page_number != null ? `第${chunk.page_number}页` : "页码未知";
  return `[${chunk.book_title}-${chunk.chapter_name}-${pageLabel}] ${chunk.content}`;
}

function buildReferenceContext(chunks: DaofaChunkMatch[]): string {
  if (chunks.length === 0) {
    return "（未检索到相似度达标的教材段落。）";
  }
  return chunks.map(formatChunkLine).join("\n\n");
}

function buildSystemPrompt(referenceContext: string): string {
  return `你是一个极其严谨的初中道德与法治辅导老师。

你的唯一任务是解答与《道德与法治》相关的学术问题。如果用户提问与该学科无关（如闲聊、游戏、生活琐事），你必须严厉拒绝，并回复："${REFUSAL_LINE}"

只能依据我提供的【参考教材内容】作答，绝对不能自行编造。在回答末尾，必须标注知识点所在的教材和精确页码。

【参考教材内容】
${referenceContext}`;
}

function sseLine(payload: string): Uint8Array {
  return new TextEncoder().encode(`data: ${payload}\n\n`);
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
    const configError =
      error.message.includes("未配置") || error.message.includes("SUPABASE");
    return {
      status: configError ? 503 : 500,
      message: error.message,
    };
  }

  return { status: 500, message: "服务器内部错误" };
}

export async function POST(request: Request) {
  try {
    let body: { question?: unknown };
    try {
      body = (await request.json()) as { question?: unknown };
    } catch {
      return Response.json({ error: "请求体必须是合法 JSON" }, { status: 400 });
    }

    const question = typeof body.question === "string" ? body.question.trim() : "";
    if (!question) {
      return Response.json({ error: "缺少 question 参数" }, { status: 400 });
    }

    const client = getOpenAIClient();
    const embedding = await embedQuestion(client, question);
    const vectorChunks = await retrieveChunks(embedding);
    const chunks = vectorChunks.length > 0 ? vectorChunks : retrieveLocalChunks(question);
    const referenceContext = buildReferenceContext(chunks);
    const systemPrompt = buildSystemPrompt(referenceContext);

    const completionStream = await client.chat.completions.create({
      model: CHAT_MODEL,
      stream: true,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: question },
      ],
    });

    const readable = new ReadableStream<Uint8Array>({
      async start(controller) {
        try {
          for await (const chunk of completionStream) {
            const text = chunk.choices[0]?.delta?.content;
            if (text) {
              controller.enqueue(
                sseLine(JSON.stringify({ type: "content", content: text })),
              );
            }
          }
          controller.enqueue(sseLine("[DONE]"));
          controller.close();
        } catch (streamError) {
          const message =
            streamError instanceof Error ? streamError.message : "流式输出中断";
          controller.enqueue(
            sseLine(JSON.stringify({ type: "error", error: message })),
          );
          controller.close();
        }
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (error) {
    const mapped = mapUpstreamError(error);
    const status =
      mapped.status >= 400 && mapped.status < 600 ? mapped.status : 500;
    return Response.json({ error: mapped.message }, { status });
  }
}
