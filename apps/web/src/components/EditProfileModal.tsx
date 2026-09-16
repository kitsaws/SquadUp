import React, { useState, useRef, useEffect } from "react";
import { useAuth } from "@clerk/react";
import {
  X,
  Upload,
  Pencil,
  FileText,
  Sparkles,
  ArrowLeft,
  Check,
  Plus,
  AlertCircle,
  Loader2,
  Lock,
  Palette,
  Image as ImageIcon,
  Sliders,
  Trash2,
} from "lucide-react";
import { toast } from "react-toastify";
import { useJobContext } from "../contexts/JobContext";
import { usePalette } from "../contexts/PaletteContext";
import { resumeApi, profileApi, UserProfileResponse } from "../services/api";

export interface BannerConfig {
  type: "gradient" | "image" | "default";
  gradient?: {
    color1: string;
    color2: string;
    angle: number;
  };
  imageUrl?: string;
  syncTheme?: boolean;
}

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: UserProfileResponse;
  onProfileUpdated: (updatedProfile: UserProfileResponse) => void;
  currentBanner?: BannerConfig;
  onBannerUpdated?: (banner: BannerConfig) => void;
  initialView?: "choose" | "manual" | "banner";
}

const GRADIENT_PRESETS = [
  { name: "Midnight Collegiate", color1: "#0f172a", color2: "#1e3a8a", angle: 135 },
  { name: "Electric Indigo", color1: "#1e1b4b", color2: "#4f46e5", angle: 110 },
  { name: "Cyber Violet", color1: "#311042", color2: "#7c3aed", angle: 120 },
  { name: "Sunset Blaze", color1: "#831843", color2: "#ec4899", angle: 90 },
  { name: "Emerald Focus", color1: "#064e3b", color2: "#059669", angle: 140 },
  { name: "Crimson Ember", color1: "#450a0a", color2: "#dc2626", angle: 135 },
];

const formatGithubUrl = (url?: string | null) => {
  if (!url) return null;
  let trimmed = url.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) return trimmed;
  if (trimmed.startsWith("github.com/")) return `https://${trimmed}`;
  const handle = trimmed.replace(/^@/, "");
  return `https://github.com/${handle}`;
};

const formatLinkedinUrl = (url?: string | null) => {
  if (!url) return null;
  let trimmed = url.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) return trimmed;
  if (trimmed.startsWith("linkedin.com/")) return `https://${trimmed}`;
  const handle = trimmed.replace(/^@/, "");
  if (handle.startsWith("in/")) return `https://linkedin.com/${handle}`;
  return `https://linkedin.com/in/${handle}`;
};

