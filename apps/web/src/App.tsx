import React from "react";
import { Routes, Route } from "react-router-dom";
import { PaletteProvider } from "./contexts/PaletteContext";
import { Navbar } from "./components/Navbar";
import { HomeDashboard } from "./pages/HomeDashboard";
import { EventsPage } from "./pages/EventsPage";
import { TeamsPage } from "./pages/TeamsPage";
import { ApplicationsPage } from "./pages/ApplicationsPage";
import { Profile } from "./pages/Profile";
import { ProfileSplit } from "./pages/ProfileSplit";
import { TeamDetailPage } from "./pages/TeamDetailPage";
import { PlaygroundPage } from "./pages/PlaygroundPage";
import { Home as LegacyResumeUpload } from "./pages/Home";

export function App() {
  return (
    <PaletteProvider>
      <div className="min-h-screen flex flex-col font-sans transition-colors duration-200" style={{ backgroundColor: "var(--sq-canvas)" }}>
        {/* Clean, uncluttered global navigation bar */}
        <Navbar />

        {/* Main Routed Content */}
        <main className="flex-1">
          <Routes>
            <Route path="/" element={<HomeDashboard />} />
            <Route path="/events" element={<EventsPage />} />
            <Route path="/teams" element={<TeamsPage />} />
            <Route path="/team/:id" element={<TeamDetailPage />} />
            <Route path="/teams/:id" element={<TeamDetailPage />} />
            <Route path="/applications" element={<ApplicationsPage />} />
            <Route path="/profile" element={<ProfileSplit />} />
            <Route path="/profile-classic" element={<Profile />} />
            <Route path="/profile-split" element={<ProfileSplit />} />
            <Route path="/profile/:candidateId" element={<ProfileSplit />} />
            <Route path="/playground" element={<PlaygroundPage />} />
            <Route path="/resume-upload" element={<LegacyResumeUpload />} />
          </Routes>
        </main>
      </div>
    </PaletteProvider>
  );
}
