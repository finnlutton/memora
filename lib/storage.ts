/**
 * TTL applied to signed URLs for user image content. Bumped from 1h to 7d so
 * the URL string is stable for longer — every fresh signed URL is a new cache
 * key for Vercel's image optimizer, so short TTLs force re-transformation
 * each time the page renders.
 */
export const IMAGE_SIGNED_URL_TTL_SECONDS = 60 * 60 * 24 * 7;
