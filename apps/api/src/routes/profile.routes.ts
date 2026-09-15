import { Router } from "express";
import { getProfile, updateProfile, getProfileById, syncClerkData } from "../controllers/profile.controller.js";

const router: Router = Router();

router.get("/", getProfile);
router.patch("/", updateProfile);
router.post("/sync-clerk", syncClerkData);
router.get("/:targetUserId", getProfileById);

export default router;
