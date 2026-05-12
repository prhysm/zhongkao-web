"use client";

import { useMemo } from "react";
import {
  type EnglishKnowledgeBranchNode,
  type EnglishKnowledgeLeafNode,
  type EnglishKnowledgeNode,
  isEnglishKnowledgeLeaf,
} from "@/lib/english-knowledge";
import { getKnowledgeFrequencyMeta } from "@/lib/knowledge-frequency";
import { KnowledgeMarkdown } from "./knowledge-markdown";

type EnglishKnowledgePanelProps = {
  tree: EnglishKnowledgeNode[];
  expandedNodeIds: Record<string, boolean>;
  setExpandedNodeIds: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  highlightId: string | null;
  knowledgeRefs: React.MutableRefObject<Record<string, HTMLDivElement | null>>;
  knowledgeFrequencies: Record<string, number>;
  searchQuery?: string;
};

function countLeaves(node: EnglishKnowledgeNode): number {
  if (isEnglishKnowledgeLeaf(node)) {
    return 1;
  }
  return node.children.reduce((sum, child) => sum + countLeaves(child), 0);
}

function toggleExpanded(
  id: string,
  setExpandedNodeIds: React.Dispatch<React.SetStateAction<Record<string, boolean>>>
) {
  setExpandedNodeIds((prev) => ({
    ...prev,
    [id]: !(prev[id] ?? false),
  }));
}

function collectLeafNodes(tree: EnglishKnowledgeNode[]): EnglishKnowledgeLeafNode[] {
  return tree.flatMap((node) =>
    isEnglishKnowledgeLeaf(node) ? [node] : collectLeafNodes(node.children)
  );
}

function normalizeKnowledgeSearchText(value: string): string {
  return value.replace(/\s+/g, "").toLowerCase();
}

function matchesKnowledgeSearch(query: string, values: Array<string | undefined>): boolean {
  if (!query) return true;
  return values.some((value) => normalizeKnowledgeSearchText(value ?? "").includes(query));
}

function sumLeafMistakeCount(node: EnglishKnowledgeNode, knowledgeFrequencies: Record<string, number>): number {
  if (isEnglishKnowledgeLeaf(node)) {
    return knowledgeFrequencies[node.id] ?? 0;
  }

  return node.children.reduce((sum, child) => sum + sumLeafMistakeCount(child, knowledgeFrequencies), 0);
}

function BranchNode({
  node,
  expandedNodeIds,
  setExpandedNodeIds,
  highlightId,
  knowledgeRefs,
  knowledgeFrequencies,
}: {
  node: EnglishKnowledgeBranchNode;
  expandedNodeIds: Record<string, boolean>;
  setExpandedNodeIds: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  highlightId: string | null;
  knowledgeRefs: React.MutableRefObject<Record<string, HTMLDivElement | null>>;
  knowledgeFrequencies: Record<string, number>;
}) {
  const leafCount = useMemo(() => countLeaves(node), [node]);
  const mistakeCount = useMemo(() => sumLeafMistakeCount(node, knowledgeFrequencies), [node, knowledgeFrequencies]);
  const frequencyMeta = getKnowledgeFrequencyMeta(mistakeCount);
  const expanded = expandedNodeIds[node.id] ?? node.level === 1;
  const baseSurfaceClassName =
    node.level === 1
      ? "border-border/90 bg-card shadow-sm hover:border-accent/55 hover:bg-accent-soft/25"
      : "border-border/70 bg-background/70 hover:border-accent/45 hover:bg-accent-soft/15";
  const buttonSurfaceClassName =
    frequencyMeta.tone === "none"
      ? baseSurfaceClassName
      : `${frequencyMeta.surfaceClassName} ${frequencyMeta.interactiveSurfaceClassName} shadow-sm`;

  return (
    <section className="space-y-3">
      <button
        type="button"
        onClick={() => toggleExpanded(node.id, setExpandedNodeIds)}
        className={`flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left transition ${buttonSurfaceClassName}`}
      >
        <div>
          <p
            className={`${
              node.level === 1 ? "text-base font-semibold text-foreground" : "text-sm font-medium text-foreground"
            }`}
          >
            {node.title}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">{leafCount} 个专题</p>
        </div>
        <div className="flex items-center gap-2">
          {frequencyMeta.badgeLabel ? (
            <span
              className={`shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-medium ${frequencyMeta.badgeClassName}`}
            >
              {frequencyMeta.badgeLabel}
            </span>
          ) : null}
          <span
            aria-hidden
            className={`text-lg text-muted-foreground transition-transform ${expanded ? "rotate-90" : ""}`}
          >
            ›
          </span>
        </div>
      </button>

      {expanded ? (
        <div className={`space-y-3 ${node.level === 1 ? "" : "border-l border-border/60 pl-4"}`}>
          {node.children.map((child) =>
            isEnglishKnowledgeLeaf(child) ? (
              <LeafNode
                key={child.id}
                node={child}
                highlightId={highlightId}
                knowledgeRefs={knowledgeRefs}
                knowledgeFrequencies={knowledgeFrequencies}
              />
            ) : (
              <BranchNode
                key={child.id}
                node={child}
                expandedNodeIds={expandedNodeIds}
                setExpandedNodeIds={setExpandedNodeIds}
                highlightId={highlightId}
                knowledgeRefs={knowledgeRefs}
                knowledgeFrequencies={knowledgeFrequencies}
              />
            )
          )}
        </div>
      ) : null}
    </section>
  );
}

