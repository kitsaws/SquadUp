import { Router } from "express";
import multer from "multer";
import { uploadResume, getResumeStatus } from "../controllers/resume.controller";

const router = Router();
const upload = multer(); // Memory storage for files

router.post("/upload", upload.single("file"), uploadResume);
router.get("/status/:jobId", getResumeStatus);

export default router;
