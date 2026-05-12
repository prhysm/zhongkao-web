"use client";

import { useMemo } from "react";
import {
  type StructuredKnowledgeItem,
  type Subject,
  usesItemIdKnowledgeDirectory,
  usesVolumeGroupedKnowledgeDirectory,
} from "@/lib/mockData";
import { getKnowledgeFrequencyMeta } from "@/lib/knowledge-frequency";
import { parseHistoryUnitOrder, sortChapters } from "@/lib/sortChapters";
import { KnowledgeImagePlaceholder, KnowledgeInlineMarkdown, KnowledgeMarkdown } from "./knowledge-markdown";

/** 以首个「 - 」为界：前面为册标题，后面为单元展示标题 */
function splitChapterVolume(chapter: string): { volume: string; remainder: string } | null {
  const sep = " - ";
  const i = chapter.indexOf(sep);
  if (i < 0) return null;
  const volume = chapter.slice(0, i).trim();
  const remainder = chapter.slice(i + sep.length).trim();
  if (!volume || !remainder) return null;
  return { volume, remainder };
}

type ChapterRow = {
  chapter: string;
  list: StructuredKnowledgeItem[];
  cardTitle: string;
};

type DirectoryLayout =
  | { mode: "flat"; rows: ChapterRow[] }
  | { mode: "volumes"; volumes: { volume: string; rows: ChapterRow[] }[] }
  | { mode: "chemThemes"; themes: { theme: string; items: StructuredKnowledgeItem[] }[] };

type StructuredKnowledgePanelProps = {
  subject: Subject;
  items: StructuredKnowledgeItem[];
  /** 目录选中键：道法/数理等为 chapter 字符串；化学为条目 id */
  selectedDirectoryKey: string | null;
  onSelectDirectoryKey: (key: string | null) => void;
  highlightId: string | null;
  knowledgeRefs: React.MutableRefObject<Record<string, HTMLDivElement | null>>;
  knowledgeFrequencies: Record<string, number>;
  searchQuery?: string;
};

function sumKnowledgeFrequencies(itemIds: string[], knowledgeFrequencies: Record<string, number>): number {
  return itemIds.reduce((sum, itemId) => sum + (knowledgeFrequencies[itemId] ?? 0), 0);
}

function normalizeKnowledgeSearchText(value: string): string {
  return value.replace(/\s+/g, "").toLowerCase();
}

function matchesKnowledgeSearch(query: string, values: Array<string | undefined>): boolean {
  if (!query) return true;
  return values.some((value) => normalizeKnowledgeSearchText(value ?? "").includes(query));
}

function ChapterCardButton({
  selectKey,
  cardTitle,
  count,
  mistakeCount,
  onSelect,
}: {
  selectKey: string;
  cardTitle: string;
  count: number;
  mistakeCount: number;
  onSelect: (key: string) => void;
}) {
  const frequencyMeta = getKnowledgeFrequencyMeta(mistakeCount);

  return (
    <button
      type="button"
      onClick={() => onSelect(selectKey)}
      className={`rounded-2xl border p-4 text-left shadow-sm transition ${frequencyMeta.surfaceClassName} ${frequencyMeta.interactiveSurfaceClassName}`}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-semibold leading-snug text-foreground">
          <KnowledgeInlineMarkdown markdown={cardTitle} />
        </p>
        {frequencyMeta.badgeLabel ? (
          <span
            className={`shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-medium ${frequencyMeta.badgeClassName}`}
          >
            {frequencyMeta.badgeLabel}
          </span>
        ) : null}
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        {count} 个知识点{mistakeCount > 0 ? ` · 累计错题 ${mistakeCount} 次` : ""}
      </p>
    </button>
  );
}

