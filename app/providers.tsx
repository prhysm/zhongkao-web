"use client";

import { ThemeProvider } from "next-themes";
import { AuthProvider } from "@/lib/auth-context";
import { StudyRecordsProvider } from "@/lib/study-records-context";
import { ServiceWorkerRegister } from "@/components/service-worker-register";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <AuthProvider>
        <StudyRecordsProvider>
          <ServiceWorkerRegister />
          {children}
        </StudyRecordsProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

