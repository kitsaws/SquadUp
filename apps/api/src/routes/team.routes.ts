import { Router } from "express";
import {
  listTeams,
  getTeamById,
  createTeam,
  updateTeam,
  deleteTeam,
  sendTeamInvites,
  getMyInvites,
  acceptInvite,
  declineInvite,
  cancelInvite,
  applyToTeam,
  withdrawApplication,
  getTeamApplications,
  acceptApplication,
  rejectApplication,
  leaveTeam,
  removeTeamMember,
  getRecommendations,
} from "../controllers/team.controller.js";

const router: Router = Router();

// General team & recommendation routes
router.get("/", listTeams);
router.post("/", createTeam);
router.post("/recommendations", getRecommendations);

// User-level invites
router.get("/invites/my-invites", getMyInvites);
router.post("/invites/:inviteId/accept", acceptInvite);
router.post("/invites/:inviteId/decline", declineInvite);

// Leader application decisions
router.post("/applications/:applicationId/accept", acceptApplication);
router.post("/applications/:applicationId/reject", rejectApplication);

// Team detail & mutations
router.get("/:id", getTeamById);
router.patch("/:id", updateTeam);
router.put("/:id", updateTeam);
router.delete("/:id", deleteTeam);

// Team-scoped invite, application, and roster operations
router.post("/:id/invites", sendTeamInvites);
router.delete("/:id/invites/:inviteId", cancelInvite);
router.post("/:id/apply", applyToTeam);
router.delete("/:id/apply", withdrawApplication);
router.get("/:id/applications", getTeamApplications);
router.delete("/:id/leave", leaveTeam);
router.delete("/:id/members/:userId", removeTeamMember);

export default router;
