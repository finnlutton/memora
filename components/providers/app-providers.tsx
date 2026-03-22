"use client";

import { MemoraProvider } from "@/hooks/use-memora-store";

export function AppProviders({ children }: { children: React.ReactNode }) {
  return <MemoraProvider>{children}</MemoraProvider>;
}
