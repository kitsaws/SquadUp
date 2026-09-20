export interface EducationItem {
  degree: string;
  college: string;
  year?: string;
  gpa?: string;
}

export interface ExperienceItem {
  company: string;
  role: string;
  duration: string;
  location?: string;
  bullet_points?: string[];
  technologies?: string[];
}

export interface AchievementItem {
  title: string;
  organization: string;
  award_tier?: string; // e.g. "1st Place", "Winner", "Top 3", "Finalist", "Special Mention"
  year?: string;
  description?: string;
  technologies?: string[];
}

export interface ProjectItem {
  name: string;
  description: string;
  bullet_points?: string[];
  technologies?: string[];
  link?: string;
}

export interface SocialLinks {
  github?: string;
  linkedin?: string;
  portfolio?: string;
  twitter?: string;
}

export interface CandidateProfileData {
  name?: string;
  title?: string;
  summary?: string;
  skills?: string[];
  education?: EducationItem[];
  experience?: ExperienceItem[];
  achievements?: AchievementItem[];
  projects?: ProjectItem[];
  links?: SocialLinks;
}

export interface UpdateProfileRequest {
  name?: string;
  university?: string;
  title?: string;
  summary?: string;
  skills?: string[];
  education?: EducationItem[];
  experience?: ExperienceItem[];
  achievements?: AchievementItem[];
  projects?: ProjectItem[];
  githubUrl?: string;
  linkedinUrl?: string;
}

export interface UserProfileResponse {
  id: string;
  userId: string;
  clerkId?: string;
  name: string;
  email: string;
  imageUrl?: string | null;
  profilePicture?: string | null;
  avatarUrl?: string | null;
  university?: string | null;
  title?: string | null;
  summary?: string | null;
  skills: string[];
  education?: EducationItem[] | any;
  experience?: ExperienceItem[] | any;
  achievements?: AchievementItem[] | any;
  projects?: ProjectItem[] | any;
  githubUrl?: string | null;
  linkedinUrl?: string | null;
  resumePdfUrl?: string | null;
  resumeOriginalName?: string | null;
  lastResumeUploadedAt?: string | null;
  taxonomyNodeIds?: string[];
  bannerConfig?: any;
  isVerifiedStudent?: boolean;
  verificationReason?: string;
  organizationDomain?: string | null;
  organizationName?: string | null;
  teams?: Array<{
    teamId: string;
    teamName: string;
    eventId: string;
    role: string;
    joinedAt?: string;
  }>;
  createdAt: string;
  updatedAt: string;
}
