import { Router } from "express";
import {
  getMyApplications,
  getIncomingApplications,
  getApplicationById,
  withdrawApplicationById,
  acceptApplication,
  rejectApplication,
} from "../controllers/team.controller.js";

const router: Router = Router();

// Candidate application queries
router.get("/my-applications", getMyApplications);

// Leader incoming application queries
router.get("/incoming", getIncomingApplications);

// Single application details & withdrawal by ID
router.get("/:applicationId", getApplicationById);
router.delete("/:applicationId", withdrawApplicationById);

// Leader accept/reject decisions
router.post("/:applicationId/accept", acceptApplication);
router.post("/:applicationId/reject", rejectApplication);

export default router;
