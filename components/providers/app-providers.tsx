"use client";

import { MemoraProvider } from "@/hooks/use-memora-store";
import { StorageQuotaBanner } from "@/components/storage-quota-banner";

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <MemoraProvider>
      {children}
      <StorageQuotaBanner />
    </MemoraProvider>
  );
}
