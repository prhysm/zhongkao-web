export const DAILY_EMOTIONAL_QUOTES = [
  "不要去想能考多少分，只关注眼下的这一道题。",
  "先把呼吸放慢，再把思路理清。",
  "你现在做的每一道题，都在给明天加分。",
  "紧张说明你在认真，把它变成专注就好。",
  "一题一题来，比分数更重要的是节奏。",
  "不会的先放一放，稳稳拿下会的那部分。",
  "今天的任务不是完美，而是向前。",
  "当下这一分钟的专注，比担心一整天更有用。",
  "别和想象中的结果较劲，先和眼前的题目合作。",
  "你不是要一下子赢下中考，你只是先写好这一题。",
  "稳定发挥，本身就是一种很强的能力。",
  "会紧张很正常，但你依然可以一步一步做对。",
  "把注意力收回来，答案常常就在下一步里。",
  "复习不是证明自己不行，而是在把会的东西变得更稳。",
  "焦虑不会替你答题，专注才会。",
  "今天只做今天的事，今天就已经很了不起。",
  "慢一点没关系，稳下来就会快起来。",
  "你的任务不是预测结果，而是完成过程。",
  "分数在终点，节奏在现在，先守住现在。",
  "把心放稳，把笔拿稳，你就已经进入状态了。",
] as const;

const SHANGHAI_DATE_FORMATTER = new Intl.DateTimeFormat("en-US", {
  timeZone: "Asia/Shanghai",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export const DEFAULT_DAILY_EMOTIONAL_QUOTE = DAILY_EMOTIONAL_QUOTES[0];

function getShanghaiDateKey(date: Date): string {
  const parts = SHANGHAI_DATE_FORMATTER.formatToParts(date);
  const year = parts.find((part) => part.type === "year")?.value ?? "2026";
  const month = parts.find((part) => part.type === "month")?.value ?? "01";
  const day = parts.find((part) => part.type === "day")?.value ?? "01";
  return `${year}-${month}-${day}`;
}

function hashString(value: string): number {
  let hash = 0;

  for (const char of value) {
    hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  }

  return hash;
}

export function getDailyEmotionalQuote(date: Date = new Date()): string {
  const dateKey = getShanghaiDateKey(date);
  const index = hashString(dateKey) % DAILY_EMOTIONAL_QUOTES.length;
  return DAILY_EMOTIONAL_QUOTES[index] ?? DEFAULT_DAILY_EMOTIONAL_QUOTE;
}
