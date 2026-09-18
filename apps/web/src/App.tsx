import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { PaletteProvider } from "./contexts/PaletteContext";
import { useUserContext } from "./contexts/UserContext";
import { Navbar } from "./components/Navbar";
import { HomeDashboard } from "./pages/HomeDashboard";
import { EventsPage } from "./pages/EventsPage";
import { TeamsPage } from "./pages/TeamsPage";
import { ApplicationsPage } from "./pages/ApplicationsPage";
import { Profile } from "./pages/Profile";
import { TeamDetailPage } from "./pages/TeamDetailPage";
import { EventDetailPage } from "./pages/EventDetailPage";
import { PlaygroundPage } from "./pages/PlaygroundPage";
import { Onboarding } from "./pages/Onboarding";
import { OnboardingGuard } from "./components/onboarding/OnboardingGuard";
import { Home as LegacyResumeUpload } from "./pages/Home";
import { isAdminEmail } from "./utils/admin";

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isSignedIn, isLoaded } = useUserContext();
  if (!isLoaded) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary-action border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  if (!isSignedIn) {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user, profile, isLoaded, isSignedIn } = useUserContext();
  if (!isLoaded) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary-action border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  const userEmail =
    user?.primaryEmailAddress?.emailAddress ||
    user?.emailAddresses?.[0]?.emailAddress ||
    profile?.email ||
    "";
  const isSuperAdmin = isSignedIn && isAdminEmail(userEmail);
  if (!isSuperAdmin) {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
}

export function App() {
  return (
    <PaletteProvider>
      <div className="min-h-screen flex flex-col font-sans transition-colors duration-200 bg-canvas text-text-main">
        {/* Clean, uncluttered global navigation bar with dynamic onboarding progress */}
        <Navbar />

        {/* Main Routed Content */}
        <main className="flex-1">
          <OnboardingGuard>
            <Routes>
              <Route path="/" element={<HomeDashboard />} />
              <Route path="/onboarding" element={<ProtectedRoute><Onboarding /></ProtectedRoute>} />
              <Route path="/events" element={<EventsPage />} />
              <Route path="/event/:id" element={<EventDetailPage />} />
              <Route path="/events/:id" element={<EventDetailPage />} />
              <Route path="/teams" element={<TeamsPage />} />
              <Route path="/team/:id" element={<TeamDetailPage />} />
              <Route path="/teams/:id" element={<TeamDetailPage />} />
              <Route
                path="/applications"
                element={
                  <ProtectedRoute>
                    <ApplicationsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/profile"
                element={
                  <ProtectedRoute>
                    <Profile />
                  </ProtectedRoute>
                }
              />
              <Route path="/profile/:id" element={<Profile />} />
              <Route path="/profile/:candidateId" element={<Profile />} />
              <Route
                path="/playground"
                element={
                  <AdminRoute>
                    <PlaygroundPage />
                  </AdminRoute>
                }
              />
              <Route path="/resume-upload" element={<LegacyResumeUpload />} />
            </Routes>
          </OnboardingGuard>
        </main>
      </div>
    </PaletteProvider>
  );
}
