import { Router } from "express";
import { createEvent } from "../controllers/event.controller.js";

const router: Router = Router();

router.post("/create", createEvent);

export default router;
