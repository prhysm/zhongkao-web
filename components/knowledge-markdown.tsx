"use client";

import { useEffect, useId } from "react";
import ReactMarkdown from "react-markdown";
import type { Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import type { PluggableList } from "unified";

const remarkPlugins: PluggableList = [remarkGfm, remarkMath, remarkBreaks];
const rehypePlugins: PluggableList = [rehypeKatex];

/** 仅允许站点内静态资源，避免任意 URL 被注入进 Markdown */
function isTrustedKnowledgeImageSrc(src: string): boolean {
  if (!src.startsWith("/") || src.startsWith("//")) return false;
  if (!src.startsWith("/images/knowledge/")) return false;
  if (/[\0\r\n]/.test(src)) return false;
  return true;
}

function useMathRootId(markdown: string) {
  const mathRootId = useId().replace(/:/g, "");

  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent("zhongkao:render-math", {
        detail: {
          selector: `[data-math-root-id="${mathRootId}"]`,
        },
      })
    );
  }, [markdown, mathRootId]);

  return mathRootId;
}

function createMarkdownComponents(variant: "default" | "reading"): Components {
  return {
    p: ({ children }) => (
      <p className="mb-3 break-words leading-relaxed text-muted-foreground last:mb-0">{children}</p>
    ),
    table: ({ children }) => (
      <div className="my-3 w-full overflow-x-auto rounded-lg border border-border">
        <table className="w-full min-w-[12rem] border-collapse text-sm">{children}</table>
      </div>
    ),
    thead: ({ children }) => <thead className="bg-muted/80">{children}</thead>,
    th: ({ children }) => (
      <th className="border border-border px-3 py-2 text-left text-xs font-semibold text-foreground">{children}</th>
    ),
    td: ({ children }) => (
      <td className="border border-border px-3 py-2 align-top text-muted-foreground">{children}</td>
    ),
    tr: ({ children }) => <tr className="even:bg-muted/20">{children}</tr>,
    tbody: ({ children }) => <tbody>{children}</tbody>,
    ul: ({ children }) => (
      <ul className="my-2 list-disc space-y-1.5 pl-5 text-muted-foreground [&_ul]:my-1">{children}</ul>
    ),
    ol: ({ children }) => (
      <ol className="my-2 list-decimal space-y-1.5 pl-5 text-muted-foreground [&_ol]:my-1">{children}</ol>
    ),
    li: ({ children }) => <li className="leading-relaxed">{children}</li>,
    strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
    blockquote: ({ children }) => (
      <blockquote className="my-3 border-l-4 border-accent/50 pl-3 text-muted-foreground italic">{children}</blockquote>
    ),
    code: ({ className, children }) => {
      const isBlock = Boolean(className?.includes("language-"));
      if (!isBlock) {
        return (
          <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[0.9em] text-foreground">{children}</code>
        );
      }
      return <code className={className}>{children}</code>;
    },
    pre: ({ children }) => (
      <pre className="my-3 overflow-x-auto rounded-lg border border-border/50 bg-muted/60 p-3 font-mono text-xs leading-relaxed">
        {children}
      </pre>
    ),
    hr: () => <hr className="my-4 border-border" />,
    h1: ({ children }) => <h4 className="mb-2 mt-4 text-base font-semibold text-foreground first:mt-0">{children}</h4>,
    h2: ({ children }) => <h4 className="mb-2 mt-4 text-base font-semibold text-foreground first:mt-0">{children}</h4>,
    h3: ({ children }) =>
      variant === "reading" ? (
        <h3 className="mb-3 mt-8 scroll-mt-24 text-lg font-bold leading-snug tracking-tight text-foreground first:mt-2">
          {children}
        </h3>
      ) : (
        <h3 className="mb-2 mt-3 scroll-mt-20 text-sm font-semibold text-foreground first:mt-0">{children}</h3>
      ),
    h4: ({ children }) => <h5 className="mb-2 mt-3 text-sm font-semibold text-foreground first:mt-0">{children}</h5>,
    img: ({ src, alt }) => {
      const s = typeof src === "string" ? src : "";
      if (isTrustedKnowledgeImageSrc(s)) {
        return (
          // Markdown 配图尺寸随文档变化；native img 避免为每张学段配置 next/image 宽高
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={s}
            alt={alt != null && String(alt).trim() ? String(alt) : "知识点配图"}
            className="my-3 max-h-[min(70vh,520px)] w-auto max-w-full rounded-lg border border-border/60 object-contain"
            loading="lazy"
            decoding="async"
          />
        );
      }
      return (
        <span className="my-2 block rounded-lg border border-dashed border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground select-none">
          [插图占位] {alt ? String(alt) : "仅展示 /images/knowledge/ 下的配图；其他地址需在正文中替换为受信任路径"}
        </span>
      );
    },
    a: ({ href, children }) => {
      if (!href || /^(javascript:|data:|vbscript:)/i.test(href)) {
        return <span>{children}</span>;
      }
      return (
        <a href={href} target="_blank" rel="noopener noreferrer" className="text-accent underline underline-offset-2">
          {children}
        </a>
      );
    },
  };
}

