import React, { createContext, useContext, useState, useEffect } from "react";
import { toast } from "react-toastify";
import { useAuth } from "@clerk/react";
import type { ProfileData, ResumeStatusResponse } from "@squadup/shared";
import { profileApi, resumeApi, setAuthTokenGetter } from "../services/api";

interface JobContextType {
  jobId: string | null;
  status: string | null;
  isUploading: boolean;
  profileData: ProfileData | null;
  setJobId: (id: string | null) => void;
  setStatus: (status: string | null) => void;
  setIsUploading: (uploading: boolean) => void;
  setProfileData: (data: ProfileData | null) => void;
  startJob: (jobId: string, token: string) => void;
}

const JobContext = createContext<JobContextType | undefined>(undefined);

export const useJobContext = () => {
  const context = useContext(JobContext);
  if (!context) throw new Error("useJobContext must be used within a JobProvider");
  return context;
};

export const JobProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { getToken, isSignedIn } = useAuth();
  
  const [jobId, setJobId] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [token, setToken] = useState<string | null>(null);

  // Synchronize Clerk token getter with api service
  useEffect(() => {
    setAuthTokenGetter(() => getToken());
  }, [getToken]);

  useEffect(() => {
    if (isSignedIn && !profileData) {
      const loadProfile = async () => {
        try {
          const data = await profileApi.getProfile();
          setProfileData(data as any);
        } catch (err) {
          console.warn("[JobContext] Could not load profile:", err);
        }
      };
      loadProfile();
    }
  }, [isSignedIn, profileData]);

  const startJob = (newJobId: string, userToken: string) => {
    setJobId(newJobId);
    setToken(userToken);
    setIsUploading(true);
    setStatus("AI is reading your resume...");
  };

  useEffect(() => {
    if (!jobId) return;

    const interval = setInterval(async () => {
      try {
        const data = await resumeApi.getResumeStatus(jobId);

        if (data.state === "completed") {
          clearInterval(interval);
          setProfileData(data.result);
          setIsUploading(false);
          setJobId(null);
          toast.success("Profile creation complete!", {
            position: "bottom-right",
            autoClose: 5000,
          });
        } else if (data.state === "failed") {
          clearInterval(interval);
          setStatus("AI parsing failed: " + data.error);
          setIsUploading(false);
          setJobId(null);
          toast.error("Profile creation failed: " + data.error, {
            position: "bottom-right",
          });
        }
      } catch (err) {
        console.error("[JobContext] Polling error:", err);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [jobId]);

  return (
    <JobContext.Provider
      value={{
        jobId,
        status,
        isUploading,
        profileData,
        setJobId,
        setStatus,
        setIsUploading,
        setProfileData,
        startJob,
      }}
    >
      {children}
    </JobContext.Provider>
  );
};
