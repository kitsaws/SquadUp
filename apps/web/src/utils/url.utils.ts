/**
 * Formats a GitHub profile username or URL into a valid full HTTPS URL.
 * Accepts full URLs, `github.com/...`, `@handle`, or `handle`.
 */
export function formatGithubUrl(url?: string | null, fallback: string | null = null): string | null {
  if (!url) return fallback;
  const trimmed = url.trim();
  if (!trimmed) return fallback;
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) return trimmed;
  if (trimmed.startsWith("github.com/")) return `https://${trimmed}`;
  const handle = trimmed.replace(/^@/, "");
  return `https://github.com/${handle}`;
}

/**
 * Formats a LinkedIn profile username or URL into a valid full HTTPS URL.
 * Accepts full URLs, `linkedin.com/...`, `@handle`, `in/handle`, or `handle`.
 */
export function formatLinkedinUrl(url?: string | null, fallback: string | null = null): string | null {
  if (!url) return fallback;
  const trimmed = url.trim();
  if (!trimmed) return fallback;
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) return trimmed;
  if (trimmed.startsWith("linkedin.com/")) return `https://${trimmed}`;
  const handle = trimmed.replace(/^@/, "");
  if (handle.startsWith("in/")) return `https://linkedin.com/${handle}`;
  return `https://linkedin.com/in/${handle}`;
}
