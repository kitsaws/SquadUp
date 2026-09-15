import { Router } from "express";
import {
  createOrganization,
  listOrganizations,
  getOrganizationByClerkId,
  createOrganizer,
  listOrganizers,
  getOrganizerById,
  updateOrganizer,
  addOrganizerMember,
  removeOrganizerMember,
} from "../controllers/organizer.controller.js";

const router: Router = Router();

// University Organization endpoints
router.get("/universities", listOrganizations);
router.post("/universities", createOrganization);
router.get("/universities/:clerkOrgId", getOrganizationByClerkId);

// Sub-Organizer (Clubs / Societies) endpoints
router.get("/", listOrganizers);
router.post("/", createOrganizer);
router.get("/:id", getOrganizerById);
router.patch("/:id", updateOrganizer);
router.put("/:id", updateOrganizer);
router.post("/:id/members", addOrganizerMember);
router.delete("/:id/members/:userId", removeOrganizerMember);

export default router;
