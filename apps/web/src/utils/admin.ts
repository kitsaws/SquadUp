export const ADMIN_EMAILS: string[] = (
  (import.meta.env.VITE_ADMIN_EMAILS || import.meta.env.VITE_ADMIN_EMAIL || "")
    .split(",")
    .map((e: string) => e.trim().toLowerCase())
    .filter(Boolean)
);

/**
 * Checks whether the given email address has platform administrator privileges.
 */
export function isAdminEmail(email?: string | null): boolean {
  if (!email) return false;
  return ADMIN_EMAILS.includes(email.trim().toLowerCase());
}
