# 中考冲刺

面向上海 2026 中考的备考 Web 应用：集**倒计时**、**错题本**、**学习诊断**、**学科知识库**与 **AI 助手**于一体。基于 Next.js（App Router）构建，支持 Web（Vercel）部署，并可通过 Capacitor 打包为 Android App，同时是一个可离线使用的 PWA。

## 功能特性

- **中考倒计时**：醒目的天数倒计时，支持「专注模式」沉浸式备考，每日附带情绪鼓励语。
- **智能错题本**：录入错题、上传题目图片，调用通义千问视觉模型（`qwen-vl-max`）自动识别题目、归纳知识点。
- **学科知识库**：内置语文、数学、英语、物理、化学、历史、道法等多学科结构化知识点（`lib/*-knowledge*`），并标注考频。
- **道法 AI 助手**：基于 RAG（Embedding + 向量检索）的道法答疑，知识来源于教材切片（`daofa_chunks.json` / Supabase 向量表）。
- **学习诊断仪表盘**：基于错题、成绩与时间管理数据生成可视化分析（Recharts）。
- **成绩统计与时间管理**：记录模拟考成绩、答题耗时，按学科/考试维度统计。
- **打印 / 导出**：错题复习卷、练习卷一键打印，支持错题导出。
- **多端与离线**：响应式布局、深浅色主题（next-themes）、Service Worker 离线缓存、Android App 打包。
- **云端同步**：可选接入 Supabase，登录后将错题、成绩、时间管理记录同步到云端（多设备）。

## 技术栈

- **框架**：[Next.js 16](https://nextjs.org)（App Router）+ React 19 + TypeScript
- **样式**：Tailwind CSS v4、next-themes
- **数据 / 后端**：Next.js API Routes、[Supabase](https://supabase.com)（Auth + Postgres + pgvector）
- **AI**：通义千问 DashScope（OpenAI 兼容模式）—— 文本 `qwen-plus`、视觉 `qwen-vl-max`、Embedding `text-embedding-v2`
- **数学公式**：KaTeX + remark-math / rehype-katex
- **图表**：Recharts
- **移动端**：Capacitor（Android）

## 快速开始

### 环境要求

- Node.js 20+
- npm
- （可选）Python 3，用于从 docx/pdf 提取知识点的脚本

### 安装与运行

```bash
npm install
npm run dev
```

在浏览器打开 [http://127.0.0.1:3000](http://127.0.0.1:3000) 查看。

### 环境变量

复制 `.env.example` 为 `.env.local` 并填写：

```bash
cp .env.example .env.local
```

| 变量 | 说明 | 必需 |
| --- | --- | --- |
| `QWEN_API_KEY` | 通义千问 DashScope API Key（错题分析、道法助手） | AI 功能必需 |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 项目 URL | 云端同步 / 道法 RAG 必需 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase 匿名 Key（浏览器端登录） | 云端同步必需 |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Service Role Key（服务端，绕过 RLS） | 道法向量检索 / 上传脚本必需 |
| `ALLOWED_ORIGINS` | CORS 白名单（逗号分隔），移动端需包含 `https://localhost` | 可选 |
| `NEXT_PUBLIC_API_BASE_URL` | 后端 API 基础地址；Web 同源可留空，移动端需指向已部署后端 | 移动端必需 |

> 不配置 Supabase 时，应用仍可运行，数据保存在浏览器本地（localStorage）。

## 数据库初始化（Supabase）

在 Supabase SQL Editor 中执行 `supabase-user-mistakes.sql`，创建用户错题、成绩、时间管理等数据表与触发器。道法 RAG 需额外建立带 `pgvector` 的 `daofa_chunks` 表及匹配函数（embedding 维度 1536）。

导入道法知识切片向量：

```bash
npm run upload:daofa:test   # 仅上传前 10 条，验证配置
npm run upload:daofa        # 全量上传
```

## 可用脚本

| 命令 | 说明 |
| --- | --- |
| `npm run dev` | 启动开发服务器（127.0.0.1:3000） |
| `npm run build` | 构建 Web 生产包 |
| `npm run start` | 启动生产服务器 |
| `npm run lint` | ESLint 检查 |
| `npm run build:mobile` | 静态导出并同步到 Android（Capacitor） |
| `npm run open:android` | 打开 Android Studio 工程 |
| `npm run extract:math` / `extract:physics` | 从 docx 提取学科知识点（Python） |
| `npm run upload:daofa[:test\|:resume]` | 生成 Embedding 并上传道法切片到 Supabase |

## 项目结构

```
app/                 # 页面、布局与 API Routes
  api/analyze-error/ # 错题图片分析（qwen-vl-max）
  api/chat/daofa/    # 道法 RAG 答疑
components/          # UI 组件（倒计时、错题本、知识面板、诊断仪表盘等）
lib/                 # 业务逻辑、知识库 JSON、Supabase 客户端、Hooks
scripts/             # 知识点提取与向量上传脚本
public/              # 静态资源、PWA（manifest、sw.js、图标）
android/             # Capacitor Android 工程
```

## 部署

### Web（Vercel）

直接连接仓库部署。保持 API Routes 模式（**不要**设置 `NEXT_BUILD_MODE=mobile`），并在 Vercel 配置上述环境变量。

### Android（Capacitor）

```bash
npm run build:mobile
npm run open:android
```

移动端为静态导出，必须配置 `NEXT_PUBLIC_API_BASE_URL` 指向已部署的 Web 后端，否则 AI 与同步请求会失败。

## 备注

- 应用为 PWA，支持离线访问（见 `public/sw.js` 与 `app/manifest.ts`）。
- 默认面向上海 2026 中考，倒计时目标日期与学科设置可在相关组件 / `lib` 配置中调整。
