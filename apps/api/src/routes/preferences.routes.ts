import { Router } from "express";
import { getPreferences, updatePreferences } from "../controllers/preferences.controller.js";

const router: Router = Router();

router.get("/", getPreferences);
router.patch("/", updatePreferences);

export default router;
