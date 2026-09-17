import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useUser, useAuth } from "@clerk/react";
import { profileApi, UserProfileResponse, setAuthTokenGetter } from "../services/api";
import { CacheService } from "../services/cache.service";

export interface UserContextType {
  isSignedIn: boolean;
  isLoaded: boolean;
  user: ReturnType<typeof useUser>["user"] | null;
  profile: UserProfileResponse | null;
  isLoadingProfile: boolean;
  hasInitialProfileLoaded: boolean;
  profileError: string | null;
  refreshProfile: (bypassCache?: boolean) => Promise<void>;
  updateCachedProfile: (partial: Partial<UserProfileResponse>) => void;
  userVerifiedSkills: string[];
  userUniversity: string | null;
  hasResume: boolean;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: React.ReactNode }) {
  const { user, isLoaded, isSignedIn } = useUser();
  const { getToken } = useAuth();
  
  // Try synchronous cache read on initial render
  const userId = user?.id;
  const initialCache = userId ? CacheService.get<UserProfileResponse>(`sq:profile:${userId}`, "local") : null;

  const [profile, setProfile] = useState<UserProfileResponse | null>(initialCache ? initialCache.data : null);
  const [isLoadingProfile, setIsLoadingProfile] = useState<boolean>(!initialCache);
  const [hasInitialProfileLoaded, setHasInitialProfileLoaded] = useState<boolean>(Boolean(initialCache));
  const [profileError, setProfileError] = useState<string | null>(null);

  // Sync token getter with api service
  useEffect(() => {
    setAuthTokenGetter(() => getToken());
  }, [getToken]);

  const updateCachedProfile = useCallback((partial: Partial<UserProfileResponse>) => {
    setProfile((prev) => {
      if (!prev) return null;
      const updated = { ...prev, ...partial };
      if (userId) {
        CacheService.set(`sq:profile:${userId}`, updated, 1000 * 60 * 30, "local");
      }
      return updated;
    });
  }, [userId]);

  const refreshProfile = useCallback(async (bypassCache = false) => {
    if (!isSignedIn || !user?.id) {
      setProfile(null);
      setProfileError(null);
      setHasInitialProfileLoaded(true);
      return;
    }

    if (!profile) {
      setIsLoadingProfile(true);
    }
    setProfileError(null);

    try {
      const data = await profileApi.getProfile({
        userId: user.id,
        bypassCache,
        onBackgroundUpdate: (fresh) => {
          setProfile(fresh);
        },
      });
      setProfile(data);
    } catch (err: any) {
      console.warn("[UserContext] Could not load profile:", err);
      setProfileError(err?.message || "Failed to load profile");
    } finally {
      setIsLoadingProfile(false);
      setHasInitialProfileLoaded(true);
    }
  }, [isSignedIn, user?.id, profile]);

  useEffect(() => {
    if (isSignedIn && user?.id) {
      // If we don't have profile in memory yet, check cache synchronously for this user ID
      const cached = CacheService.get<UserProfileResponse>(`sq:profile:${user.id}`, "local");
      if (cached && !profile) {
        setProfile(cached.data);
        setHasInitialProfileLoaded(true);
      }
      refreshProfile();
    } else if (isLoaded && !isSignedIn) {
      setProfile(null);
      setIsLoadingProfile(false);
      setHasInitialProfileLoaded(true);
      CacheService.clearAll();
    }
  }, [isSignedIn, isLoaded, user?.id]);

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
        hasInitialProfileLoaded,
        profileError,
        refreshProfile,
        updateCachedProfile,
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
