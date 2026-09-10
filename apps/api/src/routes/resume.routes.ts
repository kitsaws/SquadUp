import { Router } from "express";
import multer from "multer";
import { uploadResume, getResumeStatus } from "../controllers/resume.controller.js";

const router: Router = Router();
const upload = multer(); // Memory storage for files

router.post("/upload", upload.single("file"), uploadResume);
router.get("/status/:jobId", getResumeStatus);

export default router;
