export interface ParseResumeJobData {
  userId: string;
  fileBuffer: string; 
  filename: string;
}

export interface Education {
  degree: string;
  college: string;
}

export interface Experience {
  role: string;
  company: string;
  duration: string;
  bullet_points?: string[];
  technologies?: string[];
}

export interface Project {
  name: string;
  description: string;
  bullet_points?: string[];
  technologies?: string[];
}

export interface ProfileData {
  name?: string;
  university?: string;
  title?: string;
  summary?: string;
  skills?: string[];
  education?: Education[];
  experience?: Experience[];
  projects?: Project[];
}

export interface UpdateProfileRequest {
  name?: string;
  university?: string;
  title?: string;
  summary?: string;
  skills?: string[];
  education?: Education[];
  experience?: Experience[];
  projects?: Project[];
  githubUrl?: string;
  linkedinUrl?: string;
}

export interface UserProfileResponse {
  id: string;
  userId: string;
  name: string;
  email: string;
  university?: string | null;
  title?: string | null;
  summary?: string | null;
  skills: string[];
  education?: any;
  experience?: any;
  projects?: any;
  githubUrl?: string | null;
  linkedinUrl?: string | null;
  resumePdfUrl?: string | null;
  lastResumeUploadedAt?: string | null;
  taxonomyNodeIds?: string[];
  createdAt: string;
  updatedAt: string;
}

