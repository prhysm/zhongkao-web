import { DailyEmotionalQuote } from "@/components/daily-emotional-quote";
import { HomeShell } from "@/components/home-shell";
import { ThemeTuner } from "@/components/theme-tuner";

export default function Home() {
  return (
    <main className="app-bg min-h-screen print:bg-white">
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-border/80 bg-background/90 supports-[backdrop-filter]:bg-background/75 supports-[backdrop-filter]:backdrop-blur-sm print:hidden">
        <div className="relative mx-auto h-14 max-w-7xl px-4 sm:px-6">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-medium leading-none tracking-[0.15em] uppercase sm:left-6">
            中考冲刺
          </span>
          <div className="flex h-full items-center justify-center px-24 sm:px-32 lg:px-40">
            <DailyEmotionalQuote />
          </div>
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-right text-xs leading-none text-muted-foreground sm:right-6">
            上海 · 2026
          </span>
        </div>
      </header>

      <HomeShell />
      <ThemeTuner />
    </main>
  );
}
