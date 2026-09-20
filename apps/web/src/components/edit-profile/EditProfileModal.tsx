import React, { useState, useRef, useEffect } from "react";
import { useAuth } from "@clerk/react";
import {
  X,
  Pencil,
  ArrowLeft,
  Palette,
} from "lucide-react";
import { toast } from "react-toastify";
import { useJobContext } from "../../contexts/JobContext";
import { usePalette } from "../../contexts/PaletteContext";
import { resumeApi, profileApi, preferencesApi } from "../../services/api";
import { CacheService } from "../../services/cache.service";
import { formatGithubUrl, formatLinkedinUrl } from "../../utils/url.utils";
import { BannerConfig, EditProfileModalProps } from "./edit-profile.types";
import { ResumeDropzoneView } from "./ResumeDropzoneView";
import { ManualEditForm } from "./ManualEditForm";
import { BannerCustomizer } from "./BannerCustomizer";

function compressImage(file: File, maxWidth = 1400, quality = 0.85): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(reader.result as string);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL("image/jpeg", quality);
        resolve(dataUrl);
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

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
    currentBanner?.type || "gradient"
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
  const [isSavingBanner, setIsSavingBanner] = useState<boolean>(false);
  const bannerImageInputRef = useRef<HTMLInputElement>(null);
  const prevIsOpenRef = useRef(false);

  // Reset form only when modal transitions from closed to open
  useEffect(() => {
    if (isOpen && !prevIsOpenRef.current) {
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
        setBannerType(currentBanner.type || "gradient");
        if (currentBanner.gradient) {
          setGradientColor1(currentBanner.gradient.color1 || "#0f172a");
          setGradientColor2(currentBanner.gradient.color2 || "#1e3a8a");
          setGradientAngle(currentBanner.gradient.angle ?? 135);
        }
        if (currentBanner.imageUrl) {
          setBannerImageDataUrl(currentBanner.imageUrl);
        }
        setSyncThemeWithBanner(currentBanner.syncTheme || false);
      } else {
        setBannerType("gradient");
        setBannerImageDataUrl("");
        setSyncThemeWithBanner(false);
      }
    }
    prevIsOpenRef.current = isOpen;
  }, [isOpen, initialView]);

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
     MANUAL EDIT HANDLERS
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

  const handleBannerImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (!file.type.startsWith("image/")) {
        toast.error("Please select an image file (PNG, JPG, WebP).");
        return;
      }

      try {
        const compressed = await compressImage(file, 1400, 0.85);
        setBannerImageDataUrl(compressed);
        setBannerType("image");
      } catch (err) {
        console.warn("[EditProfileModal] Image compression fallback:", err);
        const reader = new FileReader();
        reader.onload = () => {
          if (typeof reader.result === "string") {
            setBannerImageDataUrl(reader.result);
            setBannerType("image");
          }
        };
        reader.readAsDataURL(file);
      }
    }
  };

  const handleSaveBanner = async () => {
    setIsSavingBanner(true);
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

    const userStorageKey = profile.userId || profile.id;
    if (userStorageKey) {
      try {
        localStorage.setItem(`squadup_banner_${userStorageKey}`, JSON.stringify(config));
      } catch (err) {
        console.warn("[EditProfileModal] Could not store banner in localStorage:", err);
      }
    }

    const activeColor =
      bannerType === "gradient" ? gradientColor2 || gradientColor1 : "#ec4899";

    try {
      await preferencesApi.updatePreferences({
        bannerConfig: config,
        ...(syncThemeWithBanner && activeColor ? { primaryColor: activeColor } : {}),
      });
      CacheService.invalidatePrefix("sq:profile:");
      CacheService.invalidatePrefix("sq:public_profile:");
    } catch (err) {
      console.error("[EditProfileModal] Failed to store banner in preferencesApi:", err);
      toast.warning("Banner saved locally, but could not sync to server.", { position: "bottom-right" });
    } finally {
      setIsSavingBanner(false);
    }

    if (syncThemeWithBanner) {
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="w-full max-w-xl bg-surface rounded-2xl shadow-2xl border border-border-main overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ================= MODAL HEADER ================= */}
        <div className="p-5 border-b border-border-main flex items-center justify-between bg-surface shrink-0">
          <div className="flex items-center gap-2.5">
            {activeView !== "choose" && (
              <button
                type="button"
                onClick={() => setActiveView("choose")}
                className="p-1 rounded-lg text-text-muted hover:text-text-main hover:bg-surface-dim transition-colors cursor-pointer"
                title="Back to options"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}
            <div>
              <h3 className="text-base font-bold text-text-main font-heading">
                {activeView === "choose" && "Edit Profile"}
                {activeView === "manual" && "Edit Profile Details"}
                {activeView === "banner" && "Customize Background Banner"}
              </h3>
              <p className="text-xs text-text-muted">
                {activeView === "choose" && "Choose how you would like to update your developer profile"}
                {activeView === "manual" && "Directly modify your headline, bio, and verified skills"}
                {activeView === "banner" && "Design a custom gradient or upload an image banner"}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-text-muted hover:text-text-main hover:bg-surface-dim transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ================= MODAL BODY ================= */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* VIEW 1: METHOD SELECTION */}
          {activeView === "choose" && (
            <div className="space-y-6">
              {/* TOP SECTION: RESUME UPLOAD */}
              <ResumeDropzoneView
                resumeFile={resumeFile}
                setResumeFile={setResumeFile}
                handleFileDrop={handleFileDrop}
                handleResumeSelect={handleResumeSelect}
                handleUploadResume={handleUploadResume}
                isDragOver={isDragOver}
                setIsDragOver={setIsDragOver}
                isSubmittingResume={isSubmittingResume}
                isUploading={isUploading}
                resumeInputRef={resumeInputRef}
              />

              {/* DIVIDER */}
              <div className="relative flex items-center justify-center">
                <div className="w-full border-t border-border-main" />
                <span className="bg-surface px-3 text-[11px] font-bold text-text-muted uppercase tracking-wider absolute">
                  Or edit directly
                </span>
              </div>

              {/* BOTTOM SECTION: MANUAL EDIT */}
              <div className="p-5 rounded-2xl border border-border-main bg-surface space-y-3 shadow-2xs">
                <div className="flex items-center gap-2.5">
                  <span className="p-1.5 rounded-lg bg-surface-dim text-text-main border border-border-main shadow-2xs">
                    <Pencil className="w-4 h-4" />
                  </span>
                  <div>
                    <h4 className="text-sm font-bold text-text-main font-heading">
                      Edit Profile Manually
                    </h4>
                    <p className="text-[11px] text-text-muted">
                      Directly tweak your headline, bio, skills, and links without re-uploading.
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-[11px] text-text-muted">
                    Updates your skill matches and team recommendations automatically.
                  </span>
                  <button
                    type="button"
                    onClick={() => setActiveView("manual")}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary-action hover:bg-primary-hover text-white text-xs font-bold rounded-xl transition-colors shadow-2xs cursor-pointer"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    <span>Open Editor</span>
                  </button>
                </div>
              </div>

              {/* EXTRA OPTION: BANNER CUSTOMIZER */}
              <div className="pt-2 border-t border-border-main flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 text-text-muted">
                  <Palette className="w-4 h-4 text-primary-action" />
                  <span className="font-semibold">Profile Background Banner</span>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveView("banner")}
                  className="text-xs font-bold text-primary-action hover:underline cursor-pointer inline-flex items-center gap-1"
                >
                  <span>Customize Banner</span> &rarr;
                </button>
              </div>
            </div>
          )}

          {/* VIEW 2: MANUAL EDIT FORM */}
          {activeView === "manual" && (
            <ManualEditForm
              fullName={fullName}
              setFullName={setFullName}
              title={title}
              setTitle={setTitle}
              summary={summary}
              setSummary={setSummary}
              skills={skills}
              setSkills={setSkills}
              newSkillInput={newSkillInput}
              setNewSkillInput={setNewSkillInput}
              githubUrl={githubUrl}
              setGithubUrl={setGithubUrl}
              linkedinUrl={linkedinUrl}
              setLinkedinUrl={setLinkedinUrl}
              degree={degree}
              setDegree={setDegree}
              isSavingManual={isSavingManual}
              university={profile.university}
              handleAddSkill={handleAddSkill}
              handleRemoveSkill={handleRemoveSkill}
              handleSaveManual={handleSaveManual}
              onCancel={() => setActiveView("choose")}
            />
          )}

          {/* VIEW 3: BANNER CUSTOMIZER */}
          {activeView === "banner" && (
            <BannerCustomizer
              fullName={fullName}
              bannerType={bannerType}
              setBannerType={setBannerType}
              gradientColor1={gradientColor1}
              setGradientColor1={setGradientColor1}
              gradientColor2={gradientColor2}
              setGradientColor2={setGradientColor2}
              gradientAngle={gradientAngle}
              setGradientAngle={setGradientAngle}
              bannerImageDataUrl={bannerImageDataUrl}
              setBannerImageDataUrl={setBannerImageDataUrl}
              syncThemeWithBanner={syncThemeWithBanner}
              setSyncThemeWithBanner={setSyncThemeWithBanner}
              isSavingBanner={isSavingBanner}
              bannerImageInputRef={bannerImageInputRef}
              handleBannerImageSelect={handleBannerImageSelect}
              handleSaveBanner={handleSaveBanner}
              onCancel={initialView === "banner" ? onClose : () => setActiveView("choose")}
              initialView={initialView}
            />
          )}
        </div>
      </div>
    </div>
  );
}
