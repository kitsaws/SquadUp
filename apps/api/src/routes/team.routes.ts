import { Router } from "express";
import { createTeam, acceptInvite } from "../controllers/team.controller.js";

const router: Router = Router();

router.post("/", createTeam);
router.post("/invites/:inviteId/accept", acceptInvite);

export default router;
