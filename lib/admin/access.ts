export const ADMIN_EMAIL_ALLOWLIST = new Set(
  (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean),
);

if (ADMIN_EMAIL_ALLOWLIST.size === 0) {
  console.warn("Memora: ADMIN_EMAILS is not set — admin routes will be inaccessible.");
}

export function isAdminEmail(email: string | null | undefined) {
  if (!email) return false;
  return ADMIN_EMAIL_ALLOWLIST.has(email.trim().toLowerCase());
}
