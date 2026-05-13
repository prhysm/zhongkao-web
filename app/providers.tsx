"use client";

import { ThemeProvider } from "next-themes";
import { AuthProvider } from "@/lib/auth-context";
import { StudyRecordsProvider } from "@/lib/study-records-context";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <AuthProvider>
        <StudyRecordsProvider>{children}</StudyRecordsProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

