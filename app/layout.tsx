import type { Metadata, Viewport } from "next";
import { AppProviders } from "@/components/providers/app-providers";
import { THEME_INIT_SCRIPT } from "@/lib/theme";
import "./globals.css";

// metadataBase resolves the relative `/og-default.png` path below into the
// absolute URL that unfurl bots need. NEXT_PUBLIC_SITE_URL wins so preview
// deploys can override; production falls back to the canonical apex.
const siteOrigin =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
  "https://memoragallery.com";

export const metadata: Metadata = {
  metadataBase: new URL(siteOrigin),
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
  // Default unfurl for the marketing site (homepage, /auth, /terms, etc.).
  // Share routes override openGraph + twitter via their own generateMetadata
  // so this image only shows when the new logo asset matters.
  // Drop a 1200×630 PNG at /public/og-default.png to enable the image.
  openGraph: {
    title: "Memora",
    description: "A more intentional home for the moments that matter.",
    type: "website",
    url: siteOrigin,
    images: [{ url: "/og-default.png", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Memora",
    description: "A more intentional home for the moments that matter.",
    images: ["/og-default.png"],
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
