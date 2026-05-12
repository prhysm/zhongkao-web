/**
 * 知识点「章节目录」排序：支持历史册别、道法「年级册 + 中文单元」、
 * 化学主题与阿拉伯数字章节；无法识别的名称稳定置于末尾（保留输入顺序）。
 */

const CN_DIGIT: Record<string, number> = {
  零: 0,
  一: 1,
  二: 2,
  三: 3,
  四: 4,
  五: 5,
  六: 6,
  七: 7,
  八: 8,
  九: 9,
};

/** 道法册序：七年级上册 < … < 九年级下册（与年级×上下册公式一致） */
const GRADE_TERM_WEIGHT: Record<string, number> = {
  七: 0,
  八: 1,
  九: 2,
};

/** 「第X章」「X. 标题」等形式中的首个阿拉伯数字章节序号 */
export function extractNumericChapterOrder(chapter: string): number | null {
  const trimmed = chapter.trim();
  const mChapter = trimmed.match(/第\s*(\d+)\s*章/);
  if (mChapter) {
    const n = parseInt(mChapter[1], 10);
    return Number.isFinite(n) ? n : null;
  }
  const mDot = trimmed.match(/^(\d+)\s*\./);
  if (mDot) {
    const n = parseInt(mDot[1], 10);
    return Number.isFinite(n) ? n : null;
  }
  const mAny = trimmed.match(/(\d+)/);
  if (mAny) {
    const n = parseInt(mAny[1], 10);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

/**
 * 将「第一单元」中的「一…」转为整数（支持一至九十九常见写法）。
 */
export function chineseUnitNumeralToInt(raw: string): number | null {
  const s = raw.trim();
  if (!s) return null;

  if (s.length === 1) {
    const d = CN_DIGIT[s];
    return d !== undefined ? d : null;
  }

  if (s[0] === "十") {
    if (s.length === 1) return 10;
    const rest = CN_DIGIT[s[1]];
    return rest !== undefined ? 10 + rest : null;
  }

  if (s.includes("十")) {
    const parts = s.split("十");
    if (parts.length === 2) {
      const tensPart = parts[0];
      const onesPart = parts[1];
      const tens = tensPart ? CN_DIGIT[tensPart] ?? 1 : 1;
      const ones = onesPart ? CN_DIGIT[onesPart] ?? 0 : 0;
      return tens * 10 + ones;
    }
  }

  return null;
}

/** 形如「七年级上册 - 第一单元 xxx」 */
const POL_CHAPTER_RE =
  /^(七|八|九)年级(上|下)册\s*[-–—]\s*第([一二三四五六七八九十百千零]+)单元/;

export type PolChapterKey = { vol: number; unit: number };

export function parsePolChapterKey(chapter: string): PolChapterKey | null {
  const m = chapter.trim().match(POL_CHAPTER_RE);
  if (!m) return null;
  const gradeChar = m[1];
  const term = m[2];
  const unitRaw = m[3];

  const gradeW = GRADE_TERM_WEIGHT[gradeChar];
  if (gradeW === undefined) return null;

  const vol = gradeW * 2 + (term === "上" ? 0 : 1);
  const unit = chineseUnitNumeralToInt(unitRaw);
  if (unit === null) return null;

  return { vol, unit };
}

/** 历史 book 排序：七上 < 七下 < 八上 < 八下 < 九上 < 九下 */
const HISTORY_BOOK_RE = /^(七|八|九)(上|下)(?:\s|$)/;

export type HistoryBookKey = { vol: number };

export function parseHistoryBookKey(chapter: string): HistoryBookKey | null {
  const m = chapter.trim().match(HISTORY_BOOK_RE);
  if (!m) return null;
  const gradeChar = m[1];
  const term = m[2];

  const gradeW = GRADE_TERM_WEIGHT[gradeChar];
  if (gradeW === undefined) return null;

  return { vol: gradeW * 2 + (term === "上" ? 0 : 1) };
}

const HISTORY_UNIT_RE = /^第([一二三四五六七八九十百千零]+)单元/;

export function parseHistoryUnitOrder(title: string): number | null {
  const m = title.trim().match(HISTORY_UNIT_RE);
  if (!m) return null;
  return chineseUnitNumeralToInt(m[1]);
}

/** 初中化学「主题一 …」等大组排序用 */
const CHEM_THEME_RE = /^主题([一二三四五六七八九十0-9]+)/;

export function parseChemThemeOrder(chapter: string): number | null {
  const m = chapter.trim().match(CHEM_THEME_RE);
  if (!m) return null;
  const raw = m[1];
  if (/^\d+$/.test(raw)) {
    const n = parseInt(raw, 10);
    return Number.isFinite(n) ? n : null;
  }
  return chineseUnitNumeralToInt(raw);
}

type SortTier = "history" | "pol" | "chem" | "numeric" | "fallback";

type SortKey =
  | { tier: "history"; vol: number }
  | { tier: "numeric"; n: number }
  | { tier: "pol"; vol: number; unit: number }
  | { tier: "chem"; n: number }
  | { tier: "fallback" };

function getChapterSortKey(chapter: string): SortKey {
  const history = parseHistoryBookKey(chapter);
  if (history) return { tier: "history", vol: history.vol };

  const pol = parsePolChapterKey(chapter);
  if (pol) return { tier: "pol", vol: pol.vol, unit: pol.unit };

  const chem = parseChemThemeOrder(chapter);
  if (chem !== null) return { tier: "chem", n: chem };

  const n = extractNumericChapterOrder(chapter);
  if (n !== null) return { tier: "numeric", n };

  return { tier: "fallback" };
}

const TIER_ORDER: Record<SortTier, number> = {
  history: 0,
  pol: 1,
  chem: 2,
  numeric: 3,
  fallback: 4,
};

function compareKeys(a: SortKey, b: SortKey): number {
  const ta = TIER_ORDER[a.tier];
  const tb = TIER_ORDER[b.tier];
  if (ta !== tb) return ta - tb;

  if (a.tier === "history" && b.tier === "history") return a.vol - b.vol;
  if (a.tier === "numeric" && b.tier === "numeric") return a.n - b.n;
  if (a.tier === "chem" && b.tier === "chem") return a.n - b.n;
  if (a.tier === "pol" && b.tier === "pol") {
    if (a.vol !== b.vol) return a.vol - b.vol;
    return a.unit - b.unit;
  }
  return 0;
}

/**
 * 对章节标题列表智能排序；同键时保持原有顺序（稳定）。
 */
export function sortChapters(chapters: string[]): string[] {
  const indexed = chapters.map((chapter, index) => ({ chapter, index }));
  indexed.sort((x, y) => {
    const cmp = compareKeys(getChapterSortKey(x.chapter), getChapterSortKey(y.chapter));
    if (cmp !== 0) return cmp;
    return x.index - y.index;
  });
  return indexed.map((x) => x.chapter);
}
