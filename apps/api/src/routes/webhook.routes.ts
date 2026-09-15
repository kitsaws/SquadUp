import { Router } from "express";
import express from "express";
import { clerkWebhookHandler } from "../controllers/webhook.controller.js";
import { getClerkWebhookConfig } from "../config/webhook.config.js";

const router: Router = Router();

// Informational endpoint reporting the active webhook receiving URL and secret status
router.get(["/", "", "/config"], (req, res) => {
  const config = getClerkWebhookConfig();
  console.log(`🔍 [Clerk Webhook] Health/Config check via GET ${req.originalUrl}`);
  res.status(200).json({
    status: "active",
    service: "squadup-clerk-webhook",
    endpoint: config.webhookUrl,
    isCustomUrlConfigured: config.isCustomUrlConfigured,
    secretConfigured: config.hasSecret,
  });
});

// Middleware to log incoming webhook POST requests immediately upon arrival
router.use((req, _res, next) => {
  if (req.method === "POST") {
    console.log(`\n🔔 [Webhook Route] Incoming HTTP POST to ${req.originalUrl} from ${req.ip || "unknown"}`);
  }
  next();
});

// Clerk webhook requires the raw body to verify the signature.
// Supports both base "/api/webhooks" and subpath "/api/webhooks/clerk"
router.post(
  ["/", "", "/clerk", "/clerk/"],
  express.raw({ type: "*/*" }),
  clerkWebhookHandler
);

export default router;
