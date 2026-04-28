import type { Metadata, Viewport } from "next";
import { AppProviders } from "@/components/providers/app-providers";
import { THEME_INIT_SCRIPT } from "@/lib/theme";
import "./globals.css";

export const metadata: Metadata = {
  title: "Memora",
  description: "A more intentional home for the moments that matter.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Memora",
    statusBarStyle: "black-translucent",
  },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: {
      url: "/icons/apple-touch-icon.png",
      sizes: "180x180",
      type: "image/png",
    },
  },
};

export const viewport: Viewport = {
  themeColor: "#0B1220",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // suppressHydrationWarning on <html> only — the theme script legitimately
    // adds the `data-theme` attribute before React hydrates, which would
    // otherwise trigger an attribute-mismatch warning on this specific node.
    <html lang="en" className="h-full antialiased" suppressHydrationWarning>
      <head>
        {/*
          Pre-paint theme init. MUST be synchronous and run before any paint,
          or Grove/Dusk users see a flash of Harbor on every navigation that
          reaches the document. Do not convert this to useEffect.
        */}
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="min-h-full">
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
