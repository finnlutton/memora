import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

// Stable image proxy.
//
// /api/img/{storagePath} streams the bytes of a `gallery-images` object
// straight back to the caller. The URL is deterministic per storage path,
// so next/image's optimizer (which keys its cache on the source URL) sees
// the same key on every render — no re-transformations, no Hobby quota
// burn from signed-URL churn.
//
// Security model is the same one Supabase signed URLs already implied:
// the URL itself is the bearer token. Storage paths embed user IDs +
// UUID-suffixed filenames and aren't enumerable from outside the app, so
// "if you have the path, you can read the file" matches the historical
// behaviour we're replacing. Validation here is shape-only — we just
// reject obviously bad input before paying for a Supabase call.

const STORAGE_BUCKET = "gallery-images";

const ALLOWED_FOLDERS = new Set([
  "galleries",
  "subgalleries",
  "photos",
  "clipboard",
]);

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function pathLooksValid(path: string) {
  const segments = path.split("/");
  if (segments.length < 3) return false;
  if (!UUID_RE.test(segments[0])) return false;
  if (!ALLOWED_FOLDERS.has(segments[1])) return false;
  if (segments.some((seg) => !seg || seg === "." || seg === "..")) return false;
  return true;
}

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ path: string[] }> },
) {
  const { path: segments } = await ctx.params;
  const path = segments.map(decodeURIComponent).join("/");
  if (!pathLooksValid(path)) {
    return NextResponse.json({ error: "invalid path" }, { status: 400 });
  }

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.storage
    .from(STORAGE_BUCKET)
    .download(path);

  if (error || !data) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  // Storage paths embed an upload timestamp and never get rewritten in
  // place, so the bytes for a given URL are immutable forever. Cache
  // aggressively at the browser AND at Vercel's CDN — this is the whole
  // point of the proxy: each path resolves to the same source URL the
  // optimizer sees on every visitor and every device size.
  return new Response(data, {
    headers: {
      "content-type": data.type || "image/jpeg",
      "cache-control":
        "public, max-age=86400, s-maxage=31536000, stale-while-revalidate=86400, immutable",
    },
  });
}
