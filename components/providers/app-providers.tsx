"use client";

import { usePathname } from "next/navigation";
import { MemoraProvider } from "@/hooks/use-memora-store";
import { RecoveryBanner } from "@/components/recovery-banner";
import { StorageQuotaBanner } from "@/components/storage-quota-banner";
import { ToastProvider } from "@/components/ui/toast";

// Public-only route prefixes that never use the Memora gallery store.
// Skipping the provider here avoids: a Supabase browser-client init, an
// auth.getSession() call, an onAuthStateChange subscription, two
// localStorage round-trips, and the two floating banners that listen for
// visibility/focus events. That's measurable on the public share and
// public-profile entry pages, where the visitor is unauthenticated and
// none of the workspace state is referenced.
const PUBLIC_ONLY_PREFIXES = [
  "/share",
  "/@",
  "/terms",
  "/privacy",
];

function isPublicOnlyRoute(pathname: string | null | undefined): boolean {
  if (!pathname) return false;
  for (const prefix of PUBLIC_ONLY_PREFIXES) {
    if (pathname === prefix || pathname.startsWith(`${prefix}/`)) return true;
  }
  return false;
}

export function AppProviders({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (isPublicOnlyRoute(pathname)) {
    return <>{children}</>;
  }
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
