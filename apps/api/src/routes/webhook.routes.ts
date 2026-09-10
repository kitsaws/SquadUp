import { Router } from "express";
import express from "express";
import { clerkWebhookHandler } from "../controllers/webhook.controller.js";

const router: Router = Router();

// Clerk webhook requires the raw body to verify the signature
router.post(
  "/clerk",
  express.raw({ type: "application/json" }),
  clerkWebhookHandler
);

export default router;
