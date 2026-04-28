"use client";

import { MemoraProvider } from "@/hooks/use-memora-store";
import { RecoveryBanner } from "@/components/recovery-banner";
import { StorageQuotaBanner } from "@/components/storage-quota-banner";
import { ToastProvider } from "@/components/ui/toast";

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <MemoraProvider>
      <ToastProvider>
        {children}
        <StorageQuotaBanner />
        <RecoveryBanner />
      </ToastProvider>
    </MemoraProvider>
  );
}