function ChemItemCard({
  item,
  mistakeCount,
  onSelect,
}: {
  item: StructuredKnowledgeItem;
  mistakeCount: number;
  onSelect: (id: string) => void;
}) {
  const frequencyMeta = getKnowledgeFrequencyMeta(mistakeCount);

  return (
    <button
      type="button"
      onClick={() => onSelect(item.id)}
      className={`rounded-2xl border p-4 text-left shadow-sm transition ${frequencyMeta.surfaceClassName} ${frequencyMeta.interactiveSurfaceClassName}`}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-semibold leading-snug text-foreground">
          <KnowledgeInlineMarkdown markdown={item.title} />
        </p>
        {frequencyMeta.badgeLabel ? (
          <span
            className={`shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-medium ${frequencyMeta.badgeClassName}`}
          >
            {frequencyMeta.badgeLabel}
          </span>
        ) : null}
      </div>
    </button>
  );
}

function sortItemDirectoryItems(subject: Subject, items: StructuredKnowledgeItem[]): StructuredKnowledgeItem[] {
  if (subject !== "历史") {
    return items.slice().sort((a, b) => a.id.localeCompare(b.id));
  }

  return items.slice().sort((a, b) => {
    const orderA = parseHistoryUnitOrder(a.title);
    const orderB = parseHistoryUnitOrder(b.title);

    if (orderA !== null && orderB !== null && orderA !== orderB) return orderA - orderB;
    if (orderA !== null && orderB === null) return -1;
    if (orderA === null && orderB !== null) return 1;
    return a.title.localeCompare(b.title, "zh-Hans-CN");
  });
}

/** 化学：沉浸式详情（全量正文、白底大卡片、无折叠） */
function ChemImmersiveDetail({
  item,
  mistakeCount,
  onBack,
  highlightId,
  knowledgeRefs,
}: {
  item: StructuredKnowledgeItem;
  mistakeCount: number;
  onBack: () => void;
  highlightId: string | null;
  knowledgeRefs: React.MutableRefObject<Record<string, HTMLDivElement | null>>;
}) {
  const frequencyMeta = getKnowledgeFrequencyMeta(mistakeCount);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="sticky top-0 z-20 shrink-0 border-b border-border/80 bg-background/95 py-3 backdrop-blur-md supports-[backdrop-filter]:bg-background/85">
        <button
          type="button"
          onClick={onBack}
          className="rounded-xl border-2 border-accent/55 bg-accent-soft/50 px-5 py-3 text-sm font-semibold text-foreground shadow-sm transition hover:bg-accent-soft/70"
        >
          <span className="mr-2" aria-hidden>
            ⬅️
          </span>
          返回目录
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto pt-5 pb-10">
        <div
          id={item.id}
          ref={(el) => {
            // ref.current 映射供错题跳转定位
            // eslint-disable-next-line react-hooks/immutability -- MutableRefObject
            knowledgeRefs.current[item.id] = el;
          }}
          className={`rounded-2xl border px-6 py-8 shadow-sm md:px-10 md:py-10 ${frequencyMeta.surfaceClassName} ${
            highlightId === item.id ? "border-accent shadow-[0_0_0_2px_rgba(111,149,255,0.28)]" : ""
          }`}
          role="article"
        >
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{item.chapter}</p>
          <div className="mt-2 flex items-start justify-between gap-3">
            <h1 className="text-xl font-bold leading-snug tracking-tight text-foreground md:text-2xl">
              <KnowledgeInlineMarkdown markdown={item.title} />
            </h1>
            {frequencyMeta.badgeLabel ? (
              <span
                className={`shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-medium ${frequencyMeta.badgeClassName}`}
              >
                {frequencyMeta.badgeLabel}
              </span>
            ) : null}
          </div>
          <div className="mt-8 border-t border-border/60 pt-8">
            <KnowledgeMarkdown markdown={item.content} variant="reading" />
            {item.imagePlaceholder ? <KnowledgeImagePlaceholder /> : null}
          </div>
        </div>
      </div>
    </div>
  );
}

