"use client";

import { useEffect, useMemo } from "react";
import {
  CHINESE_KNOWLEDGE_LEAVES,
  CHINESE_KNOWLEDGE_MODULES,
  CHINESE_SKILL_LEAVES,
  type ChineseCorePoint,
  type ChineseHighlight,
  type ChineseKnowledgeLeaf,
  type ChineseModule,
  type ChineseSkillLeaf,
} from "@/lib/chinese-knowledge";
import { getKnowledgeFrequencyMeta } from "@/lib/knowledge-frequency";

type ChineseKnowledgePanelProps = {
  activeModuleId: string;
  onActiveModuleIdChange: (id: string) => void;
  selectedCategoryId: string | null;
  onSelectedCategoryIdChange: (id: string | null) => void;
  highlightId: string | null;
  knowledgeRefs: React.MutableRefObject<Record<string, HTMLDivElement | null>>;
  knowledgeFrequencies: Record<string, number>;
  searchQuery?: string;
};

type ChineseSkillPanelProps = {
  activeModuleId: string;
  onActiveModuleIdChange: (id: string) => void;
  selectedCategoryId: string | null;
  onSelectedCategoryIdChange: (id: string | null) => void;
  highlightId: string | null;
  skillRefs: React.MutableRefObject<Record<string, HTMLDivElement | null>>;
};

function normalizeKnowledgeSearchText(value: string): string {
  return value.replace(/\s+/g, "").toLowerCase();
}

function matchesKnowledgeSearch(query: string, values: Array<string | undefined>): boolean {
  if (!query) return true;
  return values.some((value) => normalizeKnowledgeSearchText(value ?? "").includes(query));
}

function countCategoryMistakes(corePoints: ChineseCorePoint[], frequencies: Record<string, number>): number {
  return corePoints.reduce((sum, point) => sum + (frequencies[point.id] ?? 0), 0);
}

type CategorySection = {
  key: string;
  title: string | null;
  categories: ChineseModule["categories"];
};

function buildCategorySections(categories: ChineseModule["categories"]): CategorySection[] {
  const sections: CategorySection[] = [];
  const groupIndex = new Map<string, number>();
  const ungrouped: ChineseModule["categories"] = [];

  categories.forEach((category) => {
    if (!category.group || category.group === category.name) {
      ungrouped.push(category);
      return;
    }

    const existingIndex = groupIndex.get(category.group);
    if (existingIndex === undefined) {
      groupIndex.set(category.group, sections.length);
      sections.push({
        key: `group-${category.group}`,
        title: category.group,
        categories: [category],
      });
      return;
    }

    sections[existingIndex].categories.push(category);
  });

  if (ungrouped.length > 0) {
    sections.push({
      key: "ungrouped",
      title: null,
      categories: ungrouped,
    });
  }

  return sections;
}

