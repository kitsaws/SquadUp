import { ProfileData } from "./ai.types";

export interface UploadResumeResponse {
  message: string;
  jobId: string;
}

export type ResumeStatusResponse = 
  | { jobId: string; state: "completed"; result: ProfileData }
  | { jobId: string; state: "failed"; error: string }
  | { jobId: string; state: "active" | "waiting" | "delayed" | "unknown" };