export function StructuredKnowledgePanel({
  subject,
  items,
  selectedDirectoryKey,
  onSelectDirectoryKey,
  highlightId,
  knowledgeRefs,
  knowledgeFrequencies,
  searchQuery = "",
}: StructuredKnowledgePanelProps) {
  const normalizedSearchQuery = useMemo(
    () => normalizeKnowledgeSearchText(searchQuery.trim()),
    [searchQuery]
  );

  const directoryItems = useMemo(() => {
    if (!normalizedSearchQuery || selectedDirectoryKey !== null) {
      return items;
    }

    return items.filter((item) =>
      matchesKnowledgeSearch(normalizedSearchQuery, [
        item.chapter,
        item.book,
        item.title,
        item.content,
      ])
    );
  }, [items, normalizedSearchQuery, selectedDirectoryKey]);

  const directoryLayout = useMemo((): DirectoryLayout => {
    if (usesItemIdKnowledgeDirectory(subject)) {
      const byTheme = new Map<string, StructuredKnowledgeItem[]>();
      for (const item of directoryItems) {
        const arr = byTheme.get(item.chapter) ?? [];
        arr.push(item);
        byTheme.set(item.chapter, arr);
      }
      const themeOrder = sortChapters([...byTheme.keys()]);
      return {
        mode: "chemThemes",
        themes: themeOrder.map((theme) => ({
          theme,
          items: sortItemDirectoryItems(subject, byTheme.get(theme) ?? []),
        })),
      };
    }

    const map = new Map<string, StructuredKnowledgeItem[]>();
    for (const item of directoryItems) {
      const list = map.get(item.chapter) ?? [];
      list.push(item);
      map.set(item.chapter, list);
    }
    const orderedKeys = sortChapters([...map.keys()]);
    const baseRows: ChapterRow[] = orderedKeys.map((chapter) => ({
      chapter,
      list: map.get(chapter)!,
      cardTitle: chapter,
    }));

    if (!usesVolumeGroupedKnowledgeDirectory(subject)) {
      return { mode: "flat", rows: baseRows };
    }

    const withVolume = baseRows.map((row) => {
      const sp = splitChapterVolume(row.chapter);
      return sp ? { ...row, volume: sp.volume, cardTitle: sp.remainder } : null;
    });

    if (withVolume.some((r) => r === null)) {
      return { mode: "flat", rows: baseRows };
    }

    const volumeOrder: string[] = [];
    const byVolume = new Map<string, ChapterRow[]>();
    for (const r of withVolume as (ChapterRow & { volume: string })[]) {
      if (!byVolume.has(r.volume)) {
        volumeOrder.push(r.volume);
        byVolume.set(r.volume, []);
      }
      byVolume.get(r.volume)!.push({
        chapter: r.chapter,
        list: r.list,
        cardTitle: r.cardTitle,
      });
    }

    return {
      mode: "volumes",
      volumes: volumeOrder.map((volume) => ({
        volume,
        rows: byVolume.get(volume)!,
      })),
    };
  }, [directoryItems, subject]);

  if (usesItemIdKnowledgeDirectory(subject) && selectedDirectoryKey !== null) {
    const item = items.find((i) => i.id === selectedDirectoryKey);
    if (item) {
      return (
        <ChemImmersiveDetail
          item={item}
          mistakeCount={knowledgeFrequencies[item.id] ?? 0}
          onBack={() => onSelectDirectoryKey(null)}
          highlightId={highlightId}
          knowledgeRefs={knowledgeRefs}
        />
      );
    }
  }

  if (selectedDirectoryKey === null) {
    const hasDirectoryResults =
      (directoryLayout.mode === "chemThemes" &&
        directoryLayout.themes.some((block) => block.items.length > 0)) ||
      (directoryLayout.mode === "flat" && directoryLayout.rows.length > 0) ||
      (directoryLayout.mode === "volumes" &&
        directoryLayout.volumes.some((block) => block.rows.length > 0));

    if (!hasDirectoryResults) {
      return (
        <div className="mt-5 rounded-2xl border border-dashed border-border/80 bg-card/70 px-5 py-8 text-center">
          <p className="text-sm font-medium text-foreground">
            没有找到相关的知识点，请换个关键词试试
          </p>
        </div>
      );
    }

    return (
      <div className="mt-5">
        {directoryLayout.mode === "chemThemes" ? (
          <div className="space-y-0">
            {directoryLayout.themes.map((block, idx) => (
              <section key={block.theme} className="scroll-mt-4">
                <h2
                  className={`border-b border-border/70 pb-2 text-xl font-bold tracking-tight text-foreground ${
                    idx === 0 ? "mt-1 mb-4" : "mt-8 mb-4"
                  }`}
                >
                  <KnowledgeInlineMarkdown markdown={block.theme} />
                </h2>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {block.items.map((item) => (
                    <ChemItemCard
                      key={item.id}
                      item={item}
                      mistakeCount={knowledgeFrequencies[item.id] ?? 0}
                      onSelect={onSelectDirectoryKey}
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>
        ) : directoryLayout.mode === "flat" ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {directoryLayout.rows.map(({ chapter, list, cardTitle }) => (
              <ChapterCardButton
                key={chapter}
                selectKey={chapter}
                cardTitle={cardTitle}
                count={list.length}
                mistakeCount={sumKnowledgeFrequencies(list.map((item) => item.id), knowledgeFrequencies)}
                onSelect={onSelectDirectoryKey}
              />
            ))}
          </div>
        ) : (
          <div className="space-y-0">
            {directoryLayout.volumes.map((volBlock, idx) => (
              <section key={volBlock.volume} className="scroll-mt-4">
                <h2
                  className={`border-b border-border/70 pb-2 text-xl font-bold tracking-tight text-foreground ${
                    idx === 0 ? "mt-1 mb-4" : "mt-8 mb-4"
                  }`}
                >
                  <KnowledgeInlineMarkdown markdown={volBlock.volume} />
                </h2>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {volBlock.rows.map(({ chapter, list, cardTitle }) => (
                    <ChapterCardButton
                      key={chapter}
                      selectKey={chapter}
                      cardTitle={cardTitle}
                      count={list.length}
                      mistakeCount={sumKnowledgeFrequencies(list.map((item) => item.id), knowledgeFrequencies)}
                      onSelect={onSelectDirectoryKey}
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    );
  }

  const detailItems = items.filter((i) => i.chapter === selectedDirectoryKey);

  return (
    <div className="mt-5 space-y-3">
      <div className="sticky top-0 z-10 -mx-1 border-b border-border/80 bg-background/90 px-1 py-3 backdrop-blur-md supports-[backdrop-filter]:bg-background/75">
        <button
          type="button"
          onClick={() => onSelectDirectoryKey(null)}
          className="w-full rounded-xl border-2 border-accent/50 bg-accent-soft/40 px-4 py-3 text-center text-sm font-semibold text-foreground shadow-sm transition hover:bg-accent-soft/60 sm:w-auto sm:px-6"
        >
          <span className="mr-2" aria-hidden>
            ⬅️
          </span>
          返回章节目录
        </button>
      </div>

      {detailItems.map((item) => {
        const frequencyMeta = getKnowledgeFrequencyMeta(knowledgeFrequencies[item.id] ?? 0);

        return (
          <div
            key={item.id}
            id={item.id}
            ref={(el) => {
              knowledgeRefs.current[item.id] = el;
            }}
            className={`rounded-2xl border p-4 transition ${frequencyMeta.surfaceClassName} ${
              highlightId === item.id
                ? "border-accent shadow-[0_0_0_2px_rgba(111,149,255,0.28)]"
                : "shadow-sm"
            }`}
          >
            <p className="text-xs text-muted-foreground">{item.chapter}</p>
            <div className="mt-1 flex items-start justify-between gap-3">
              <h3 className="text-sm font-semibold text-foreground">
                <KnowledgeInlineMarkdown markdown={item.title} />
              </h3>
              {frequencyMeta.badgeLabel ? (
                <span
                  className={`shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-medium ${frequencyMeta.badgeClassName}`}
                >
                  {frequencyMeta.badgeLabel}
                </span>
              ) : null}
            </div>
            <KnowledgeMarkdown markdown={item.content} />
            {item.imagePlaceholder ? <KnowledgeImagePlaceholder /> : null}
          </div>
        );
      })}
    </div>
  );
}