function renderArrayItems(items: string[]) {
  return (
    <ul className="space-y-2 text-sm leading-relaxed text-muted-foreground">
      {items.map((item) => (
        <li key={item} className="flex gap-2">
          <span className="mt-1 text-[10px] text-muted-foreground/70">●</span>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

function HighlightBox({ highlight }: { highlight: ChineseHighlight }) {
  const isWarning = highlight.type === "warning";

  return (
    <div
      className={`rounded-2xl border px-4 py-4 ${
        isWarning
          ? "border-red-200/70 bg-red-50/90 dark:border-red-400/25 dark:bg-red-500/8"
          : "border-amber-200/70 bg-amber-50/90 dark:border-amber-400/25 dark:bg-amber-500/8"
      }`}
    >
      <div className="flex items-center gap-2">
        <span aria-hidden className={`text-sm ${isWarning ? "text-red-500" : "text-amber-500"}`}>
          {isWarning ? "⚠️" : "💡"}
        </span>
        <p className={`text-sm font-semibold ${isWarning ? "text-red-700 dark:text-red-300" : "text-amber-700 dark:text-amber-300"}`}>
          {highlight.label}
        </p>
      </div>
      <p className={`mt-2 text-sm leading-relaxed ${isWarning ? "text-red-700/90 dark:text-red-200/90" : "text-amber-800/90 dark:text-amber-200/90"}`}>
        {highlight.content}
      </p>
    </div>
  );
}

function SectionCard({
  title,
  tone = "default",
  children,
}: {
  title: string;
  tone?: "default" | "strategy" | "template";
  children: React.ReactNode;
}) {
  const toneClassName =
    tone === "strategy"
      ? "border-sky-200/80 bg-sky-50/90 dark:border-sky-400/25 dark:bg-sky-500/8"
      : tone === "template"
        ? "border-amber-200/80 bg-amber-50/90 dark:border-amber-400/25 dark:bg-amber-500/8"
        : "border-border/80 bg-background/70";

  return (
    <section className={`rounded-2xl border px-4 py-4 ${toneClassName}`}>
      <p className="text-xs font-semibold tracking-[0.14em] uppercase text-muted-foreground">{title}</p>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function ExampleQuotes({ examples }: { examples: string[] }) {
  return (
    <div className="space-y-3">
      {examples.map((example) => (
        <blockquote
          key={example}
          className="rounded-2xl border-l-4 border-accent/55 bg-card/80 px-4 py-3 text-sm leading-relaxed text-muted-foreground"
        >
          {example}
        </blockquote>
      ))}
    </div>
  );
}

function ModuleTabs({
  modules,
  activeModuleId,
  onActiveModuleIdChange,
}: {
  modules: ChineseModule[];
  activeModuleId: string;
  onActiveModuleIdChange: (id: string) => void;
}) {
  return (
    <div className="mt-5 -mx-1 overflow-x-auto pb-1">
      <div className="flex min-w-max gap-2 px-1">
        {modules.map((module) => (
          <button
            key={module.id}
            type="button"
            onClick={() => onActiveModuleIdChange(module.id)}
            className={`shrink-0 whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-medium transition ${
              activeModuleId === module.id
                ? "border-accent/70 bg-accent-soft text-foreground"
                : "border-border bg-card text-muted-foreground"
            }`}
          >
            {module.name}
          </button>
        ))}
      </div>
    </div>
  );
}

function DirectoryBackButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <div className="sticky top-0 z-10 -mx-1 border-b border-border/80 bg-background/90 px-1 py-3 backdrop-blur-md supports-[backdrop-filter]:bg-background/75">
      <button
        type="button"
        onClick={onClick}
        className="w-full rounded-xl border-2 border-accent/50 bg-accent-soft/40 px-4 py-3 text-center text-sm font-semibold text-foreground shadow-sm transition hover:bg-accent-soft/60 sm:w-auto sm:px-6"
      >
        <span className="mr-2" aria-hidden>
          ⬅️
        </span>
        {label}
      </button>
    </div>
  );
}

function CategoryDirectoryButton({
  title,
  subtitle,
  badgeLabel,
  badgeClassName,
  className,
  onClick,
}: {
  title: string;
  subtitle: string;
  badgeLabel?: string | null;
  badgeClassName?: string;
  className: string;
  onClick: () => void;
}) {
  return (
    <button type="button" onClick={onClick} className={`rounded-2xl border p-4 text-left shadow-sm transition ${className}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-base font-semibold leading-snug text-foreground">{title}</p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{subtitle}</p>
        </div>
        {badgeLabel && badgeClassName ? (
          <span className={`shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-medium ${badgeClassName}`}>
            {badgeLabel}
          </span>
        ) : null}
      </div>
      <div className="mt-4 flex items-center justify-between text-xs font-medium text-muted-foreground">
        <span>点击进入</span>
        <span aria-hidden className="text-base">
          ›
        </span>
      </div>
    </button>
  );
}

function KnowledgeLeafCard({
  leaf,
  highlightId,
  knowledgeRefs,
  knowledgeFrequencies,
}: {
  leaf: ChineseKnowledgeLeaf;
  highlightId: string | null;
  knowledgeRefs: React.MutableRefObject<Record<string, HTMLDivElement | null>>;
  knowledgeFrequencies: Record<string, number>;
}) {
  const frequencyMeta = getKnowledgeFrequencyMeta(knowledgeFrequencies[leaf.id] ?? 0);

  return (
    <div
      id={leaf.id}
      ref={(el) => {
        // ref.current 映射供错题跳转定位
        // eslint-disable-next-line react-hooks/immutability -- MutableRefObject
        knowledgeRefs.current[leaf.id] = el;
      }}
      className={`rounded-3xl border p-5 transition ${frequencyMeta.surfaceClassName} ${
        highlightId === leaf.id ? "border-accent shadow-[0_0_0_2px_rgba(111,149,255,0.28)]" : "shadow-sm"
      }`}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full border border-border/80 bg-background/80 px-2.5 py-1 text-[11px] text-muted-foreground">
          {leaf.pathTitles.slice(0, -1).join(" / ")}
        </span>
        {leaf.scoreRange ? (
          <span className="rounded-full border border-accent/35 bg-accent-soft/30 px-2.5 py-1 text-[11px] font-medium text-foreground">
            {leaf.scoreRange}
          </span>
        ) : null}
        {frequencyMeta.badgeLabel ? (
          <span className={`rounded-full border px-2.5 py-1 text-[11px] font-medium ${frequencyMeta.badgeClassName}`}>
            {frequencyMeta.badgeLabel}
          </span>
        ) : null}
      </div>

      <h3 className="mt-3 text-lg font-semibold leading-snug text-foreground">{leaf.title}</h3>

      <div className="mt-4 space-y-4">
        {leaf.examFormat.length > 0 ? (
          <SectionCard title="考查形式">{renderArrayItems(leaf.examFormat)}</SectionCard>
        ) : null}

        {leaf.realExamExamples.length > 0 ? (
          <SectionCard title="真题举例">
            <ExampleQuotes examples={leaf.realExamExamples} />
          </SectionCard>
        ) : null}

        {leaf.answeringStrategy.length > 0 ? (
          <SectionCard title="答题思路" tone="strategy">
            {renderArrayItems(leaf.answeringStrategy)}
          </SectionCard>
        ) : null}

        {leaf.universalTemplate.length > 0 ? (
          <SectionCard title="万能模板" tone="template">
            {renderArrayItems(leaf.universalTemplate)}
          </SectionCard>
        ) : null}

        {leaf.highlights.length > 0 ? (
          <div className="space-y-3">
            {leaf.highlights.map((highlight) => (
              <HighlightBox key={`${leaf.id}-${highlight.label}-${highlight.content}`} highlight={highlight} />
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function SkillLeafCard({
  leaf,
  highlightId,
  skillRefs,
}: {
  leaf: ChineseSkillLeaf;
  highlightId: string | null;
  skillRefs: React.MutableRefObject<Record<string, HTMLDivElement | null>>;
}) {
  return (
    <div
      id={leaf.id}
      ref={(el) => {
        // ref.current 映射供错题跳转定位
        // eslint-disable-next-line react-hooks/immutability -- MutableRefObject
        skillRefs.current[leaf.id] = el;
      }}
      className={`rounded-3xl border bg-card p-5 transition ${
        highlightId === leaf.id ? "border-accent shadow-[0_0_0_2px_rgba(111,149,255,0.28)]" : "border-border/90 shadow-sm"
      }`}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full border border-border/80 bg-background/80 px-2.5 py-1 text-[11px] text-muted-foreground">
          {leaf.pathTitles.slice(0, -1).join(" / ")}
        </span>
        {leaf.scoreRange ? (
          <span className="rounded-full border border-accent/35 bg-accent-soft/30 px-2.5 py-1 text-[11px] font-medium text-foreground">
            {leaf.scoreRange}
          </span>
        ) : null}
      </div>

      <h3 className="mt-3 text-lg font-semibold leading-snug text-foreground">{leaf.title}</h3>

      {leaf.examFormat[0] ? (
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{leaf.examFormat[0]}</p>
      ) : null}

      <div className="mt-4 space-y-4">
        {leaf.answeringStrategy.length > 0 ? (
          <SectionCard title="答题思路" tone="strategy">
            {renderArrayItems(leaf.answeringStrategy)}
          </SectionCard>
        ) : null}

        {leaf.universalTemplate.length > 0 ? (
          <SectionCard title="万能模板" tone="template">
            {renderArrayItems(leaf.universalTemplate)}
          </SectionCard>
        ) : null}

        {leaf.highlights.length > 0 ? (
          <div className="space-y-3">
            {leaf.highlights.map((highlight) => (
              <HighlightBox key={`${leaf.id}-${highlight.label}-${highlight.content}`} highlight={highlight} />
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function KnowledgeCategoryDirectory({
  module,
  onSelectCategory,
  knowledgeFrequencies,
}: {
  module: ChineseModule;
  onSelectCategory: (categoryId: string) => void;
  knowledgeFrequencies: Record<string, number>;
}) {
  const sections = useMemo(() => buildCategorySections(module.categories), [module.categories]);

  return (
    <div className="mt-5 space-y-6">
      {module.module_highlights?.length ? (
        <div className="space-y-3">
          {module.module_highlights.map((highlight) => (
            <HighlightBox key={`${module.id}-${highlight.label}-${highlight.content}`} highlight={highlight} />
          ))}
        </div>
      ) : null}

      {sections.map((section) => (
        <section key={section.key} className="space-y-4">
          {section.title ? (
            <div className="border-b border-border/70 pb-2">
              <h2 className="text-xl font-bold tracking-tight text-foreground">{section.title}</h2>
            </div>
          ) : null}

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {section.categories.map((category) => {
              const mistakeCount = countCategoryMistakes(category.core_points, knowledgeFrequencies);
              const frequencyMeta = getKnowledgeFrequencyMeta(mistakeCount);
              const subtitle = `${category.core_points.length} 个考点${category.overview ? ` · ${category.overview}` : ""}`;

              return (
                <CategoryDirectoryButton
                  key={category.id}
                  title={category.name}
                  subtitle={subtitle}
                  badgeLabel={frequencyMeta.badgeLabel}
                  badgeClassName={frequencyMeta.badgeClassName}
                  className={`${frequencyMeta.surfaceClassName} ${frequencyMeta.interactiveSurfaceClassName}`}
                  onClick={() => onSelectCategory(category.id)}
                />
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}

function KnowledgeCategoryDetail({
  module,
  category,
  highlightId,
  knowledgeRefs,
  knowledgeFrequencies,
  onBack,
}: {
  module: ChineseModule;
  category: ChineseModule["categories"][number];
  highlightId: string | null;
  knowledgeRefs: React.MutableRefObject<Record<string, HTMLDivElement | null>>;
  knowledgeFrequencies: Record<string, number>;
  onBack: () => void;
}) {
  const leaves = CHINESE_KNOWLEDGE_LEAVES.filter((leaf) => leaf.categoryId === category.id);
  const breadcrumb = [module.name, category.group, category.name].filter(Boolean).join(" / ");

  return (
    <div className="mt-5 space-y-4">
      <DirectoryBackButton label="返回阅读目录" onClick={onBack} />

      <section className="rounded-3xl border border-border/80 bg-card/70 px-5 py-5 shadow-sm">
        <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">{breadcrumb}</p>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">{category.name}</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          {category.overview ?? `共收录 ${leaves.length} 个高频考点，本页将直接展示全部考点的完整内容。`}
        </p>
      </section>

      <div className="space-y-4">
        {leaves.map((leaf) => (
          <KnowledgeLeafCard
            key={leaf.id}
            leaf={leaf}
            highlightId={highlightId}
            knowledgeRefs={knowledgeRefs}
            knowledgeFrequencies={knowledgeFrequencies}
          />
        ))}
      </div>
    </div>
  );
}

function SkillCategoryDirectory({
  module,
  onSelectCategory,
}: {
  module: ChineseModule;
  onSelectCategory: (categoryId: string) => void;
}) {
  const categoriesWithSkills = useMemo(
    () => module.categories.filter((category) => CHINESE_SKILL_LEAVES.some((leaf) => leaf.categoryId === category.id)),
    [module.categories]
  );
  const sections = useMemo(() => buildCategorySections(categoriesWithSkills), [categoriesWithSkills]);

  return (
    <div className="mt-5 space-y-6">
      {sections.map((section) => (
        <section key={section.key} className="space-y-4">
          {section.title ? (
            <div className="border-b border-border/70 pb-2">
              <h2 className="text-xl font-bold tracking-tight text-foreground">{section.title}</h2>
            </div>
          ) : null}

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {section.categories.map((category) => {
              const skillLeaves = CHINESE_SKILL_LEAVES.filter((leaf) => leaf.categoryId === category.id);

              return (
                <CategoryDirectoryButton
                  key={category.id}
                  title={category.name}
                  subtitle={`${skillLeaves.length} 个技巧卡片${category.overview ? ` · ${category.overview}` : ""}`}
                  className="border-border/90 bg-card hover:border-accent/55 hover:bg-accent-soft/20"
                  onClick={() => onSelectCategory(category.id)}
                />
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}

function SkillCategoryDetail({
  module,
  category,
  highlightId,
  skillRefs,
  onBack,
}: {
  module: ChineseModule;
  category: ChineseModule["categories"][number];
  highlightId: string | null;
  skillRefs: React.MutableRefObject<Record<string, HTMLDivElement | null>>;
  onBack: () => void;
}) {
  const skillLeaves = CHINESE_SKILL_LEAVES.filter((leaf) => leaf.categoryId === category.id);
  const breadcrumb = [module.name, category.group, category.name].filter(Boolean).join(" / ");

  return (
    <div className="mt-5 space-y-4">
      <DirectoryBackButton label="返回技巧目录" onClick={onBack} />

      <section className="rounded-3xl border border-border/80 bg-card/70 px-5 py-5 shadow-sm">
        <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">{breadcrumb}</p>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">{category.name}</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          {category.overview ?? `共收录 ${skillLeaves.length} 张技巧卡片，本页将直接展示全部卡片内容。`}
        </p>
      </section>

      <div className="space-y-4">
        {skillLeaves.map((leaf) => (
          <SkillLeafCard key={leaf.id} leaf={leaf} highlightId={highlightId} skillRefs={skillRefs} />
        ))}
      </div>
    </div>
  );
}

export function ChineseKnowledgePanel({
  activeModuleId,
  onActiveModuleIdChange,
  selectedCategoryId,
  onSelectedCategoryIdChange,
  highlightId,
  knowledgeRefs,
  knowledgeFrequencies,
  searchQuery = "",
}: ChineseKnowledgePanelProps) {
  const normalizedSearchQuery = useMemo(
    () => normalizeKnowledgeSearchText(searchQuery.trim()),
    [searchQuery]
  );

  const activeModule =
    CHINESE_KNOWLEDGE_MODULES.find((module) => module.id === activeModuleId) ?? CHINESE_KNOWLEDGE_MODULES[0];
  const selectedCategory = activeModule.categories.find((category) => category.id === selectedCategoryId) ?? null;

  useEffect(() => {
    if (selectedCategoryId && !selectedCategory) {
      onSelectedCategoryIdChange(null);
    }
  }, [onSelectedCategoryIdChange, selectedCategory, selectedCategoryId]);

  const matchedLeaves = useMemo(() => {
    if (!normalizedSearchQuery) return [];

    return CHINESE_KNOWLEDGE_LEAVES.filter((leaf) =>
      matchesKnowledgeSearch(normalizedSearchQuery, [
        leaf.title,
        leaf.selectorLabel,
        leaf.pathLabel,
        leaf.categoryName,
        leaf.categoryGroup,
        ...leaf.examFormat,
        ...leaf.realExamExamples,
        ...leaf.answeringStrategy,
        ...leaf.universalTemplate,
        ...leaf.highlights.map((item) => `${item.label} ${item.content}`),
      ])
    );
  }, [normalizedSearchQuery]);

  return (
    <div>
      <ModuleTabs
        modules={CHINESE_KNOWLEDGE_MODULES}
        activeModuleId={activeModule.id}
        onActiveModuleIdChange={(id) => {
          onActiveModuleIdChange(id);
          onSelectedCategoryIdChange(null);
        }}
      />

      {normalizedSearchQuery ? (
        <div className="mt-5 space-y-4">
          {matchedLeaves.length > 0 ? (
            matchedLeaves.map((leaf) => (
              <KnowledgeLeafCard
                key={leaf.id}
                leaf={leaf}
                highlightId={highlightId}
                knowledgeRefs={knowledgeRefs}
                knowledgeFrequencies={knowledgeFrequencies}
              />
            ))
          ) : (
            <div className="rounded-2xl border border-dashed border-border/80 bg-card/70 px-5 py-8 text-center">
              <p className="text-sm font-medium text-foreground">没有找到相关的知识点，请换个关键词试试</p>
            </div>
          )}
        </div>
      ) : selectedCategory ? (
        <KnowledgeCategoryDetail
          module={activeModule}
          category={selectedCategory}
          highlightId={highlightId}
          knowledgeRefs={knowledgeRefs}
          knowledgeFrequencies={knowledgeFrequencies}
          onBack={() => onSelectedCategoryIdChange(null)}
        />
      ) : (
        <KnowledgeCategoryDirectory
          module={activeModule}
          knowledgeFrequencies={knowledgeFrequencies}
          onSelectCategory={onSelectedCategoryIdChange}
        />
      )}
    </div>
  );
}

export function ChineseSkillPanel({
  activeModuleId,
  onActiveModuleIdChange,
  selectedCategoryId,
  onSelectedCategoryIdChange,
  highlightId,
  skillRefs,
}: ChineseSkillPanelProps) {
  const activeModule =
    CHINESE_KNOWLEDGE_MODULES.find((module) => module.id === activeModuleId) ?? CHINESE_KNOWLEDGE_MODULES[0];
  const selectedCategory = activeModule.categories.find((category) => category.id === selectedCategoryId) ?? null;

  useEffect(() => {
    if (selectedCategoryId && !selectedCategory) {
      onSelectedCategoryIdChange(null);
    }
  }, [onSelectedCategoryIdChange, selectedCategory, selectedCategoryId]);

  return (
    <div>
      <ModuleTabs
        modules={CHINESE_KNOWLEDGE_MODULES}
        activeModuleId={activeModule.id}
        onActiveModuleIdChange={(id) => {
          onActiveModuleIdChange(id);
          onSelectedCategoryIdChange(null);
        }}
      />

      {selectedCategory ? (
        <SkillCategoryDetail
          module={activeModule}
          category={selectedCategory}
          highlightId={highlightId}
          skillRefs={skillRefs}
          onBack={() => onSelectedCategoryIdChange(null)}
        />
      ) : (
        <SkillCategoryDirectory module={activeModule} onSelectCategory={onSelectedCategoryIdChange} />
      )}
    </div>
  );
}
