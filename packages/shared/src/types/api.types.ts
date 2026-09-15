import { ProfileData } from "./ai.types.js";

export interface UploadResumeResponse {
  message: string;
  jobId: string;
}

export type ResumeStatusResponse = 
  | { jobId: string; state: "completed"; result: ProfileData }
  | { jobId: string; state: "failed"; error: string }
  | { jobId: string; state: "active" | "waiting" | "delayed" | "unknown" };

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: PaginationMeta;
}


