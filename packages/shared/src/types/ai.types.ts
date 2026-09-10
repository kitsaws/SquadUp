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
}

export interface Project {
  name: string;
  description: string;
  bullet_points?: string[];
}

export interface ProfileData {
  name?: string;
  title?: string;
  summary?: string;
  skills?: string[];
  education?: Education[];
  experience?: Experience[];
  projects?: Project[];
}
