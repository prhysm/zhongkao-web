"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { getSelectorTextKey, normalizeSelectorText } from "./selector-utils";

type CreatableSelectProps = {
  label: string;
  value: string;
  onChange: (next: string) => void;
  options: string[];
  placeholder: string;
};

export function CreatableSelect({
  label,
  value,
  onChange,
  options,
  placeholder,
}: CreatableSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const list = useMemo(() => {
    const q = getSelectorTextKey(value);
    if (!q) return [];
    return options.filter((item) => getSelectorTextKey(item).includes(q)).slice(0, 8);
  }, [value, options]);

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

  const showDropdown = isOpen && normalizeSelectorText(value).length > 0 && list.length > 0;

  return (
    <div ref={containerRef} className="relative">
      <label className="text-sm text-muted-foreground">{label}</label>
      <input
        value={value}
        onChange={(event) => {
          const next = event.target.value;
          onChange(next);
          setIsOpen(normalizeSelectorText(next).length > 0);
        }}
        onFocus={() => {
          if (normalizeSelectorText(value).length > 0 && list.length > 0) setIsOpen(true);
        }}
        placeholder={placeholder}
        className="mt-2 h-10 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none transition focus:border-accent/70"
        autoComplete="off"
      />
      {showDropdown ? (
        <div className="absolute inset-x-0 top-full z-30 mt-2 max-h-60 overflow-y-auto rounded-2xl border border-border/80 bg-card shadow-[0_18px_40px_rgba(15,23,42,0.16)] backdrop-blur-sm">
          <div className="py-1.5">
            {list.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => {
                  onChange(item);
                  setIsOpen(false);
                }}
                className="block w-full px-3 py-2 text-left text-sm text-foreground transition hover:bg-accent-soft/70"
              >
                {item}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
