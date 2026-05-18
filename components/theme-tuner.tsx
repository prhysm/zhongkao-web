"use client";

import { ChangeEvent, useEffect, useState } from "react";

const STORAGE_KEY = "zhongkao-theme-tuner";
const PANEL_OPEN_KEY = "zhongkao-theme-tuner-open";

type ThemeTunerSettings = {
  cardAlpha: number;
  blurPx: number;
  glow: number;
  radius: number;
};

const DEFAULT_SETTINGS: ThemeTunerSettings = {
  cardAlpha: 0.88,
  blurPx: 12,
  glow: 0.55,
  radius: 24,
};

/** 毛玻璃模糊过大时，多卡片叠加易导致 GPU 过载甚至整机假死，故硬性上限 */
const MAX_BLUR_PX = 20;

function clampSettings(s: ThemeTunerSettings): ThemeTunerSettings {
  return {
    ...s,
    cardAlpha: Math.min(1, Math.max(0.05, s.cardAlpha)),
    blurPx: Math.min(MAX_BLUR_PX, Math.max(0, s.blurPx)),
    glow: Math.min(1, Math.max(0, s.glow)),
    radius: Math.min(56, Math.max(0, s.radius)),
  };
}

function getStoredSettings(): ThemeTunerSettings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return DEFAULT_SETTINGS;
  try {
    const parsed = JSON.parse(raw) as Partial<ThemeTunerSettings>;
    return clampSettings({
      cardAlpha: typeof parsed.cardAlpha === "number" ? parsed.cardAlpha : DEFAULT_SETTINGS.cardAlpha,
      blurPx: typeof parsed.blurPx === "number" ? parsed.blurPx : DEFAULT_SETTINGS.blurPx,
      glow: typeof parsed.glow === "number" ? parsed.glow : DEFAULT_SETTINGS.glow,
      radius: typeof parsed.radius === "number" ? parsed.radius : DEFAULT_SETTINGS.radius,
    });
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function getStoredPanelOpen(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(PANEL_OPEN_KEY) === "true";
}

export function ThemeTuner() {
  const [settings, setSettings] = useState<ThemeTunerSettings>(getStoredSettings);
  const [open, setOpen] = useState(getStoredPanelOpen);

  useEffect(() => {
    const safe = clampSettings(settings);
    const root = document.documentElement;
    const body = document.body;
    root.style.setProperty("--tuner-card-alpha", String(safe.cardAlpha));
    root.style.setProperty("--tuner-blur-px", `${safe.blurPx}px`);
    root.style.setProperty("--tuner-glow-strength", String(safe.glow));
    root.style.setProperty("--tuner-radius", `${safe.radius}px`);
    body.style.setProperty("--tuner-card-alpha", String(safe.cardAlpha));
    body.style.setProperty("--tuner-blur-px", `${safe.blurPx}px`);
    body.style.setProperty("--tuner-glow-strength", String(safe.glow));
    body.style.setProperty("--tuner-radius", `${safe.radius}px`);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(safe));
  }, [settings]);

  useEffect(() => {
    window.localStorage.setItem(PANEL_OPEN_KEY, String(open));
  }, [open]);

  const onNumberChange =
    (key: keyof ThemeTunerSettings) => (event: ChangeEvent<HTMLInputElement>) => {
      const value = Number(event.target.value);
      setSettings((prev) => clampSettings({ ...prev, [key]: value }));
    };

  const reset = () => setSettings(DEFAULT_SETTINGS);
  const debugText = `cardAlpha=${settings.cardAlpha.toFixed(2)} · blurPx=${settings.blurPx}px · glow=${settings.glow.toFixed(2)} · radius=${settings.radius}px`;

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed right-4 bottom-4 z-50 flex h-12 w-12 items-center justify-center rounded-full border border-border bg-card/95 text-muted-foreground shadow-[0_14px_30px_rgba(0,0,0,0.25)] transition hover:border-accent/70 hover:text-foreground print:hidden"
        aria-label="打开主题细节微调面板"
        title="主题细节微调"
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M3 7h8M3 17h4M13 17h8M17 7h4" />
          <circle cx="13" cy="7" r="2.5" />
          <circle cx="9" cy="17" r="2.5" />
        </svg>
      </button>
    );
  }

  return (
    <aside className="fixed right-4 bottom-4 z-50 w-72 rounded-2xl border border-border bg-card/95 p-4 shadow-[0_20px_50px_rgba(0,0,0,0.2)] print:hidden">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Theme Tuner</p>
          <p className="mt-1 text-sm font-medium">主题细节微调面板</p>
        </div>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-md border border-border px-2 py-1 text-[11px] text-muted-foreground transition hover:border-accent/70 hover:text-foreground"
        >
          收起
        </button>
      </div>

      <div className="mt-4 space-y-3">
        <label className="block">
          <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
            <span>卡片透明度</span>
            <span>{settings.cardAlpha.toFixed(2)}</span>
          </div>
          <input
            type="range"
            min="0.05"
            max="1"
            step="0.01"
            value={settings.cardAlpha}
            onChange={onNumberChange("cardAlpha")}
            className="w-full"
          />
        </label>

        <label className="block">
          <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
            <span>毛玻璃模糊</span>
            <span>{settings.blurPx}px</span>
          </div>
          <input
            type="range"
            min="0"
            max={MAX_BLUR_PX}
            step="1"
            value={settings.blurPx}
            onChange={onNumberChange("blurPx")}
            className="w-full"
          />
        </label>

        <label className="block">
          <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
            <span>标签光晕强度</span>
            <span>{settings.glow.toFixed(2)}</span>
          </div>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={settings.glow}
            onChange={onNumberChange("glow")}
            className="w-full"
          />
        </label>

        <label className="block">
          <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
            <span>卡片圆角</span>
            <span>{settings.radius}px</span>
          </div>
          <input
            type="range"
            min="0"
            max="56"
            step="1"
            value={settings.radius}
            onChange={onNumberChange("radius")}
            className="w-full"
          />
        </label>
      </div>

      <div className="mt-4 rounded-xl border border-border bg-background/40 p-3">
        <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Preview</p>
        <div className="mt-2 frosted-card p-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Frosted card</span>
            <span className="glow-tab rounded-full border border-border bg-card px-2 py-1 text-[11px] text-muted-foreground">
              hover
            </span>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">{debugText}</p>
        </div>
      </div>

      <button
        type="button"
        onClick={reset}
        className="mt-4 h-9 w-full rounded-lg border border-border text-xs tracking-wide text-muted-foreground transition hover:border-accent/70 hover:text-foreground"
      >
        恢复默认
      </button>
    </aside>
  );
}
