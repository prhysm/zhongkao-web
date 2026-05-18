import type { MistakeItem } from "@/lib/mistakes-model";

const CSV_HEADERS = ["科目", "出处", "知识点", "错误原因", "解题技巧"] as const;

export function displayMistakeField(value: string | undefined | null): string {
  const trimmed = (value ?? "").trim();
  return trimmed.length > 0 ? trimmed : "-";
}

export function formatMistakeKnowledge(knowledge: string[] | undefined): string {
  const items = (knowledge ?? []).map((value) => value.trim()).filter(Boolean);
  return items.length > 0 ? items.join("、") : "-";
}

function escapeCsvField(value: string): string {
  const normalized = value.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  if (/[",\n]/.test(normalized)) {
    return `"${normalized.replace(/"/g, '""')}"`;
  }
  return normalized;
}

export function getMistakeCsvFilename(subjectLabel?: string, date = new Date()): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  const subjectPart = subjectLabel?.trim()
    ? `_${subjectLabel.trim().replace(/[/\\:*?"<>|]/g, "")}`
    : "";
  return `我的错题本${subjectPart}_${year}${month}${day}.csv`;
}

export function exportToCSV(data: MistakeItem[], subjectLabel?: string): void {
  const rows = data.map((item) => [
    displayMistakeField(item.subject),
    displayMistakeField(item.source),
    formatMistakeKnowledge(item.knowledge),
    displayMistakeField(item.reason),
    displayMistakeField(item.skill),
  ]);

  const csvContent = [
    CSV_HEADERS.join(","),
    ...rows.map((row) => row.map(escapeCsvField).join(",")),
  ].join("\n");

  const blob = new Blob(["\uFEFF", csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = getMistakeCsvFilename(subjectLabel);
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
