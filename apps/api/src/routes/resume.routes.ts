import { Router } from "express";
import multer from "multer";
import { 
  uploadResume, 
  getResumeStatus, 
  viewResume, 
  viewCandidateResume 
} from "../controllers/resume.controller.js";

const router: Router = Router();
const upload = multer({
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
});

router.post("/upload", upload.single("file"), uploadResume);
router.get("/status/:jobId", getResumeStatus);
router.get("/view", viewResume);
router.get("/view/:targetUserId", viewCandidateResume);

export default router;