export function EditProfileModal({
  isOpen,
  onClose,
  profile,
  onProfileUpdated,
  currentBanner,
  onBannerUpdated,
  initialView = "choose",
}: EditProfileModalProps) {
  const { getToken } = useAuth();
  const { startJob, isUploading } = useJobContext();
  const { updateToken } = usePalette();

  const [activeView, setActiveView] = useState<"choose" | "manual" | "banner">(initialView);

  // Resume Upload State
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isSubmittingResume, setIsSubmittingResume] = useState(false);
  const resumeInputRef = useRef<HTMLInputElement>(null);

  // Manual Edit Form State
  const [fullName, setFullName] = useState(profile.name || "");
  const [title, setTitle] = useState(profile.title || "");
  const [summary, setSummary] = useState(profile.summary || "");
  const [skills, setSkills] = useState<string[]>(profile.skills || []);
  const [newSkillInput, setNewSkillInput] = useState("");
  const [githubUrl, setGithubUrl] = useState(profile.githubUrl || "");
  const [linkedinUrl, setLinkedinUrl] = useState(profile.linkedinUrl || "");
  const [degree, setDegree] = useState(profile.education?.[0]?.degree || "");
  const [isSavingManual, setIsSavingManual] = useState(false);

  // Banner State
  const [bannerType, setBannerType] = useState<"gradient" | "image" | "default">(
    currentBanner?.type || "default"
  );
  const [gradientColor1, setGradientColor1] = useState(
    currentBanner?.gradient?.color1 || "#0f172a"
  );
  const [gradientColor2, setGradientColor2] = useState(
    currentBanner?.gradient?.color2 || "#1e3a8a"
  );
  const [gradientAngle, setGradientAngle] = useState<number>(
    currentBanner?.gradient?.angle || 135
  );
  const [bannerImageDataUrl, setBannerImageDataUrl] = useState<string>(
    currentBanner?.imageUrl || ""
  );
  const [syncThemeWithBanner, setSyncThemeWithBanner] = useState<boolean>(
    currentBanner?.syncTheme || false
  );
  const bannerImageInputRef = useRef<HTMLInputElement>(null);

  // Reset form when opened or profile changes
  useEffect(() => {
    if (isOpen) {
      setActiveView(initialView);
      setResumeFile(null);
      setFullName(profile.name || "");
      setTitle(profile.title || "");
      setSummary(profile.summary || "");
      setSkills(profile.skills || []);
      setGithubUrl(profile.githubUrl || "");
      setLinkedinUrl(profile.linkedinUrl || "");
      setDegree(profile.education?.[0]?.degree || "");
      if (currentBanner) {
        setBannerType(currentBanner.type);
        if (currentBanner.gradient) {
          setGradientColor1(currentBanner.gradient.color1);
          setGradientColor2(currentBanner.gradient.color2);
          setGradientAngle(currentBanner.gradient.angle);
        }
        if (currentBanner.imageUrl) {
          setBannerImageDataUrl(currentBanner.imageUrl);
        }
        setSyncThemeWithBanner(currentBanner.syncTheme || false);
      }
    }
  }, [isOpen, initialView, profile, currentBanner]);

  if (!isOpen) return null;

  /* =========================================================================
     RESUME UPLOAD HANDLERS
     ========================================================================= */

  const handleFileDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile.type === "application/pdf" || droppedFile.name.endsWith(".pdf")) {
        setResumeFile(droppedFile);
      } else {
        toast.error("Please select a valid PDF file.");
      }
    }
  };

  const handleResumeSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setResumeFile(e.target.files[0]);
    }
  };

  const handleUploadResume = async () => {
    if (!resumeFile) return;

    try {
      setIsSubmittingResume(true);
      const token = await getToken();
      const res = await resumeApi.uploadResume(resumeFile);

      // Start asynchronous polling in global JobContext
      startJob(res.jobId, token || "");
      toast.info("Resume uploaded! AI extraction started in background.", {
        position: "bottom-right",
      });

      setResumeFile(null);
      onClose();
    } catch (err: any) {
      console.error("[EditProfileModal] Resume upload error:", err);
      toast.error(err.message || "Failed to upload resume. Please try again.");
    } finally {
      setIsSubmittingResume(false);
    }
  };

  /* =========================================================================
     MANUAL EDIT HANDLERS (WITH BACKEND TAXONOMY SYNC)
     ========================================================================= */

  const handleAddSkill = () => {
    const trimmed = newSkillInput.trim();
    if (!trimmed) return;
    if (skills.some((s) => s.toLowerCase() === trimmed.toLowerCase())) {
      toast.info(`"${trimmed}" is already added.`);
      return;
    }
    setSkills([...skills, trimmed]);
    setNewSkillInput("");
  };

  const handleRemoveSkill = (skillToRemove: string) => {
    setSkills(skills.filter((s) => s !== skillToRemove));
  };

  const handleSaveManual = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSavingManual(true);

      const educationPayload = degree.trim()
        ? [
            {
              college: profile.university || "Collegiate Institution",
              degree: degree.trim(),
            },
          ]
        : profile.education || [];

      // Calling updateProfile with skills, projects, and experience triggers
      // AIService.resolveUserTaxonomy in the backend automatically.
      const res = await profileApi.updateProfile({
        name: fullName.trim(),
        title: title.trim(),
        summary: summary.trim(),
        skills,
        githubUrl: formatGithubUrl(githubUrl),
        linkedinUrl: formatLinkedinUrl(linkedinUrl),
        education: educationPayload,
        projects: profile.projects || [],
        experience: profile.experience || [],
      });

      toast.success("Profile updated successfully!", {
        position: "bottom-right",
      });

      if (res.profile) {
        onProfileUpdated(res.profile);
      }
      onClose();
    } catch (err: any) {
      console.error("[EditProfileModal] Manual save error:", err);
      toast.error(err.message || "Failed to save profile changes.");
    } finally {
      setIsSavingManual(false);
    }
  };

  /* =========================================================================
     BANNER CUSTOMIZATION HANDLERS
     ========================================================================= */

  const handleBannerImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      // Size check: limit to 2MB to prevent browser lock-in or localStorage exhaustion
      if (file.size > 2 * 1024 * 1024) {
        toast.error("Banner image must be smaller than 2MB.");
        return;
      }
      if (!file.type.startsWith("image/")) {
        toast.error("Please select an image file (PNG, JPG, WebP).");
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === "string") {
          setBannerImageDataUrl(reader.result);
          setBannerType("image");
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveBanner = () => {
    const config: BannerConfig = {
      type: bannerType,
      gradient:
        bannerType === "gradient"
          ? {
              color1: gradientColor1,
              color2: gradientColor2,
              angle: gradientAngle,
            }
          : undefined,
      imageUrl: bannerType === "image" ? bannerImageDataUrl : undefined,
      syncTheme: syncThemeWithBanner,
    };

    // Store in localStorage for client persistence per user
    try {
      localStorage.setItem(`squadup_banner_${profile.userId}`, JSON.stringify(config));
    } catch (err) {
      console.warn("[EditProfileModal] Could not store banner in localStorage:", err);
    }

    // If theme sync is enabled, adapt the website's primary action color
    if (syncThemeWithBanner) {
      const activeColor =
        bannerType === "gradient" ? gradientColor2 || gradientColor1 : "#ec4899";
      updateToken("primaryAction", activeColor);
      toast.info(`Website theme synchronized with your banner color!`, {
        position: "bottom-right",
      });
    }

    if (onBannerUpdated) {
      onBannerUpdated(config);
    }
    toast.success("Banner updated!", { position: "bottom-right" });
    if (initialView === "banner") {
      onClose();
    } else {
      setActiveView("choose");
    }
  };

  const liveBannerStyle: React.CSSProperties =
    bannerType === "image" && bannerImageDataUrl
      ? {
          backgroundImage: `url(${bannerImageDataUrl})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }
      : bannerType === "gradient"
      ? {
          background: `linear-gradient(${gradientAngle}deg, ${gradientColor1}, ${gradientColor2})`,
        }
      : {
          background: "linear-gradient(to right, #0f172a, #172554, #1e1b4b)",
        };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ================= MODAL HEADER ================= */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 shrink-0">
          <div className="flex items-center gap-2.5">
            {activeView !== "choose" && (
              <button
                type="button"
                onClick={() => setActiveView("choose")}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                title="Back to options"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}
            <div>
              <h3 className="text-base font-bold text-slate-900 font-heading">
                {activeView === "choose" && "Edit Profile"}
                {activeView === "manual" && "Edit Profile Details"}
                {activeView === "banner" && "Customize Background Banner"}
              </h3>
              <p className="text-xs text-slate-500">
                {activeView === "choose" && "Choose how you would like to update your developer profile"}
                {activeView === "manual" && "Directly modify your headline, bio, and verified skills"}
                {activeView === "banner" && "Design a custom gradient or upload an image banner"}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ================= MODAL BODY ================= */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* ---------------- VIEW 1: METHOD SELECTION (TOP & BOTTOM) ---------------- */}
          {activeView === "choose" && (
            <div className="space-y-6">
              {/* TOP SECTION: RESUME UPLOAD */}
              <div className="p-5 rounded-2xl border border-blue-200 bg-blue-50/30 space-y-3.5 relative overflow-hidden">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="p-1.5 rounded-lg bg-blue-600 text-white shadow-2xs">
                      <Sparkles className="w-4 h-4" />
                    </span>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 font-heading">
                        Upload New Resume
                      </h4>
                      <p className="text-[11px] text-blue-900/80">
                        AI automatically parses latest skills, projects, and roles into your profile.
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-200">
                    Recommended
                  </span>
                </div>

                {/* Embedded File Dropzone */}
                <input
                  type="file"
                  accept=".pdf"
                  ref={resumeInputRef}
                  onChange={handleResumeSelect}
                  className="hidden"
                />

                {!resumeFile ? (
                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      setIsDragOver(true);
                    }}
                    onDragLeave={() => setIsDragOver(false)}
                    onDrop={handleFileDrop}
                    onClick={() => resumeInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all ${
                      isDragOver
                        ? "border-blue-500 bg-blue-100/50 scale-[0.99]"
                        : "border-blue-200 hover:border-blue-400 bg-white"
                    }`}
                  >
                    <Upload className="w-6 h-6 text-blue-500 mx-auto mb-1.5" />
                    <p className="text-xs font-semibold text-slate-700">
                      Drag and drop your PDF resume here, or{" "}
                      <span className="text-blue-600 underline">browse</span>
                    </p>
                    <p className="text-[10px] text-slate-400 mt-0.5">Maximum size: 10MB • Format: .pdf</p>
                  </div>
                ) : (
                  <div className="bg-white rounded-xl p-3.5 border border-blue-200 flex items-center justify-between gap-3 shadow-2xs">
                    <div className="flex items-center gap-2.5 overflow-hidden">
                      <FileText className="w-5 h-5 text-blue-600 shrink-0" />
                      <div className="truncate text-left">
                        <p className="text-xs font-bold text-slate-900 truncate">
                          {resumeFile.name}
                        </p>
                        <p className="text-[10px] text-slate-400">
                          {(resumeFile.size / (1024 * 1024)).toFixed(2)} MB • Ready to ingest
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => setResumeFile(null)}
                        className="text-xs text-slate-400 hover:text-rose-600 font-semibold cursor-pointer p-1"
                      >
                        Remove
                      </button>

                      <button
                        type="button"
                        onClick={handleUploadResume}
                        disabled={isSubmittingResume || isUploading}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold rounded-lg shadow-2xs transition-colors cursor-pointer"
                      >
                        {isSubmittingResume ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" /> Ingesting...
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-3.5 h-3.5" /> Extract Profile
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* DIVIDER */}
              <div className="relative flex items-center justify-center">
                <div className="w-full border-t border-slate-200" />
                <span className="bg-white px-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider absolute">
                  Or edit directly
                </span>
              </div>

              {/* BOTTOM SECTION: MANUAL EDIT */}
              <div className="p-5 rounded-2xl border border-slate-200 bg-slate-50/40 space-y-3">
                <div className="flex items-center gap-2.5">
                  <span className="p-1.5 rounded-lg bg-slate-800 text-white shadow-2xs">
                    <Pencil className="w-4 h-4" />
                  </span>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 font-heading">
                      Edit Profile Manually
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      Directly tweak your headline, bio, skills, and links without re-uploading.
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-[11px] text-slate-400">
                    Updates your skill matches and team recommendations automatically.
                  </span>
                  <button
                    type="button"
                    onClick={() => setActiveView("manual")}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-colors shadow-2xs cursor-pointer"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    <span>Open Editor</span>
                  </button>
                </div>
              </div>

              {/* EXTRA OPTION: BANNER CUSTOMIZER */}
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 text-slate-600">
                  <Palette className="w-4 h-4 text-indigo-600" />
                  <span className="font-semibold">Profile Background Banner</span>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveView("banner")}
                  className="text-xs font-bold text-indigo-600 hover:text-indigo-700 hover:underline cursor-pointer inline-flex items-center gap-1"
                >
                  <span>Customize Banner</span> &rarr;
                </button>
              </div>
            </div>
          )}

          {/* ---------------- VIEW 2: MANUAL EDIT FORM ---------------- */}
          {activeView === "manual" && (
            <form onSubmit={handleSaveManual} className="space-y-4">
              {/* Full Name */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Jane Doe"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all font-medium"
                />
              </div>

              {/* Professional Title */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                  Headline / Role
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Full Stack Engineer | Systems & AI"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all font-medium"
                />
              </div>

              {/* University (Locked) */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                    University / Institution
                  </label>
                  <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                    <Lock className="w-3 h-3 text-slate-400" /> Managed via Institution
                  </span>
                </div>
                <div className="flex items-center justify-between bg-slate-100/70 border border-slate-200/80 rounded-xl px-3 py-2 text-xs text-slate-700 font-semibold cursor-not-allowed">
                  <span>{profile.university || "Collegiate Participant"}</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-500">
                    Verified
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 italic">
                  Institutional affiliation is bound to your Clerk university organization to maintain event eligibility.
                </p>
              </div>

              {/* Bio / Summary */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                  About / Bio
                </label>
                <textarea
                  rows={3}
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                  placeholder="Brief summary of your interests, hackathon goals, and technical focus..."
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all font-medium resize-none"
                />
              </div>

              {/* Skills Tag Manager */}
              <div className="space-y-2 pt-1 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-blue-600" /> Technical Skills
                  </label>
                  <span className="text-[11px] text-blue-600 font-bold">
                    {skills.length} added
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newSkillInput}
                    onChange={(e) => setNewSkillInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddSkill();
                      }
                    }}
                    placeholder="Add a technology (e.g. React, Docker, FastAPI)..."
                    className="flex-1 px-3 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all font-medium"
                  />
                  <button
                    type="button"
                    onClick={handleAddSkill}
                    className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold rounded-xl border border-blue-200 transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add
                  </button>
                </div>

                {skills.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-2 bg-slate-50 rounded-xl border border-slate-100">
                    {skills.map((skill, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-white border border-slate-200 text-slate-800 shadow-2xs"
                      >
                        <span>{skill}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveSkill(skill)}
                          className="text-slate-400 hover:text-rose-600 rounded-full p-0.5 transition-colors cursor-pointer"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-400 italic">No skills specified yet.</p>
                )}
              </div>

              {/* Links */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t border-slate-100">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
                    GitHub Profile URL
                  </label>
                  <input
                    type="text"
                    value={githubUrl}
                    onChange={(e) => setGithubUrl(e.target.value)}
                    placeholder="https://github.com/... or username"
                    className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all font-medium"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
                    LinkedIn Profile URL
                  </label>
                  <input
                    type="text"
                    value={linkedinUrl}
                    onChange={(e) => setLinkedinUrl(e.target.value)}
                    placeholder="https://linkedin.com/in/... or handle"
                    className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all font-medium"
                  />
                </div>
              </div>

              {/* Academic Degree / Major */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
                  Degree / Major
                </label>
                <input
                  type="text"
                  value={degree}
                  onChange={(e) => setDegree(e.target.value)}
                  placeholder="e.g. B.S. Computer Science"
                  className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all font-medium"
                />
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setActiveView("choose")}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingManual}
                  className="inline-flex items-center gap-1.5 px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-colors shadow-xs cursor-pointer"
                >
                  {isSavingManual ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving...
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" /> Save Changes
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* ---------------- VIEW 3: BANNER CUSTOMIZER ---------------- */}
          {activeView === "banner" && (
            <div className="space-y-5">
              {/* Live Preview */}
              <div className="space-y-1.5">
                <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block">
                  Live Banner Preview
                </span>
                <div
                  style={liveBannerStyle}
                  className="h-28 w-full rounded-xl border border-slate-200 shadow-inner relative overflow-hidden transition-all duration-300 flex items-end p-3"
                >
                  <div className="bg-black/40 backdrop-blur-md px-2.5 py-1 rounded-lg text-white text-[11px] font-semibold flex items-center gap-1.5 border border-white/15">
                    <span>{fullName || "Student Profile"}</span>
                  </div>
                </div>
              </div>

              {/* Mode Selector: Gradient vs Image */}
              <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl">
                <button
                  type="button"
                  onClick={() => setBannerType("gradient")}
                  className={`py-1.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    bannerType === "gradient"
                      ? "bg-white text-slate-900 shadow-2xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <Sliders className="w-3.5 h-3.5" /> Gradient Designer
                </button>
                <button
                  type="button"
                  onClick={() => setBannerType("image")}
                  className={`py-1.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    bannerType === "image"
                      ? "bg-white text-slate-900 shadow-2xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <ImageIcon className="w-3.5 h-3.5" /> Upload Image
                </button>
              </div>

              {/* Option A: Gradient Controls */}
              {bannerType === "gradient" && (
                <div className="space-y-4">
                  {/* Preset Gradient Chips */}
                  <div className="space-y-1.5">
                    <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block">
                      Curated Designer Presets
                    </span>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {GRADIENT_PRESETS.map((p, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => {
                            setGradientColor1(p.color1);
                            setGradientColor2(p.color2);
                            setGradientAngle(p.angle);
                          }}
                          className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-left text-[11px] font-semibold hover:border-slate-400 transition-all flex items-center gap-2 cursor-pointer bg-white"
                        >
                          <span
                            className="w-3.5 h-3.5 rounded-full shrink-0 border border-black/10"
                            style={{
                              background: `linear-gradient(${p.angle}deg, ${p.color1}, ${p.color2})`,
                            }}
                          />
                          <span className="truncate text-slate-700">{p.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Gradient Sliders / Pickers */}
                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-700 block">
                        Start Color
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={gradientColor1}
                          onChange={(e) => setGradientColor1(e.target.value)}
                          className="w-8 h-8 rounded-lg border border-slate-200 cursor-pointer p-0.5"
                        />
                        <input
                          type="text"
                          value={gradientColor1}
                          onChange={(e) => setGradientColor1(e.target.value)}
                          className="flex-1 px-2 py-1 text-xs rounded-lg border border-slate-200 font-mono"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-700 block">
                        End Color
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={gradientColor2}
                          onChange={(e) => setGradientColor2(e.target.value)}
                          className="w-8 h-8 rounded-lg border border-slate-200 cursor-pointer p-0.5"
                        />
                        <input
                          type="text"
                          value={gradientColor2}
                          onChange={(e) => setGradientColor2(e.target.value)}
                          className="flex-1 px-2 py-1 text-xs rounded-lg border border-slate-200 font-mono"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Angle Slider */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[11px] font-bold text-slate-700">
                      <span>Gradient Angle</span>
                      <span>{gradientAngle}°</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={360}
                      value={gradientAngle}
                      onChange={(e) => setGradientAngle(Number(e.target.value))}
                      className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                    />
                  </div>
                </div>
              )}

              {/* Option B: Image Upload Controls */}
              {bannerType === "image" && (
                <div className="space-y-3">
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    ref={bannerImageInputRef}
                    onChange={handleBannerImageSelect}
                    className="hidden"
                  />

                  <div
                    onClick={() => bannerImageInputRef.current?.click()}
                    className="border-2 border-dashed border-slate-200 hover:border-slate-400 rounded-xl p-6 text-center cursor-pointer transition-colors bg-slate-50/50"
                  >
                    <ImageIcon className="w-8 h-8 text-slate-400 mx-auto mb-1.5" />
                    <p className="text-xs font-semibold text-slate-700">
                      Click to choose banner photo
                    </p>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      Recommended: 1200x300px • Max size: 2MB (JPG, PNG, WebP)
                    </p>
                  </div>

                  {bannerImageDataUrl && (
                    <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-200 text-xs">
                      <span className="text-slate-600 font-medium truncate max-w-xs">
                        Custom Image Loaded
                      </span>
                      <button
                        type="button"
                        onClick={() => setBannerImageDataUrl("")}
                        className="text-rose-600 hover:text-rose-700 font-bold cursor-pointer text-[11px]"
                      >
                        Clear Image
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* DYNAMIC THEME COLOR SYNC TOGGLE */}
              <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 space-y-1">
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={syncThemeWithBanner}
                    onChange={(e) => setSyncThemeWithBanner(e.target.checked)}
                    className="mt-0.5 w-4 h-4 rounded text-blue-600 border-slate-300 focus:ring-blue-500 cursor-pointer"
                  />
                  <div>
                    <span className="text-xs font-bold text-slate-900 block">
                      Sync website theme with banner color
                    </span>
                    <span className="text-[11px] text-slate-500 leading-snug block">
                      Dynamically updates button and accent colors across your workspace to harmonize with your banner.
                    </span>
                  </div>
                </label>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={initialView === "banner" ? onClose : () => setActiveView("choose")}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  {initialView === "banner" ? "Cancel" : "Back"}
                </button>
                <button
                  type="button"
                  onClick={handleSaveBanner}
                  className="inline-flex items-center gap-1.5 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-colors shadow-xs cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" /> Apply Banner
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
