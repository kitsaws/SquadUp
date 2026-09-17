import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useUserContext } from "../../contexts/UserContext";

interface OnboardingGuardProps {
  children: React.ReactNode;
}

export function OnboardingGuard({ children }: OnboardingGuardProps) {
  const { isSignedIn, isLoaded, user, profile, hasInitialProfileLoaded } = useUserContext();
  const location = useLocation();

  // If auth is still loading, or if signed in and initial profile hasn't loaded yet, do NOT make redirect decisions
  if (!isLoaded || (isSignedIn && !hasInitialProfileLoaded)) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3 text-text-muted">
        <div className="w-8 h-8 border-3 border-primary-action border-t-transparent rounded-full animate-spin" />
        <span className="text-xs font-medium">Verifying SquadUp session...</span>
      </div>
    );
  }

  // If not signed in, let public pages or SignIn route take over
  if (!isSignedIn) {
    return <>{children}</>;
  }

  // Check if onboarding is completed from multiple persistent sources
  const hasLocalFlag = user?.id ? localStorage.getItem(`squadup_onboarding_done_${user.id}`) === "true" : false;
  const hasUniversity = Boolean(profile?.university || profile?.organizationName);
  const hasSkills = Boolean(profile?.skills && profile.skills.length > 0);
  const hasTitle = Boolean(profile?.title);
  const hasResume = Boolean(profile?.lastResumeUploadedAt || profile?.resumePdfUrl || (profile as any)?.hasResume);
  const hasEducation = Boolean(profile?.education && (profile.education as any).length > 0);
  const hasExperience = Boolean(profile?.experience && (profile.experience as any).length > 0);
  const hasProjects = Boolean(profile?.projects && (profile.projects as any).length > 0);
  const hasAchievements = Boolean(profile?.achievements && (profile.achievements as any).length > 0);

  const isOnboardingComplete =
    hasLocalFlag ||
    hasUniversity ||
    hasSkills ||
    hasTitle ||
    hasResume ||
    hasEducation ||
    hasExperience ||
    hasProjects ||
    hasAchievements;

  const isOnboardingRoute = location.pathname.startsWith("/onboarding");
  const isPlayground = location.pathname.startsWith("/playground");

  // If user has not completed onboarding and is not already on /onboarding or /playground, redirect to /onboarding
  if (!isOnboardingComplete && !isOnboardingRoute && !isPlayground) {
    return <Navigate to="/onboarding" replace />;
  }

  return <>{children}</>;
}
