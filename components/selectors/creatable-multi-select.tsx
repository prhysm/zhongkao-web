"use client";

import { ReactNode, useEffect, useId, useMemo, useRef, useState } from "react";
import {
  appendUniqueSelectorValue,
  getHighlightedTextParts,
  getSelectorTextKey,
  normalizeSelectorText,
} from "./selector-utils";

type CreatableMultiSelectProps = {
  label: string;
  value: string[];
  inputValue: string;
  onInputChange: (next: string) => void;
  onChange: (next: string[]) => void;
  options: string[];
  placeholder: string;
  continuePlaceholder?: string;
  emptyStateText?: string;
  createOptionLabel?: (value: string) => string;
  removeItemAriaLabel?: (item: string) => string;
};

function renderHighlightedOptionLabel(label: string, query: string): ReactNode {
  return getHighlightedTextParts(label, query).map((part, index) =>
    part.highlighted ? (
      <mark key={`${part.text}-${index}`} className="rounded bg-accent/20 px-0.5 text-foreground">
        {part.text}
      </mark>
    ) : (
      <span key={`${part.text}-${index}`}>{part.text}</span>
    )
  );
}

export function CreatableMultiSelect({
  label,
  value,
  inputValue,
  onInputChange,
  onChange,
  options,
  placeholder,
  continuePlaceholder = "继续搜索下一个标签",
  emptyStateText = "未找到匹配项，按回车可添加自定义项。",
  createOptionLabel = (next) => `添加 “${next}”`,
  removeItemAriaLabel = (item) => `删除 ${label} ${item}`,
}: CreatableMultiSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const optionRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const listboxId = useId();
  const selectedKeys = useMemo(() => new Set(value.map((item) => getSelectorTextKey(item))), [value]);
  const list = useMemo(() => {
    const q = getSelectorTextKey(inputValue);
    if (!q) return [];

    return options
      .filter((item) => !selectedKeys.has(getSelectorTextKey(item)))
      .filter((item) => getSelectorTextKey(item).includes(q))
      .slice(0, 8);
  }, [inputValue, options, selectedKeys]);

  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
    };
  }, [isOpen]);

  const normalizedInputValue = normalizeSelectorText(inputValue);
  const inputValueKey = getSelectorTextKey(inputValue);
  const showPanel = isOpen && normalizedInputValue.length > 0;
  const showDropdown = showPanel && list.length > 0;
  const showEmptyState = showPanel && list.length === 0;
  const canCreateCustomOption =
    showPanel &&
    normalizedInputValue.length > 0 &&
    !selectedKeys.has(inputValueKey) &&
    !options.some((item) => getSelectorTextKey(item) === inputValueKey);
  const navigableOptionCount = list.length + (canCreateCustomOption ? 1 : 0);
  const activeIndex =
    navigableOptionCount > 0 ? Math.min(highlightedIndex, navigableOptionCount - 1) : -1;
  const isCreateOptionActive = canCreateCustomOption && activeIndex === list.length;

  useEffect(() => {
    if (!showPanel || activeIndex < 0) return;
    optionRefs.current[activeIndex]?.scrollIntoView({ block: "nearest" });
  }, [showPanel, activeIndex]);

  const commitSelection = (candidate: string) => {
    onChange(appendUniqueSelectorValue(value, candidate, options));
    onInputChange("");
    setIsOpen(false);
    setHighlightedIndex(0);
    window.requestAnimationFrame(() => inputRef.current?.focus());
  };

  return (
    <div ref={containerRef} className="relative">
      <label className="text-sm text-muted-foreground">{label}</label>
      <div
        className="mt-2 flex min-h-10 w-full cursor-text flex-wrap items-center gap-2 rounded-xl border border-border bg-background px-3 py-2 text-sm transition focus-within:border-accent/70"
        onClick={() => inputRef.current?.focus()}
      >
        {value.map((item) => (
          <span
            key={item}
            className="inline-flex max-w-full items-center gap-1 rounded-full border border-accent/45 bg-accent-soft px-2.5 py-1 text-xs text-foreground"
          >
            <span className="max-w-[18rem] truncate">{item}</span>
            <button
              type="button"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => {
                onChange(value.filter((selected) => getSelectorTextKey(selected) !== getSelectorTextKey(item)));
                window.requestAnimationFrame(() => inputRef.current?.focus());
              }}
              className="text-muted-foreground transition hover:text-foreground"
              aria-label={removeItemAriaLabel(item)}
            >
              ×
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          value={inputValue}
          onChange={(event) => {
            const next = event.target.value;
            onInputChange(next);
            setIsOpen(normalizeSelectorText(next).length > 0);
            setHighlightedIndex(0);
          }}
          onFocus={() => {
            if (normalizedInputValue.length > 0) {
              setIsOpen(true);
              setHighlightedIndex(0);
            }
          }}
          onKeyDown={(event) => {
            if ((event.key === "ArrowDown" || event.key === "ArrowUp") && navigableOptionCount > 0) {
              event.preventDefault();
              if (!showPanel) {
                setIsOpen(true);
                setHighlightedIndex(event.key === "ArrowDown" ? 0 : navigableOptionCount - 1);
                return;
              }

              setHighlightedIndex((current) => {
                const safeCurrent = Math.min(current, navigableOptionCount - 1);
                if (event.key === "ArrowDown") {
                  return safeCurrent >= navigableOptionCount - 1 ? 0 : safeCurrent + 1;
                }
                return safeCurrent <= 0 ? navigableOptionCount - 1 : safeCurrent - 1;
              });
              return;
            }

            if (event.key === "Enter" && showPanel && activeIndex >= 0) {
              event.preventDefault();
              if (activeIndex < list.length) {
                commitSelection(list[activeIndex]);
              } else if (canCreateCustomOption) {
                commitSelection(normalizedInputValue);
              }
              return;
            }

            if (event.key === "Enter" && normalizedInputValue.length > 0) {
              event.preventDefault();
              commitSelection(inputValue);
              return;
            }

            if (event.key === "Escape" && showPanel) {
              event.preventDefault();
              setIsOpen(false);
              setHighlightedIndex(0);
              return;
            }

            if (event.key === "Backspace" && normalizedInputValue.length === 0 && value.length > 0) {
              onChange(value.slice(0, -1));
            }
          }}
          placeholder={value.length === 0 ? placeholder : continuePlaceholder}
          className="min-w-[10rem] flex-1 bg-transparent py-1 text-sm outline-none placeholder:text-muted-foreground"
          autoComplete="off"
          role="combobox"
          aria-expanded={showPanel}
          aria-controls={showPanel ? listboxId : undefined}
          aria-activedescendant={
            showPanel && activeIndex >= 0
              ? activeIndex < list.length
                ? `${listboxId}-option-${activeIndex}`
                : `${listboxId}-option-create`
              : undefined
          }
        />
      </div>
      {showPanel ? (
        <div
          id={listboxId}
          role="listbox"
          className="absolute inset-x-0 top-full z-30 mt-2 max-h-60 overflow-y-auto rounded-2xl border border-border/80 bg-card shadow-[0_18px_40px_rgba(15,23,42,0.16)] backdrop-blur-sm"
        >
          {showDropdown ? (
            <div className="py-1.5">
              {list.map((item, index) => (
                <button
                  key={item}
                  id={`${listboxId}-option-${index}`}
                  ref={(element) => {
                    optionRefs.current[index] = element;
                  }}
                  type="button"
                  role="option"
                  aria-selected={activeIndex === index}
                  onMouseDown={(event) => event.preventDefault()}
                  onMouseEnter={() => setHighlightedIndex(index)}
                  onClick={() => commitSelection(item)}
                  className={`block w-full px-3 py-2 text-left text-sm text-foreground transition ${
                    activeIndex === index ? "bg-accent-soft/80" : "hover:bg-accent-soft/70"
                  }`}
                >
                  {renderHighlightedOptionLabel(item, inputValue)}
                </button>
              ))}
            </div>
          ) : null}
          {showEmptyState ? (
            <div className="px-3 pt-3 text-sm text-muted-foreground">{emptyStateText}</div>
          ) : null}
          {canCreateCustomOption ? (
            <div className={showDropdown ? "border-t border-border/70 p-1.5" : "p-1.5 pt-2"}>
              <button
                id={`${listboxId}-option-create`}
                ref={(element) => {
                  optionRefs.current[list.length] = element;
                }}
                type="button"
                role="option"
                aria-selected={isCreateOptionActive}
                onMouseDown={(event) => event.preventDefault()}
                onMouseEnter={() => setHighlightedIndex(list.length)}
                onClick={() => commitSelection(normalizedInputValue)}
                className={`block w-full rounded-xl px-3 py-2 text-left text-sm text-foreground transition ${
                  isCreateOptionActive ? "bg-accent-soft/80" : "hover:bg-accent-soft/70"
                }`}
              >
                {createOptionLabel(normalizedInputValue)}
              </button>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
