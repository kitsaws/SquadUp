import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useUser, useAuth } from "@clerk/react";
import { profileApi, UserProfileResponse, setAuthTokenGetter } from "../services/api";

export interface UserContextType {
  isSignedIn: boolean;
  isLoaded: boolean;
  user: ReturnType<typeof useUser>["user"] | null;
  profile: UserProfileResponse | null;
  isLoadingProfile: boolean;
  profileError: string | null;
  refreshProfile: () => Promise<void>;
  userVerifiedSkills: string[];
  userUniversity: string | null;
  hasResume: boolean;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: React.ReactNode }) {
  const { user, isLoaded, isSignedIn } = useUser();
  const { getToken } = useAuth();
  const [profile, setProfile] = useState<UserProfileResponse | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState<boolean>(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  // Sync token getter with api service
  useEffect(() => {
    setAuthTokenGetter(() => getToken());
  }, [getToken]);

  const refreshProfile = useCallback(async () => {
    if (!isSignedIn) {
      setProfile(null);
      setProfileError(null);
      return;
    }

    setIsLoadingProfile(true);
    setProfileError(null);
    try {
      const data = await profileApi.getProfile();
      setProfile(data);
    } catch (err: any) {
      console.warn("[UserContext] Could not load profile:", err);
      setProfileError(err?.message || "Failed to load profile");
    } finally {
      setIsLoadingProfile(false);
    }
  }, [isSignedIn]);

  useEffect(() => {
    if (isSignedIn) {
      refreshProfile();
    } else {
      setProfile(null);
      setIsLoadingProfile(false);
    }
  }, [isSignedIn, refreshProfile]);

  const userVerifiedSkills = profile?.skills || [];
  const userUniversity = profile?.university || null;
  const hasResume = Boolean(profile?.lastResumeUploadedAt || profile?.resumePdfUrl || (profile as any)?.hasResume);

  return (
    <UserContext.Provider
      value={{
        isSignedIn: Boolean(isSignedIn),
        isLoaded,
        user: user || null,
        profile,
        isLoadingProfile,
        profileError,
        refreshProfile,
        userVerifiedSkills,
        userUniversity,
        hasResume,
      }}
    >
      {children}
    </UserContext.Provider>
  );
}

export function useUserContext() {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error("useUserContext must be used within a UserProvider");
  }
  return context;
}
