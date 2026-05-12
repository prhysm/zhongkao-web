export type KnowledgeFrequencyTone = "none" | "warning" | "danger";

export function getKnowledgeFrequencyTone(count: number): KnowledgeFrequencyTone {
  if (count >= 3) return "danger";
  if (count >= 1) return "warning";
  return "none";
}

export function getKnowledgeFrequencyMeta(count: number): {
  tone: KnowledgeFrequencyTone;
  surfaceClassName: string;
  interactiveSurfaceClassName: string;
  badgeClassName: string;
  badgeLabel: string | null;
} {
  const tone = getKnowledgeFrequencyTone(count);

  if (tone === "danger") {
    return {
      tone,
      surfaceClassName: "border-rose-300/70 bg-rose-50/90 dark:border-rose-400/30 dark:bg-rose-500/10",
      interactiveSurfaceClassName: "hover:border-rose-400/80 hover:bg-rose-100/90 dark:hover:bg-rose-500/15",
      badgeClassName: "border-rose-500/35 bg-rose-500/10 text-rose-700 dark:text-rose-300",
      badgeLabel: `薄弱 ${count} 次`,
    };
  }

  if (tone === "warning") {
    return {
      tone,
      surfaceClassName: "border-amber-300/70 bg-amber-50/90 dark:border-amber-400/30 dark:bg-amber-500/10",
      interactiveSurfaceClassName: "hover:border-amber-400/80 hover:bg-amber-100/90 dark:hover:bg-amber-500/15",
      badgeClassName: "border-amber-500/35 bg-amber-500/10 text-amber-700 dark:text-amber-300",
      badgeLabel: `关注 ${count} 次`,
    };
  }

  return {
    tone,
    surfaceClassName: "border-border/90 bg-card",
    interactiveSurfaceClassName: "hover:border-accent/55 hover:bg-accent-soft/25",
    badgeClassName: "border-border/80 bg-card text-muted-foreground",
    badgeLabel: null,
  };
}
