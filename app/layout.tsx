import type { Metadata } from "next";
import Script from "next/script";
import { Geist, Geist_Mono } from "next/font/google";
import { Providers } from "./providers";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "中考冲刺",
  description: "中考倒计时与错题本",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/npm/katex@0.16.45/dist/katex.min.css"
          crossOrigin="anonymous"
        />
        <Script
          src="https://cdn.jsdelivr.net/npm/katex@0.16.45/dist/katex.min.js"
          strategy="afterInteractive"
          crossOrigin="anonymous"
        />
        <Script
          src="https://cdn.jsdelivr.net/npm/katex@0.16.45/dist/contrib/auto-render.min.js"
          strategy="afterInteractive"
          crossOrigin="anonymous"
        />
        <Script
          id="katex-auto-render-config"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              (() => {
                const delimiters = [
                  { left: "$$", right: "$$", display: true },
                  { left: "\\\\[", right: "\\\\]", display: true },
                  { left: "$", right: "$", display: false },
                  { left: "\\\\(", right: "\\\\)", display: false }
                ];

                const renderRoot = (root) => {
                  if (!root || !window.renderMathInElement) return;
                  window.renderMathInElement(root, {
                    delimiters,
                    throwOnError: false,
                    strict: "ignore"
                  });
                };

                const renderKnownRoots = () => {
                  document.querySelectorAll("[data-math-root]").forEach((node) => renderRoot(node));
                };

                const waitForAutoRender = (attempt = 0) => {
                  if (window.renderMathInElement) {
                    window.requestAnimationFrame(renderKnownRoots);
                    return;
                  }
                  if (attempt < 20) {
                    window.setTimeout(() => waitForAutoRender(attempt + 1), 150);
                  }
                };

                window.addEventListener("zhongkao:render-math", (event) => {
                  if (!window.renderMathInElement) return;
                  const selector = event instanceof CustomEvent ? event.detail?.selector : null;
                  if (selector) {
                    const target = document.querySelector(selector);
                    if (target) {
                      renderRoot(target);
                      return;
                    }
                  }
                  renderKnownRoots();
                });

                if (document.readyState === "loading") {
                  document.addEventListener("DOMContentLoaded", () => waitForAutoRender(), { once: true });
                } else {
                  waitForAutoRender();
                }
              })();
            `,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
