import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useUserContext } from "../../contexts/UserContext";

interface OnboardingGuardProps {
  children: React.ReactNode;
}

export function OnboardingGuard({ children }: OnboardingGuardProps) {
  const { isSignedIn, isLoaded, isOnboardingComplete, hasInitialProfileLoaded } = useUserContext();
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

  const isOnboardingRoute = location.pathname.startsWith("/onboarding");
  const isPlayground = location.pathname.startsWith("/playground");
  const isCompletionStep = location.search.includes("step=3");

  // 1. If user has NOT completed onboarding and is not already on /onboarding or /playground, redirect to /onboarding
  if (!isOnboardingComplete && !isOnboardingRoute && !isPlayground) {
    return <Navigate to="/onboarding" replace />;
  }

  // 2. If user HAS completed onboarding and is attempting to access /onboarding, redirect to home
  if (isOnboardingComplete && isOnboardingRoute && !isCompletionStep) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
