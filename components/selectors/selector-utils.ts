export type HighlightedTextPart = {
  text: string;
  highlighted: boolean;
};

export function normalizeSelectorText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

export function getSelectorTextKey(value: string): string {
  return normalizeSelectorText(value).toLowerCase();
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function appendUniqueSelectorValue(current: string[], candidate: string, options: string[]): string[] {
  const normalizedCandidate = normalizeSelectorText(candidate);
  if (!normalizedCandidate) return current;

  const candidateKey = getSelectorTextKey(normalizedCandidate);
  const canonicalValue =
    options.find((item) => getSelectorTextKey(item) === candidateKey) ?? normalizedCandidate;

  if (current.some((item) => getSelectorTextKey(item) === getSelectorTextKey(canonicalValue))) {
    return current;
  }

  return [...current, canonicalValue];
}

export function getHighlightedTextParts(label: string, query: string): HighlightedTextPart[] {
  const normalizedQuery = normalizeSelectorText(query);
  if (!normalizedQuery) {
    return [{ text: label, highlighted: false }];
  }

  const parts = label.split(new RegExp(`(${escapeRegExp(normalizedQuery)})`, "ig"));
  if (parts.length === 1) {
    return [{ text: label, highlighted: false }];
  }

  return parts
    .filter((part) => part.length > 0)
    .map((part) => ({
      text: part,
      highlighted: part.toLowerCase() === normalizedQuery.toLowerCase(),
    }));
}
