import { Router } from "express";
import {
  getNotifications,
  markAsRead,
  markAllAsRead,
  streamNotifications,
} from "../controllers/notification.controller.js";

const router: Router = Router();

router.get("/", getNotifications);
router.get("/stream", streamNotifications);
router.patch("/:id/read", markAsRead);
router.post("/read-all", markAllAsRead);

export default router;