export function KnowledgeMarkdown({
  markdown,
  variant = "default",
}: {
  markdown: string;
  /** reading：沉浸式长文，更大字号与行高 */
  variant?: "default" | "reading";
}) {
  const mathRootId = useMathRootId(markdown);

  const wrap =
    variant === "reading"
      ? "knowledge-markdown prose-katex mt-0 max-w-none text-base [&_.katex-display]:my-4 [&_.katex-display]:max-w-full [&_.katex-display]:overflow-x-auto [&_.katex-display]:overflow-y-hidden [&_.katex]:text-[1em] [&_li]:leading-[1.8] [&_p]:mb-4 [&_p]:text-[15px] [&_p]:leading-[1.85] [&_ul]:my-4 [&_ul]:space-y-2"
      : "knowledge-markdown prose-katex mt-2 text-sm [&_.katex-display]:my-3 [&_.katex-display]:max-w-full [&_.katex-display]:overflow-x-auto [&_.katex-display]:overflow-y-hidden [&_.katex]:text-[0.95em]";
  const markdownComponents = createMarkdownComponents(variant);
  return (
    <div className={wrap} data-knowledge-md data-math-root data-math-root-id={mathRootId}>
      <ReactMarkdown remarkPlugins={remarkPlugins} rehypePlugins={rehypePlugins} components={markdownComponents}>
        {markdown}
      </ReactMarkdown>
    </div>
  );
}

export function KnowledgeInlineMarkdown({
  markdown,
  className = "",
}: {
  markdown: string;
  className?: string;
}) {
  const mathRootId = useMathRootId(markdown);

  return (
    <span
      className={`knowledge-inline-markdown prose-katex inline max-w-full break-words align-baseline text-inherit [&_.katex-display]:inline [&_.katex-display]:m-0 [&_.katex]:text-[1em] ${className}`.trim()}
      data-knowledge-md
      data-math-root
      data-math-root-id={mathRootId}
    >
      <ReactMarkdown
        remarkPlugins={remarkPlugins}
        rehypePlugins={rehypePlugins}
        components={{
          p: "span",
          strong: ({ children }) => <strong className="font-semibold text-inherit">{children}</strong>,
          em: ({ children }) => <em>{children}</em>,
          code: ({ children }) => <code className="font-mono text-[0.95em]">{children}</code>,
          a: ({ href, children }) => {
            if (!href || /^(javascript:|data:|vbscript:)/i.test(href)) {
              return <span>{children}</span>;
            }
            return (
              <a href={href} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">
                {children}
              </a>
            );
          },
        }}
      >
        {markdown}
      </ReactMarkdown>
    </span>
  );
}

export function KnowledgeImagePlaceholder() {
  return (
    <div className="mt-4 rounded-xl border border-dashed border-border bg-muted/50 px-4 py-8 text-center text-sm text-muted-foreground">
      此处为图片占位，请后续在代码中替换路径
    </div>
  );
}
