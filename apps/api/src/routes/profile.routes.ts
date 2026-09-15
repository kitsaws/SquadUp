import { Router } from "express";
import { getProfile, updateProfile, getProfileById } from "../controllers/profile.controller.js";

const router: Router = Router();

router.get("/", getProfile);
router.patch("/", updateProfile);
router.get("/:targetUserId", getProfileById);

export default router;
