/**
 * Stable, deterministic URL for a storage path. Routes through
 * `/api/img/{path}` which streams the bytes from the `gallery-images`
 * bucket. The URL is the same on every render across every surface, so
 * `next/image`'s optimizer (cache key = source URL) gets a hit instead
 * of a re-transformation each time the page mounts.
 *
 * Pass-through for anything that isn't a bare storage path (data:/blob:
 * URLs, absolute https URLs, app-relative paths) so callers can hand us
 * mixed inputs without branching first.
 */
export function imageProxyUrlForPath(path: string | null | undefined): string {
  if (!path) return "";
  if (path.startsWith("data:") || path.startsWith("blob:")) return path;
  if (path.startsWith("/") || path.startsWith("http")) return path;
  const encoded = path.split("/").map(encodeURIComponent).join("/");
  return `/api/img/${encoded}`;
}
