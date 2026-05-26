"use client";

import { FormEvent, useEffect, useRef, useState } from "react";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

function parseSsePayloads(buffer: string): { payloads: string[]; rest: string } {
  const blocks = buffer.split(/\n\n/);
  const rest = blocks.pop() ?? "";
  const payloads = blocks
    .flatMap((block) =>
      block
        .split(/\n/)
        .filter((line) => line.startsWith("data:"))
        .map((line) => line.slice(5).trimStart()),
    )
    .filter(Boolean);

  return { payloads, rest };
}

function extractContent(payload: string): string {
  if (payload === "[DONE]") return "";

  try {
    const data = JSON.parse(payload) as { type?: string; content?: unknown; error?: unknown };
    if (data.type === "error") {
      throw new Error(typeof data.error === "string" ? data.error : "助教响应中断，请稍后再试。");
    }
    return typeof data.content === "string" ? data.content : "";
  } catch (error) {
    if (error instanceof SyntaxError) return payload;
    throw error;
  }
}

export function DaofaAssistant() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content: "你好，我是道法专属助教。可以问我教材知识点、答题角度或易混概念。",
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages]);

  const appendAssistantContent = (content: string) => {
    if (!content) return;

    setMessages((prev) => {
      const next = [...prev];
      const last = next[next.length - 1];

      if (last?.role === "assistant") {
        next[next.length - 1] = { ...last, content: last.content + content };
      } else {
        next.push({ role: "assistant", content });
      }

      return next;
    });
  };

  const handleClear = () => {
    if (isLoading) return;
    setMessages([]);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const question = input.trim();
    if (!question || isLoading) return;

    setInput("");
    setIsLoading(true);
    setIsMobileOpen(true);
    setMessages((prev) => [...prev, { role: "user", content: question }, { role: "assistant", content: "" }]);

    try {
      const response = await fetch("/api/chat/daofa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
      });

      if (!response.ok) {
        const errorBody = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(errorBody?.error ?? "助教暂时无法回答，请稍后再试。");
      }

      if (!response.body) {
        throw new Error("浏览器未收到流式响应。");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const parsed = parseSsePayloads(buffer);
        buffer = parsed.rest;

        for (const payload of parsed.payloads) {
          appendAssistantContent(extractContent(payload));
        }
      }

      buffer += decoder.decode();
      const parsed = parseSsePayloads(`${buffer}\n\n`);
      for (const payload of parsed.payloads) {
        appendAssistantContent(extractContent(payload));
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "助教响应失败，请稍后再试。";
      appendAssistantContent(`\n\n${message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <aside className="print:hidden lg:sticky lg:top-3 lg:flex lg:h-[calc(100vh-11rem)] lg:min-h-[520px] lg:w-[34%] lg:max-w-[34%] lg:shrink-0">
      <div className="fixed inset-x-3 bottom-3 z-30 lg:static lg:z-auto lg:flex lg:h-full lg:w-full">
        <section className="flex max-h-[72vh] flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm lg:h-full lg:max-h-none lg:w-full">
          <header className="flex shrink-0 items-center justify-between gap-3 border-b border-gray-100 px-4 py-3">
            <button
              type="button"
              onClick={() => setIsMobileOpen((prev) => !prev)}
              className="min-w-0 flex-1 text-left text-sm font-semibold text-gray-900 lg:pointer-events-none"
              aria-expanded={isMobileOpen}
            >
              ✨ 道法专属助教
            </button>
            <button
              type="button"
              onClick={handleClear}
              disabled={isLoading || messages.length === 0}
              className="shrink-0 rounded-full border border-gray-200 px-3 py-1 text-xs font-medium text-gray-500 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-45"
            >
              清空对话
            </button>
          </header>

          <div className={`${isMobileOpen ? "flex" : "hidden"} min-h-0 flex-1 flex-col lg:flex`}>
            <div ref={scrollRef} className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4">
              {messages.length === 0 ? (
                <p className="rounded-xl border border-dashed border-gray-200 px-4 py-8 text-center text-sm text-gray-500">
                  对话已清空。可以继续提问道法知识点。
                </p>
              ) : (
                messages.map((message, index) => (
                  <div
                    key={`${message.role}-${index}`}
                    className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[86%] whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 text-sm leading-6 ${
                        message.role === "user"
                          ? "bg-gray-100 text-gray-900"
                          : "bg-sky-50/70 text-gray-700"
                      }`}
                    >
                      {message.content || (isLoading && message.role === "assistant" ? "正在查教材..." : "")}
                    </div>
                  </div>
                ))
              )}
            </div>

            <form onSubmit={handleSubmit} className="shrink-0 border-t border-gray-100 bg-white p-3">
              <div className="flex items-end gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 shadow-sm focus-within:border-gray-300">
                <textarea
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault();
                      event.currentTarget.form?.requestSubmit();
                    }
                  }}
                  rows={1}
                  placeholder="问一个道法知识点..."
                  className="max-h-28 min-h-9 flex-1 resize-none border-0 bg-transparent py-2 text-sm text-gray-900 outline-none placeholder:text-gray-400"
                />
                <button
                  type="submit"
                  disabled={isLoading || input.trim().length === 0}
                  className="inline-flex h-9 shrink-0 items-center justify-center rounded-xl bg-gray-900 px-4 text-sm font-medium text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:bg-gray-300"
                >
                  {isLoading ? "发送中" : "发送"}
                </button>
              </div>
            </form>
          </div>
        </section>
      </div>
    </aside>
  );
}
