import { Request, Response } from "express";
import { getAuth } from "@clerk/express";
import { getOrCreateUserByClerkId } from "../utils/auth.utils.js";
import { NotificationService } from "../services/notification.service.js";
import { PubSubService } from "../services/pubsub.service.js";

export const getNotifications = async (req: Request, res: Response) => {
  const { userId } = getAuth(req);
  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const userInDb = await getOrCreateUserByClerkId(userId);
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string, 10) || 20));
    const unreadOnly = req.query.unreadOnly === "true";

    const result = await NotificationService.getUserNotifications(userInDb.id, {
      page,
      limit,
      unreadOnly,
    });

    return res.json(result);
  } catch (error) {
    console.error("[Notification API] Error fetching notifications:", error);
    return res.status(500).json({ error: "Failed to fetch notifications." });
  }
};

export const markAsRead = async (req: Request<{ id: string }>, res: Response) => {
  const { userId } = getAuth(req);
  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { id } = req.params;

  try {
    const userInDb = await getOrCreateUserByClerkId(userId);
    const success = await NotificationService.markAsRead(id, userInDb.id);

    if (!success) {
      return res.status(404).json({ error: "Notification not found or update failed." });
    }

    return res.json({ message: "Notification marked as read." });
  } catch (error) {
    console.error("[Notification API] Error marking as read:", error);
    return res.status(500).json({ error: "Failed to update notification." });
  }
};

export const markAllAsRead = async (req: Request, res: Response) => {
  const { userId } = getAuth(req);
  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const userInDb = await getOrCreateUserByClerkId(userId);
    const count = await NotificationService.markAllAsRead(userInDb.id);

    return res.json({
      message: "All notifications marked as read.",
      count,
    });
  } catch (error) {
    console.error("[Notification API] Error marking all as read:", error);
    return res.status(500).json({ error: "Failed to mark notifications as read." });
  }
};

export const streamNotifications = async (req: Request, res: Response) => {
  const { userId } = getAuth(req);
  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  let userInDb;
  try {
    userInDb = await getOrCreateUserByClerkId(userId);
  } catch (error) {
    return res.status(500).json({ error: "Failed to resolve user for live stream." });
  }

  // Set SSE Headers
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  });

  // Initial connection payload
  res.write(`data: ${JSON.stringify({ type: "STREAM_CONNECTED", userId: userInDb.id })}\n\n`);

  // Subscribe to Redis Pub/Sub for this user
  const unsubscribe = await PubSubService.subscribeUser(userInDb.id, (event) => {
    res.write(`data: ${JSON.stringify(event)}\n\n`);
  });

  // 25s keepalive ping to maintain connection through proxies
  const pingInterval = setInterval(() => {
    res.write(": keepalive\n\n");
  }, 25000);

  req.on("close", () => {
    clearInterval(pingInterval);
    unsubscribe();
  });
};
