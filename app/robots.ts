import type { MetadataRoute } from "next";

// Belt-and-suspenders crawler control. Share routes already emit
// `robots: { index: false, follow: false }` via buildShareMetadata, but
// disallowing them here also saves crawl budget and prevents bots from
// fetching token URLs at all. Auth-gated paths are blocked because they
// either redirect bots or render no useful content.
const siteOrigin =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
  "https://memoragallery.com";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/"],
        disallow: [
          "/share/",
          "/api/",
          "/admin/",
          "/dashboard/",
          "/galleries/",
          "/welcome/",
          "/checkout/",
          "/reset-password/",
          "/email-confirmed/",
        ],
      },
    ],
    host: siteOrigin,
  };
}
