/**
 * Retrieves the list of configured admin email addresses from Vite environment variables.
 * Handles single/double quotes, spaces, trailing commas, and case normalization.
 */
export function getAdminEmails(): string[] {
  const raw = ((import.meta.env.VITE_ADMIN_EMAILS || import.meta.env.VITE_ADMIN_EMAIL || "") as string)
    .replace(/^["']|["']$/g, "")
    .replace(/["']/g, "");

  return raw
    .split(",")
    .map((e: string) => e.trim().toLowerCase())
    .filter(Boolean);
}

export const ADMIN_EMAILS: string[] = getAdminEmails();

/**
 * Checks whether the given email address has platform administrator privileges.
 */
export function isAdminEmail(email?: string | null): boolean {
  if (!email) return false;
  const normalized = email.trim().toLowerCase();
  const adminList = getAdminEmails();
  return adminList.includes(normalized);
}
