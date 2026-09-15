import { Router } from "express";
import {
  listEvents,
  getEventById,
  createEvent,
  updateEvent,
  deleteEvent,
  getEventTeams,
} from "../controllers/event.controller.js";

const router: Router = Router();

router.get("/", listEvents);
router.post("/create", createEvent);
router.post("/", createEvent);
router.get("/:id", getEventById);
router.patch("/:id", updateEvent);
router.put("/:id", updateEvent);
router.delete("/:id", deleteEvent);
router.get("/:id/teams", getEventTeams);

export default router;
