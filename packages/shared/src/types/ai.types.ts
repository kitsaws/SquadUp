export interface ParseResumeJobData {
  userId: string;
  fileBuffer: string; 
  filename: string;
}

export type {
  EducationItem,
  ExperienceItem,
  AchievementItem,
  ProjectItem,
  SocialLinks,
  CandidateProfileData,
  CandidateProfileData as ProfileData,
  UpdateProfileRequest,
  UserProfileResponse,
} from "./user.types.js";

import type { EducationItem, ExperienceItem, ProjectItem, AchievementItem } from "./user.types.js";
export type Education = EducationItem;
export type Experience = ExperienceItem;
export type Project = ProjectItem;
export type Achievement = AchievementItem;
