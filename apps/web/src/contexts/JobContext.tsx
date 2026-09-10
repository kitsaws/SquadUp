import React, { createContext, useContext, useState, useEffect } from "react";
import { toast } from "react-toastify";
import { useAuth } from "@clerk/react";
import type { ProfileData, ResumeStatusResponse } from "@squadup/shared";

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

  useEffect(() => {
    if (isSignedIn && !profileData) {
      const loadProfile = async () => {
        try {
          console.log("[JobContext] Fetching token...");
          const userToken = await getToken();
          console.log("[JobContext] Token received:", userToken ? "Yes" : "No");
          
          if (!userToken) {
            console.log("[JobContext] No token available, aborting fetch.");
            return;
          }
          
          console.log("[JobContext] Sending GET /api/profile");
          const res = await fetch("http://localhost:3000/api/profile", {
            headers: { Authorization: `Bearer ${userToken}` }
          });
          
          console.log("[JobContext] API Response Status:", res.status);
          
          if (res.ok) {
            const data = await res.json();
            setProfileData(data);
          } else {
            const errText = await res.text();
            console.error("[JobContext] API returned an error:", res.status, errText);
          }
        } catch (err) {
          console.error("Failed to load profile:", err);
        }
      };
      loadProfile();
    }
  }, [isSignedIn, getToken, profileData]);

  const startJob = (newJobId: string, userToken: string) => {
    setJobId(newJobId);
    setToken(userToken);
    setIsUploading(true);
    setStatus("AI is reading your resume...");
  };

  useEffect(() => {
    if (!jobId || !token) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`http://localhost:3000/api/resume/status/${jobId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json() as ResumeStatusResponse;

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
        console.error("Polling error", err);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [jobId, token]);

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