function LeafNode({
  node,
  highlightId,
  knowledgeRefs,
  knowledgeFrequencies,
}: {
  node: EnglishKnowledgeLeafNode;
  highlightId: string | null;
  knowledgeRefs: React.MutableRefObject<Record<string, HTMLDivElement | null>>;
  knowledgeFrequencies: Record<string, number>;
}) {
  const breadcrumb = node.pathTitles.join(" / ");
  const frequencyMeta = getKnowledgeFrequencyMeta(knowledgeFrequencies[node.id] ?? 0);

  return (
    <div
      id={node.id}
      ref={(el) => {
        // ref.current 映射供错题跳转定位
        // eslint-disable-next-line react-hooks/immutability -- MutableRefObject
        knowledgeRefs.current[node.id] = el;
      }}
      className={`rounded-2xl border p-4 transition ${frequencyMeta.surfaceClassName} ${
        highlightId === node.id
          ? "border-accent shadow-[0_0_0_2px_rgba(111,149,255,0.28)]"
          : "shadow-sm"
      }`}
    >
      <p className="text-xs text-muted-foreground">{breadcrumb}</p>
      <div className="mt-1 flex items-start justify-between gap-3">
        <h3 className="text-sm font-semibold text-foreground">{node.title}</h3>
        {frequencyMeta.badgeLabel ? (
          <span
            className={`shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-medium ${frequencyMeta.badgeClassName}`}
          >
            {frequencyMeta.badgeLabel}
          </span>
        ) : null}
      </div>

      {node.contentLabels.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {node.contentLabels.map((label) => (
            <span
              key={`${node.id}-${label}`}
              className="rounded-full border border-accent/35 bg-accent-soft/40 px-2.5 py-1 text-[11px] font-medium text-foreground"
            >
              {label}
            </span>
          ))}
        </div>
      ) : null}

      {node.coreContent ? <KnowledgeMarkdown markdown={node.coreContent} /> : null}

      {node.warning ? (
        <div className="mt-4 rounded-2xl border border-red-200/70 bg-red-50/90 p-4 dark:border-red-400/25 dark:bg-red-500/8">
          <div className="flex items-center gap-2">
            <span aria-hidden className="text-sm text-red-500">
              ⚠️
            </span>
            <p className="text-sm font-semibold text-red-700 dark:text-red-300">高频易错预警</p>
          </div>
          <KnowledgeMarkdown markdown={node.warning} />
        </div>
      ) : null}
    </div>
  );
}

export function EnglishKnowledgePanel({
  tree,
  expandedNodeIds,
  setExpandedNodeIds,
  highlightId,
  knowledgeRefs,
  knowledgeFrequencies,
  searchQuery = "",
}: EnglishKnowledgePanelProps) {
  const matchedLeaves = useMemo(() => {
    const normalizedSearchQuery = normalizeKnowledgeSearchText(searchQuery.trim());
    if (!normalizedSearchQuery) return [];

    return collectLeafNodes(tree).filter((node) =>
      matchesKnowledgeSearch(normalizedSearchQuery, [
        ...node.pathTitles,
        node.title,
        node.coreContent,
        node.warning,
        node.contentLabels.join(" "),
      ])
    );
  }, [searchQuery, tree]);

  if (searchQuery.trim().length > 0) {
    return (
      <div className="mt-5 space-y-4">
        {matchedLeaves.length > 0 ? (
          matchedLeaves.map((node) => (
            <LeafNode
              key={node.id}
              node={node}
              highlightId={highlightId}
              knowledgeRefs={knowledgeRefs}
              knowledgeFrequencies={knowledgeFrequencies}
            />
          ))
        ) : (
          <div className="rounded-2xl border border-dashed border-border/80 bg-card/70 px-5 py-8 text-center">
            <p className="text-sm font-medium text-foreground">
              没有找到相关的知识点，请换个关键词试试
            </p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="mt-5 space-y-4">
      {tree.map((node) =>
        isEnglishKnowledgeLeaf(node) ? (
          <LeafNode
            key={node.id}
            node={node}
            highlightId={highlightId}
            knowledgeRefs={knowledgeRefs}
            knowledgeFrequencies={knowledgeFrequencies}
          />
        ) : (
          <BranchNode
            key={node.id}
            node={node}
            expandedNodeIds={expandedNodeIds}
            setExpandedNodeIds={setExpandedNodeIds}
            highlightId={highlightId}
            knowledgeRefs={knowledgeRefs}
            knowledgeFrequencies={knowledgeFrequencies}
          />
        )
      )}
    </div>
  );
}
