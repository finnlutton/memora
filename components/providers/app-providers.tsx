"use client";

import { MemoraProvider } from "@/hooks/use-memora-store";
import { StorageQuotaBanner } from "@/components/storage-quota-banner";
import { ToastProvider } from "@/components/ui/toast";

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <MemoraProvider>
      <ToastProvider>
        {children}
        <StorageQuotaBanner />
      </ToastProvider>
    </MemoraProvider>
  );
}
