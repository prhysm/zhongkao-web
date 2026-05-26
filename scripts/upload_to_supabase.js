#!/usr/bin/env node
/**
 * 读取 daofa_chunks.json，生成 Embedding 并批量写入 Supabase daofa_chunks 表。
 *
 * 运行：
 *   npm run upload:daofa:test          # 仅 10 条
 *   npm run upload:daofa               # 全量
 *   UPLOAD_OFFSET=65 npm run upload:daofa   # 从第 66 条起续传（0-based）
 *
 * 环境变量见项目 README 或脚本内 loadEnvFiles 说明。
 */

const fs = require("fs");
const path = require("path");
const OpenAI = require("openai");
const { createClient } = require("@supabase/supabase-js");

const ROOT = path.join(__dirname, "..");
const CHUNKS_PATH = path.join(ROOT, "daofa_chunks.json");
const BATCH_SIZE = 5;
const SLEEP_MS = 1000;
/** 与 Supabase daofa_chunks.embedding vector(N) 一致 */
const EXPECTED_EMBEDDING_DIM = parseInt(
  process.env.EMBEDDING_DIMENSIONS || "1536",
  10,
);

function loadEnvFiles() {
  for (const name of [".env.local", ".env"]) {
    const filePath = path.join(ROOT, name);
    if (!fs.existsSync(filePath)) continue;
    const text = fs.readFileSync(filePath, "utf8");
    for (const line of text.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq <= 0) continue;
      const key = trimmed.slice(0, eq).trim();
      let value = trimmed.slice(eq + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (process.env[key] === undefined) {
        process.env[key] = value;
      }
    }
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * 清洗写入数据库的文本，避免 PostgreSQL「unsupported Unicode escape sequence」。
 * - 去掉 NUL 及其它 C0 控制符（保留 \\n \\r \\t）
 * - 去掉孤立反斜杠（\\ 后非合法转义时）
 */
function sanitizeText(value) {
  if (typeof value !== "string") return "";
  let text = value.replace(/\u0000/g, "");
  text = text.replace(/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/g, "");
  text = text.replace(/\\(?![nrt"'\\uU])/g, "");
  return text.replace(/\s+/g, (m) => (m.includes("\n") ? m : " ")).trim();
}

function getEmbeddingClient() {
  const apiKey =
    process.env.EMBEDDING_API_KEY?.trim() ||
    process.env.QWEN_API_KEY?.trim() ||
    process.env.OPENAI_API_KEY?.trim();

  if (!apiKey) {
    throw new Error(
      "未配置 Embedding API 密钥，请在 .env 中设置 EMBEDDING_API_KEY、QWEN_API_KEY 或 OPENAI_API_KEY",
    );
  }

  const explicitBase = process.env.EMBEDDING_BASE_URL?.trim();
  const openaiKey = process.env.OPENAI_API_KEY?.trim();
  const qwenKey = process.env.QWEN_API_KEY?.trim();

  let baseURL = explicitBase;
  if (!baseURL) {
    if (openaiKey && apiKey === openaiKey && !qwenKey) {
      baseURL = undefined;
    } else {
      baseURL = "https://dashscope.aliyuncs.com/compatible-mode/v1";
    }
  }

  const options = { apiKey };
  if (baseURL) options.baseURL = baseURL;
  return new OpenAI(options);
}

function getSupabaseClient() {
  const url =
    process.env.SUPABASE_URL?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!url) {
    throw new Error("未配置 SUPABASE_URL 或 NEXT_PUBLIC_SUPABASE_URL");
  }
  if (!serviceKey) {
    throw new Error("未配置 SUPABASE_SERVICE_ROLE_KEY（批量写入需 Service Role）");
  }

  return createClient(url, serviceKey);
}

async function createEmbedding(client, text, model) {
  const input = sanitizeText(text);
  if (!input) {
    throw new Error("content 清洗后为空，无法生成 embedding");
  }

  const response = await client.embeddings.create({
    model,
    input,
  });

  const embedding = response.data?.[0]?.embedding;
  if (!Array.isArray(embedding) || embedding.length === 0) {
    throw new Error("Embedding API 返回为空");
  }
  if (embedding.length !== EXPECTED_EMBEDDING_DIM) {
    throw new Error(
      `向量维度 ${embedding.length} 与表定义 ${EXPECTED_EMBEDDING_DIM} 不一致，请检查 EMBEDDING_MODEL / EMBEDDING_DIMENSIONS`,
    );
  }
  return embedding;
}

async function insertOne(supabase, row) {
  const { error } = await supabase.from("daofa_chunks").insert([row]);
  if (error) {
    throw new Error(error.message);
  }
}

async function insertBatch(supabase, rows) {
  if (rows.length === 0) return { inserted: 0, skipped: [] };

  const { error } = await supabase.from("daofa_chunks").insert(rows);
  if (!error) {
    return { inserted: rows.length, skipped: [] };
  }

  if (rows.length === 1) {
    throw new Error(`Supabase 插入失败: ${error.message}`);
  }

  console.warn(`批量插入失败（${error.message}），改为逐条重试…`);
  let inserted = 0;
  const skipped = [];

  for (const row of rows) {
    try {
      await insertOne(supabase, row);
      inserted += 1;
    } catch (oneErr) {
      skipped.push({
        book_title: row.book_title,
        page_number: row.page_number,
        reason: oneErr.message,
      });
      console.warn(
        `  跳过 page=${row.page_number} «${row.chapter_name?.slice(0, 20)}…»: ${oneErr.message}`,
      );
    }
  }

  return { inserted, skipped };
}

function buildRow(item, embedding) {
  const content = sanitizeText(item.content);
  return {
    book_title: sanitizeText(item.book_title ?? ""),
    chapter_name: sanitizeText(item.chapter_name ?? ""),
    page_number: item.page_number ?? null,
    content,
    embedding,
  };
}

async function main() {
  loadEnvFiles();

  const model =
    process.env.EMBEDDING_MODEL?.trim() || "text-embedding-v2";
  const limitRaw = process.env.UPLOAD_LIMIT?.trim();
  const limit = limitRaw ? Math.max(1, parseInt(limitRaw, 10)) : Infinity;
  const offset = Math.max(
    0,
    parseInt(process.env.UPLOAD_OFFSET?.trim() || "0", 10) || 0,
  );

  if (!fs.existsSync(CHUNKS_PATH)) {
    throw new Error(`未找到 ${CHUNKS_PATH}，请先运行 scripts/parse_all_pdfs.py`);
  }

  const raw = fs.readFileSync(CHUNKS_PATH, "utf8");
  const chunks = JSON.parse(raw);
  if (!Array.isArray(chunks)) {
    throw new Error("daofa_chunks.json 格式错误：根节点应为数组");
  }

  const embeddingClient = getEmbeddingClient();
  const supabase = getSupabaseClient();

  const end = Math.min(chunks.length, offset + limit);
  const total = end - offset;

  console.log(`共 ${chunks.length} 条，本次处理 ${total} 条（从索引 ${offset} 起）`);
  console.log(`Embedding 模型: ${model}（${EXPECTED_EMBEDDING_DIM} 维）`);
  console.log(`每 ${BATCH_SIZE} 条暂停 ${SLEEP_MS}ms\n`);

  let inserted = 0;
  let skippedCount = 0;
  let batchRows = [];
  const allSkipped = [];

  for (let i = offset; i < end; i += 1) {
    const item = chunks[i];
    const content = sanitizeText(
      typeof item.content === "string" ? item.content : "",
    );

    if (!content) {
      console.warn(`[${i + 1}/${chunks.length}] 跳过：content 为空`);
      skippedCount += 1;
      continue;
    }

    let embedding;
    try {
      embedding = await createEmbedding(embeddingClient, content, model);
    } catch (embedErr) {
      skippedCount += 1;
      allSkipped.push({ index: i, reason: embedErr.message });
      console.warn(`[${i + 1}] Embedding 失败，已跳过: ${embedErr.message}`);
      continue;
    }

    batchRows.push(buildRow({ ...item, content }, embedding));

    if (batchRows.length >= BATCH_SIZE) {
      const result = await insertBatch(supabase, batchRows);
      inserted += result.inserted;
      skippedCount += result.skipped.length;
      allSkipped.push(...result.skipped);
      console.log(`已写入 ${inserted} 条（当前进度索引 ${i}）`);
      batchRows = [];
      await sleep(SLEEP_MS);
    }
  }

  if (batchRows.length > 0) {
    const result = await insertBatch(supabase, batchRows);
    inserted += result.inserted;
    skippedCount += result.skipped.length;
    allSkipped.push(...result.skipped);
    console.log(`已写入 ${inserted} 条（最后一批）`);
  }

  console.log(`\n完成：成功插入 ${inserted} 条，跳过 ${skippedCount} 条`);
  if (allSkipped.length > 0) {
    const logPath = path.join(ROOT, "daofa_upload_skipped.json");
    fs.writeFileSync(logPath, JSON.stringify(allSkipped, null, 2), "utf8");
    console.log(`跳过详情已写入 ${logPath}`);
  }
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
