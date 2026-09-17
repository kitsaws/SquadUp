import React, { useState } from "react";
import {
  Palette,
  Copy,
  Check,
  RotateCcw,
  Sparkles,
  Download,
  Code2,
  FileJson,
  Layers,
  Shield,
  Sliders,
  Eye,
  CheckCircle2,
} from "lucide-react";
import { usePalette, PALETTE_PRESETS } from "../contexts/PaletteContext";
import {
  RecommendationBadge,
  ScopeBadge,
  SkillTag,
  StatusBadge,
} from "../components/Badges";
import { CategoryLegend } from "../components/CategoryLegend";
import { CompatibilityScoreRing } from "../components/CompatibilityScoreRing";
import { TeamCard, TeamCardData } from "../components/TeamCard";
import { EventCard, EventCardData } from "../components/EventCard";
import {
  CandidateApplicationTile,
  CandidateApplicationData,
} from "../components/CandidateApplicationTile";
import { SmartRecommendationPanel } from "../components/SmartRecommendationPanel";
import { ApplyTeamModal } from "../components/ApplyTeamModal";

export function PlaygroundPage() {
  const {
    palette,
    updateToken,
    loadPreset,
    resetPalette,
    exportCss,
    exportJson,
  } = usePalette();

  const [activeTab, setActiveTab] = useState<"css" | "json">("css");
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);

  const handleCopy = () => {
    const textToCopy = activeTab === "css" ? exportCss() : exportJson();
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Sample data for playground components
  const sampleTeamBest: TeamCardData = {
    id: "sample-1",
    name: "AI Agents Guild",
    eventId: "e1",
    eventTitle: "TreeHacks 2026",
    university: "Stanford University",
    requirements: ["React", "FastAPI", "PostgreSQL"],
    neededRequirement: "PostgreSQL",
    taxonomyScore: 0.94,
    category: "BEST",
    description: "Autonomous task orchestrator with self-healing tools & local LLM reasoning.",
    members: [
      { id: "m1", name: "Jane Doe" },
      { id: "m2", name: "Marcus Chen" },
      { id: "m3", name: "Sofia Rodriguez" },
    ],
    maxCapacity: 4,
  };

  const sampleTeamCross: TeamCardData = {
    id: "sample-2",
    name: "CloudScale Engine",
    eventId: "e1",
    eventTitle: "TreeHacks 2026",
    university: "UC Berkeley (Global Eligible)",
    requirements: ["Docker", "Python", "Kubernetes"],
    neededRequirement: "Kubernetes",
    taxonomyScore: 0.85,
    category: "GOOD_DIFFERENT_UNIVERSITY",
    description: "Distributed telemetry backend and edge cluster orchestrator for IoT fleets.",
    members: [
      { id: "m4", name: "Liam Vance" },
      { id: "m5", name: "Maya Lin" },
    ],
    maxCapacity: 4,
  };

  const sampleEvent: EventCardData = {
    id: "sample-ev-1",
    title: "TreeHacks 2026",
    organizerName: "ACM Stanford",
    dateStr: "Oct 15 – 17, 2026",
    location: "Stanford, CA",
    isGlobal: true,
    daysRemaining: 30,
    description: "Stanford’s premier annual hackathon with tracks in Healthcare, AI Agents, and Sustainability.",
    tracks: ["Healthcare", "AI Agents", "Sustainability"],
    teamsCount: 12,
    participantsCount: 48,
  };

  const sampleCandidate: CandidateApplicationData = {
    id: "sample-cand-1",
    candidateId: "cand-101",
    name: "Alex Rivera",
    university: "Stanford University",
    year: "CS Junior",
    appliedRole: "PostgreSQL & Distributed Lead",
    matchScore: 0.94,
    isCampusMatch: true,
    appliedTimeAgo: "2 hours ago",
    coverNote: "Optimized time-series pipelines at Datadog with PostgreSQL. Ready to build the telemetry layer!",
    skills: [
      { name: "PostgreSQL", provenance: "Datadog Internship", score: 0.96 },
      { name: "Distributed Systems", provenance: "CS 244B", score: 0.92 },
      { name: "Python", provenance: "GitHub", score: 0.88 },
    ],
    status: "PENDING",
  };

  return (
    <div className="min-h-screen pb-16">
      {/* Top Banner */}
      <div className="bg-surface border-b border-border-main sticky top-[73px] z-20 px-4 sm:px-8 py-3.5 shadow-2xs">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary-light border border-primary-border flex items-center justify-center text-primary-action">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-text-main font-heading">
                SquadUp 2.0 Design System & Component Playground
              </h1>
              <p className="text-xs text-text-muted">
                Live palette customization • Hierarchy demonstration • Theme code exporter
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <a
              href="/onboarding"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold text-primary-action bg-primary-light border border-primary-border hover:bg-primary-light/80 transition-colors shadow-2xs"
            >
              <Sparkles className="w-3.5 h-3.5" /> Launch Onboarding Flow →
            </a>

            <button
              onClick={resetPalette}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold text-text-muted hover:text-text-main hover:bg-surface-dim transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Reset Default
            </button>

            <button
              onClick={() => setIsExportModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold text-white bg-primary-action hover:bg-primary-hover shadow-xs transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" /> Finalize & Export Palette
            </button>
          </div>
        </div>
      </div>

      {/* Main Workspace Layout: Sidebar Customizer + Component Hierarchy Canvas */}
      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-8 grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">
        {/* LEFT COLUMN: Sidebar Live Palette Customizer */}
        <aside className="lg:col-span-1 bg-surface rounded-2xl border border-border-main p-5 shadow-xs space-y-6 lg:sticky lg:top-[140px]">
          <div className="flex items-center justify-between pb-3 border-b border-border-main">
            <h2 className="text-xs font-bold uppercase tracking-wider text-text-muted flex items-center gap-2">
              <Palette className="w-4 h-4 text-primary-action" /> Palette Customizer
            </h2>
          </div>

          {/* Preset Buttons */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-text-main block">
              Curated Theme Presets
            </label>
            <div className="grid grid-cols-1 gap-1.5">
              {Object.keys(PALETTE_PRESETS).map((presetKey) => (
                <button
                  key={presetKey}
                  onClick={() => loadPreset(presetKey)}
                  className="text-left text-xs font-medium px-3 py-2 rounded-xl bg-surface-dim hover:bg-primary-light hover:text-primary-action border border-border-main transition-colors cursor-pointer flex items-center justify-between text-text-main"
                >
                  <span>{presetKey}</span>
                  <div className="flex items-center gap-1">
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: PALETTE_PRESETS[presetKey].bestFit }}
                    />
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: PALETTE_PRESETS[presetKey].crossCampus }}
                    />
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: PALETTE_PRESETS[presetKey].campusExplorer }}
                    />
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Color Category 1: Recommendation Tiers */}
          <div className="space-y-3 pt-2 border-t border-border-main">
            <span className="text-[11px] font-bold uppercase tracking-wider text-text-muted block">
              Recommendation Tiers
            </span>

            {/* Best Fit */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-text-main flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                  Best Fit
                </span>
                <span className="text-[11px] font-mono text-text-muted">{palette.bestFit}</span>
              </div>
              <input
                type="color"
                value={palette.bestFit}
                onChange={(e) => updateToken("bestFit", e.target.value)}
                className="w-full h-8 rounded-lg cursor-pointer border border-border-main bg-surface-dim p-0.5"
              />
            </div>

            {/* Cross-Campus */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-text-main flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
                  Cross-Campus
                </span>
                <span className="text-[11px] font-mono text-text-muted">{palette.crossCampus}</span>
              </div>
              <input
                type="color"
                value={palette.crossCampus}
                onChange={(e) => updateToken("crossCampus", e.target.value)}
                className="w-full h-8 rounded-lg cursor-pointer border border-border-main bg-surface-dim p-0.5"
              />
            </div>

            {/* Same Campus */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-text-main flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                  Same Campus
                </span>
                <span className="text-[11px] font-mono text-text-muted">{palette.campusExplorer}</span>
              </div>
              <input
                type="color"
                value={palette.campusExplorer}
                onChange={(e) => updateToken("campusExplorer", e.target.value)}
                className="w-full h-8 rounded-lg cursor-pointer border border-border-main bg-surface-dim p-0.5"
              />
            </div>
          </div>

          {/* Color Category 2: Brand Action & Canvas */}
          <div className="space-y-3 pt-2 border-t border-border-main">
            <span className="text-[11px] font-bold uppercase tracking-wider text-text-muted block">
              Core Surfaces & Action
            </span>

            {/* Primary Action */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-text-main">Primary Button / Action</span>
                <span className="text-[11px] font-mono text-text-muted">{palette.primaryAction}</span>
              </div>
              <input
                type="color"
                value={palette.primaryAction}
                onChange={(e) => updateToken("primaryAction", e.target.value)}
                className="w-full h-8 rounded-lg cursor-pointer border border-border-main bg-surface-dim p-0.5"
              />
            </div>

            {/* Canvas / Background */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-text-main">Canvas (Page BG)</span>
                <span className="text-[11px] font-mono text-text-muted">{palette.canvas}</span>
              </div>
              <input
                type="color"
                value={palette.canvas}
                onChange={(e) => updateToken("canvas", e.target.value)}
                className="w-full h-8 rounded-lg cursor-pointer border border-border-main bg-surface-dim p-0.5"
              />
            </div>

            {/* Surface */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-text-main">Card Surface</span>
                <span className="text-[11px] font-mono text-text-muted">{palette.surface}</span>
              </div>
              <input
                type="color"
                value={palette.surface}
                onChange={(e) => updateToken("surface", e.target.value)}
                className="w-full h-8 rounded-lg cursor-pointer border border-border-main bg-surface-dim p-0.5"
              />
            </div>

            {/* Border */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-text-main">Borders</span>
                <span className="text-[11px] font-mono text-text-muted">{palette.border}</span>
              </div>
              <input
                type="color"
                value={palette.border}
                onChange={(e) => updateToken("border", e.target.value)}
                className="w-full h-8 rounded-lg cursor-pointer border border-border-main bg-surface-dim p-0.5"
              />
            </div>
          </div>
        </aside>

        {/* RIGHT COLUMN: Hierarchical Component Canvas */}
        <main className="lg:col-span-3 space-y-10">
          {/* LEVEL 1: Atomic Badges & Categorization Tokens */}
          <section className="bg-surface rounded-2xl border border-border-main p-6 sm:p-8 shadow-xs space-y-6">
            <div className="space-y-1 pb-4 border-b border-border-main">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-primary-light text-primary-action border border-primary-border">
                  Level 1 • Atoms
                </span>
                <h2 className="text-lg font-bold text-text-main font-heading">
                  Badges, Indicators & Legend Ribbon
                </h2>
              </div>
              <p className="text-xs text-text-muted">
                Foundational tokens communicating taxonomy match tiers, verification scopes, and status.
              </p>
            </div>

            {/* Horizontal Legend Ribbon */}
            <div className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-text-muted">
                Horizontal Match Legend Ribbon
              </h3>
              <CategoryLegend />
            </div>

            {/* Recommendation Badges */}
            <div className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-text-muted">
                Recommendation Tiers (Dynamic CSS Colors)
              </h3>
              <div className="flex flex-wrap gap-3">
                <RecommendationBadge category="BEST" />
                <RecommendationBadge category="GOOD_DIFFERENT_UNIVERSITY" />
                <RecommendationBadge category="SAME_UNIVERSITY_LOWER_SCORE" />
              </div>
            </div>

            {/* Scope & Status Badges */}
            <div className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-text-muted">
                Event Scopes & Application Status Badges
              </h3>
              <div className="flex flex-wrap gap-3">
                <ScopeBadge isGlobal={true} />
                <ScopeBadge isGlobal={false} />
                <StatusBadge status="PENDING" />
                <StatusBadge status="ACCEPTED" />
                <StatusBadge status="REJECTED" />
              </div>
            </div>

            {/* Skill Tags */}
            <div className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-text-muted">
                Skill Tags (Provenanced vs Unmatched)
              </h3>
              <div className="flex flex-wrap gap-2">
                <SkillTag skill="PostgreSQL" isMatched={true} />
                <SkillTag skill="React" isMatched={true} />
                <SkillTag skill="FastAPI" isMatched={false} />
                <SkillTag skill="Docker" isMatched={false} />
              </div>
            </div>
          </section>

          {/* LEVEL 2: Telemetry & Measurement Rings */}
          <section className="bg-surface rounded-2xl border border-border-main p-6 sm:p-8 shadow-xs space-y-6">
            <div className="space-y-1 pb-4 border-b border-border-main">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-primary-light text-primary-action border border-primary-border">
                  Level 2 • Telemetry
                </span>
                <h2 className="text-lg font-bold text-text-main font-heading">
                  Radial Compatibility Score Rings
                </h2>
              </div>
              <p className="text-xs text-text-muted">
                Precise SVG geometry calculating perimeter stroke offsets based on semantic score.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div className="p-4 rounded-xl bg-surface-dim border border-border-main text-center space-y-2">
                <div className="flex justify-center">
                  <CompatibilityScoreRing score={0.94} size={76} strokeWidth={6} />
                </div>
                <h4 className="text-xs font-bold text-text-main">Best Fit (94%)</h4>
                <p className="text-[11px] text-text-muted">Tier 1 Mint Indicator</p>
              </div>

              <div className="p-4 rounded-xl bg-surface-dim border border-border-main text-center space-y-2">
                <div className="flex justify-center">
                  <CompatibilityScoreRing score={0.85} size={76} strokeWidth={6} />
                </div>
                <h4 className="text-xs font-bold text-text-main">Cross-Campus (85%)</h4>
                <p className="text-[11px] text-text-muted">Tier 2 Indigo Indicator</p>
              </div>

              <div className="p-4 rounded-xl bg-surface-dim border border-border-main text-center space-y-2">
                <div className="flex justify-center">
                  <CompatibilityScoreRing score={0.65} size={76} strokeWidth={6} />
                </div>
                <h4 className="text-xs font-bold text-text-main">Same Campus (65%)</h4>
                <p className="text-[11px] text-text-muted">Tier 3 Amber Indicator</p>
              </div>
            </div>
          </section>

          {/* LEVEL 3: Core Cards & Interaction Tiles */}
          <section className="bg-surface rounded-2xl border border-border-main p-6 sm:p-8 shadow-xs space-y-6">
            <div className="space-y-1 pb-4 border-b border-border-main">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-primary-light text-primary-action border border-primary-border">
                  Level 3 • Core Tiles
                </span>
                <h2 className="text-lg font-bold text-text-main font-heading">
                  Interactive Squad & Candidate Tiles
                </h2>
              </div>
              <p className="text-xs text-text-muted">
                Polymorphic cards demonstrating resting state, hover feedback, and accordion dossiers.
              </p>
            </div>

            {/* Team Cards Grid */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-text-muted">
                Team Cards (Best Fit & Cross-Campus)
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <TeamCard
                  team={sampleTeamBest}
                  onInspect={() => setIsApplyModalOpen(true)}
                  onApply={() => setIsApplyModalOpen(true)}
                />
                <TeamCard
                  team={sampleTeamCross}
                  onInspect={() => setIsApplyModalOpen(true)}
                  onApply={() => setIsApplyModalOpen(true)}
                />
              </div>
            </div>

            {/* Collapsible Candidate Application Tile */}
            <div className="space-y-3 pt-4 border-t border-border-main">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-text-muted">
                  Candidate Application Tile (Collapsed by Default — Click to Expand)
                </h3>
                <span className="text-[11px] text-primary-action font-semibold">
                  Interactive Component
                </span>
              </div>

              <CandidateApplicationTile
                application={sampleCandidate}
                defaultExpanded={true}
                onAccept={(id) => alert(`Candidate ${id} accepted!`)}
                onDecline={(id) => alert(`Candidate ${id} declined.`)}
              />
            </div>

            {/* Event Card */}
            <div className="space-y-3 pt-4 border-t border-border-main">
              <h3 className="text-xs font-bold uppercase tracking-wider text-text-muted">
                Event Directory Card
              </h3>
              <div className="max-w-md">
                <EventCard event={sampleEvent} />
              </div>
            </div>
          </section>

          {/* LEVEL 4: Composite Decision Panels */}
          <section className="bg-surface rounded-2xl border border-border-main p-6 sm:p-8 shadow-xs space-y-6">
            <div className="space-y-1 pb-4 border-b border-border-main">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-primary-light text-primary-action border border-primary-border">
                  Level 4 • Complex Composites
                </span>
                <h2 className="text-lg font-bold text-text-main font-heading">
                  Smart Recommendation & Application Decision Panel
                </h2>
              </div>
              <p className="text-xs text-text-muted">
                Composite panel articulating provenance reasons and powering application state transitions.
              </p>
            </div>

            <div className="max-w-md">
              <SmartRecommendationPanel
                recommendation={{
                  teamId: "sample-1",
                  teamName: "AI Agents Guild",
                  category: "BEST",
                  taxonomyScore: 0.94,
                  fulfilledRequirements: 2,
                  totalRequirements: 3,
                  teamLeadName: "Jane Doe",
                  teamLeadUniversity: "Stanford University",
                  sameUniversity: true,
                  breakdown: [
                    {
                      requirementName: "PostgreSQL",
                      score: 0.96,
                      isDirectMatch: true,
                      provenanceSource: "Verified Resume Skill",
                      snippet: "Optimized time-series telemetry pipelines at Datadog with PostgreSQL.",
                      explanation: "High confidence match for the team's open distributed database slot.",
                    },
                    {
                      requirementName: "React",
                      score: 0.92,
                      isDirectMatch: true,
                      provenanceSource: "Project Portfolio",
                      explanation: "Strong background building interactive real-time frontends.",
                    },
                  ],
                }}
                onApply={() => setIsApplyModalOpen(true)}
              />
            </div>
          </section>
        </main>
      </div>

      {/* Export Modal */}
      {isExportModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-surface border border-border-main rounded-2xl shadow-2xl max-w-2xl w-full p-6 sm:p-8 space-y-6 relative">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-xl font-bold text-text-main font-heading">
                  Finalize & Export Palette
                </h3>
                <p className="text-xs text-text-muted mt-1">
                  Copy your customized theme variables directly into your project's stylesheet or config.
                </p>
              </div>

              <button
                onClick={() => setIsExportModalOpen(false)}
                className="text-text-muted hover:text-text-main text-sm font-bold bg-surface-dim p-2 rounded-full cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Export Format Selector */}
            <div className="flex items-center gap-2 bg-surface-dim border border-border-main p-1 rounded-xl">
              <button
                onClick={() => setActiveTab("css")}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-2 ${
                  activeTab === "css"
                    ? "bg-surface text-text-main shadow-xs border border-border-main"
                    : "text-text-muted hover:text-text-main"
                }`}
              >
                <Code2 className="w-3.5 h-3.5" /> CSS Custom Properties (styles.css)
              </button>

              <button
                onClick={() => setActiveTab("json")}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-2 ${
                  activeTab === "json"
                    ? "bg-surface text-text-main shadow-xs border border-border-main"
                    : "text-text-muted hover:text-text-main"
                }`}
              >
                <FileJson className="w-3.5 h-3.5" /> JSON Tokens (tokens.json)
              </button>
            </div>

            {/* Code Block Container */}
            <div className="relative">
              <pre className="p-4 rounded-xl bg-surface-dim text-text-main text-xs font-mono overflow-x-auto max-h-72 border border-border-main leading-relaxed">
                <code>{activeTab === "css" ? exportCss() : exportJson()}</code>
              </pre>

              <button
                onClick={handleCopy}
                className="absolute top-3 right-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-surface hover:bg-surface-dim text-text-main shadow-xs transition-colors cursor-pointer border border-border-main"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-500" /> Copied!
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" /> Copy Code
                  </>
                )}
              </button>
            </div>

            <div className="flex items-center justify-between text-xs text-text-muted pt-2 border-t border-border-main">
              <span>Ready for production integration in SquadUp 2.0.</span>
              <button
                onClick={() => setIsExportModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-primary-action text-white hover:bg-primary-hover transition-colors cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Apply Team Modal Preview */}
      <ApplyTeamModal
        isOpen={isApplyModalOpen}
        onClose={() => setIsApplyModalOpen(false)}
        team={sampleTeamBest}
        onSubmit={(teamId) => {
          setIsApplyModalOpen(false);
          alert(`Application submitted to team ${teamId}!`);
        }}
      />
    </div>
  );
}

