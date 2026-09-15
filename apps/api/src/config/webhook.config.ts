/**
 * Clerk / Svix Webhook Configuration
 *
 * CLERK_WEBHOOK_URL: The externally reachable receiving URL where Clerk/Svix dispatches events.
 *   - Local Development: Set to your active tunnel URL (e.g. https://<subdomain>.ngrok-free.app/api/webhooks)
 *   - Production: Set to your live API domain (e.g. https://api.squadup.dev/api/webhooks)
 *
 * CLERK_WEBHOOK_SECRET: Secret used by Svix to cryptographically verify incoming payload signatures.
 */

import * as path from "path";
import * as fs from "fs";

// Load root .env file if available (supports Node 20/22 built-in loadEnvFile)
try {
  const rootEnvPath = path.resolve(process.cwd(), "../../.env");
  if (fs.existsSync(rootEnvPath) && typeof process.loadEnvFile === "function") {
    process.loadEnvFile(rootEnvPath);
  }
} catch {
  // Ignored if already loaded or running in production container
}

export interface WebhookConfig {
  webhookUrl: string;
  isCustomUrlConfigured: boolean;
  hasSecret: boolean;
}

/**
 * Normalizes the webhook receiving URL to guarantee a coherent, valid endpoint.
 * E.g., strips trailing slashes and ensures /api/webhooks path is present if only a host was supplied.
 */
export function normalizeWebhookUrl(rawUrl?: string, port = 3000): string {
  if (!rawUrl || !rawUrl.trim()) {
    return `http://localhost:${port}/api/webhooks`;
  }
  let url = rawUrl.trim().replace(/\/+$/, "");

  // If user provided just the tunnel origin without path (e.g. https://astonish-delete-greeter.ngrok-free.dev)
  if (!url.endsWith("/api/webhooks") && !url.endsWith("/api/webhooks/clerk") && !url.endsWith("/api/webhook")) {
    url = `${url}/api/webhooks`;
  }
  return url;
}

export function getClerkWebhookConfig(): WebhookConfig {
  const port = Number(process.env.PORT ?? 3000);
  const rawUrl = process.env.CLERK_WEBHOOK_URL?.trim();
  const webhookUrl = normalizeWebhookUrl(rawUrl, port);

  return {
    webhookUrl,
    isCustomUrlConfigured: Boolean(rawUrl),
    hasSecret: Boolean(process.env.CLERK_WEBHOOK_SECRET?.trim()),
  };
}
