import { Router } from "express";
import { createTeam, acceptInvite, getRecommendations } from "../controllers/team.controller.js";

const router: Router = Router();

router.post("/", createTeam);
router.post("/recommendations", getRecommendations);
router.post("/invites/:inviteId/accept", acceptInvite);

export default router;
