import React, { useState } from "react";
import {
  FileText,
  Building,
  GraduationCap,
  Sparkles,
  Settings,
  ArrowUpRight,
  LogOut,
  Pencil,
  Palette,
  Mail,
  Copy,
  Check,
  Sliders,
} from "lucide-react";
import { toast } from "react-toastify";
import { VerificationBadge } from "../Badges";
import { BannerConfig } from "../EditProfileModal";
import { UserProfileResponse } from "../../services/api";
import { GithubIcon, LinkedinIcon } from "../icons/SocialIcons";
import { formatGithubUrl, formatLinkedinUrl } from "../../utils/url.utils";

interface ProfileHeaderProps {
  profile: UserProfileResponse;
  bannerConfig: BannerConfig | null;
  isOwner: boolean;
  isCandidateView: boolean;
  displayName: string;
  displayTitle: string;
  displayUniversity: string;
  displaySummary: string;
  displayEmail: string;
  displayAvatar: string | null;
  resumeUrl: string;
  hasResume: boolean;
  educationList: any[];
  onOpenBannerEdit: () => void;
  onOpenEditModal: () => void;
  onOpenPreferencesModal: () => void;
  onOpenLogoutConfirm: () => void;
  onOpenAccountSettings: () => void;
}

export function ProfileHeader({
  profile,
  bannerConfig,
  isCandidateView,
  displayName,
  displayTitle,
  displayUniversity,
  displaySummary,
  displayEmail,
  displayAvatar,
  resumeUrl,
  hasResume,
  educationList,
  onOpenBannerEdit,
  onOpenEditModal,
  onOpenPreferencesModal,
  onOpenLogoutConfirm,
  onOpenAccountSettings,
}: ProfileHeaderProps) {
  const [copiedEmail, setCopiedEmail] = useState<boolean>(false);

  const handleCopyEmail = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!displayEmail) return;

    const onCopySuccess = () => {
      setCopiedEmail(true);
      toast.success("Email copied to clipboard!", {
        autoClose: 2000,
        position: "bottom-right",
      });
      setTimeout(() => setCopiedEmail(false), 2000);
    };

    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(displayEmail).then(onCopySuccess).catch(() => {
        fallbackCopy(displayEmail, onCopySuccess);
      });
    } else {
      fallbackCopy(displayEmail, onCopySuccess);
    }
  };

  const fallbackCopy = (text: string, onSuccess: () => void) => {
    try {
      const textArea = document.createElement("textarea");
      textArea.value = text;
      textArea.style.position = "fixed";
      textArea.style.opacity = "0";
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      onSuccess();
    } catch (err) {
      console.error("Copy failed:", err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Identity Card */}
      <div className="bg-surface rounded-2xl border border-border-main overflow-hidden shadow-xs">
        {/* Banner (Dynamic: custom gradient or image) */}
        <div
          style={
            bannerConfig?.type === "image" && bannerConfig.imageUrl
              ? {
                  backgroundImage: `url(${bannerConfig.imageUrl})`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                }
              : bannerConfig?.type === "gradient" && bannerConfig.gradient
              ? {
                  background: `linear-gradient(${bannerConfig.gradient.angle}deg, ${bannerConfig.gradient.color1}, ${bannerConfig.gradient.color2})`,
                }
              : {
                  background: "linear-gradient(to right, #0f172a, #172554, #1e1b4b)",
                }
          }
          className="h-32 w-full relative transition-all duration-300 overflow-hidden group"
        >
          {!isCandidateView && (
            <div className="absolute top-3 right-3 z-10 flex items-center gap-2">
              <button
                type="button"
                onClick={onOpenBannerEdit}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold text-white/80 hover:text-white bg-black/30 hover:bg-black/50 backdrop-blur-md border border-white/15 transition-all cursor-pointer shadow-xs"
                title="Customize background banner"
              >
                <Palette className="w-3.5 h-3.5 text-indigo-400" />
                <span>Banner</span>
              </button>
              <button
                type="button"
                onClick={onOpenLogoutConfirm}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold text-white/80 hover:text-white bg-black/30 hover:bg-black/50 backdrop-blur-md border border-white/15 transition-all cursor-pointer shadow-xs"
                title="Sign out of SquadUp"
              >
                <LogOut className="w-3.5 h-3.5 text-rose-400" />
                <span>Log Out</span>
              </button>
            </div>
          )}
        </div>

        {/* Avatar & Personal Info */}
        <div className="p-6 pt-0 space-y-4">
          {/* Avatar Hanging Over Banner */}
          <div className="flex items-end justify-between -mt-12 mb-2 relative z-10">
            <div className="w-24 h-24 rounded-3xl border-4 border-surface shadow-md bg-surface overflow-hidden shrink-0">
              {displayAvatar ? (
                <img
                  src={displayAvatar}
                  alt={displayName}
                  className="w-full h-full object-cover rounded-xl"
                  onError={(e) => {
                    (e.currentTarget as HTMLElement).style.display = "none";
                  }}
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-tr from-primary-action to-cross-campus text-white flex items-center justify-center text-3xl font-black font-heading rounded-xl">
                  {displayName[0]?.toUpperCase() || "U"}
                </div>
              )}
            </div>

            <VerificationBadge
              isVerified={profile.isVerifiedStudent}
              reason={profile.verificationReason}
              email={displayEmail}
              university={profile.organizationName || displayUniversity}
              domain={profile.organizationDomain}
              className="mb-1"
            />
          </div>

          {/* Name & Headline */}
          <div>
            <h1 className="text-2xl font-black text-text-main font-heading">
              {displayName}
            </h1>
            <p className="text-xs sm:text-sm text-text-muted font-medium mt-1 leading-snug">
              {displayTitle}
            </p>
          </div>

          {/* Affiliation & Resume links */}
          <div className="space-y-1.5 text-xs text-text-muted pt-1 border-t border-border-main">
            <div className="flex items-center gap-1.5 text-text-main font-semibold">
              <Building className="w-3.5 h-3.5 text-primary-action" />
              <span>{displayUniversity}</span>
            </div>
            {educationList[0] && (
              <div className="flex items-center gap-1.5 font-medium">
                <GraduationCap className="w-3.5 h-3.5 text-primary-action" />
                <span>{educationList[0].degree || educationList[0].college}</span>
              </div>
            )}
            {displayEmail && (
              <div className="flex items-center gap-1.5 pt-0.5">
                <button
                  type="button"
                  onClick={handleCopyEmail}
                  className="inline-flex items-center gap-1.5 text-text-muted hover:text-text-main transition-colors group cursor-pointer text-left py-0.5 rounded"
                  title="Click to copy email address"
                >
                  <Mail className="w-3.5 h-3.5 text-text-muted group-hover:text-primary-action transition-colors shrink-0" />
                  <span className="group-hover:underline">{displayEmail}</span>
                  {copiedEmail ? (
                    <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-emerald-600 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20 animate-in fade-in duration-150">
                      <Check className="w-2.5 h-2.5 text-emerald-500" /> Copied!
                    </span>
                  ) : (
                    <Copy className="w-3 h-3 text-text-muted opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                  )}
                </button>
              </div>
            )}

            {/* Social & Professional Links (GitHub & LinkedIn) */}
            {(profile.githubUrl || profile.linkedinUrl) && (
              <div className="flex flex-wrap items-center gap-4 pt-1">
                {profile.githubUrl && (
                  <a
                    href={formatGithubUrl(profile.githubUrl) || "#"}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-lg text-xs font-semibold text-text-main cursor-pointer hover:underline"
                    title="View GitHub Profile"
                  >
                    <GithubIcon className="w-3.5 h-3.5 text-text-main" />
                    <span>GitHub</span>
                  </a>
                )}
                {profile.linkedinUrl && (
                  <a
                    href={formatLinkedinUrl(profile.linkedinUrl) || "#"}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-lg text-xs font-semibold text-[#0a66c2] cursor-pointer hover:underline"
                    title="View LinkedIn Profile"
                  >
                    <LinkedinIcon className="w-3.5 h-3.5 text-[#0a66c2]" />
                    <span>LinkedIn</span>
                  </a>
                )}
              </div>
            )}

            <div className="pt-1">
              {hasResume ? (
                <a
                  href={resumeUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-primary-action font-bold hover:underline inline-flex items-center gap-1 cursor-pointer"
                >
                  <FileText className="w-3.5 h-3.5" /> View Resume PDF <ArrowUpRight className="w-3 h-3" />
                </a>
              ) : (
                <span className="text-text-muted italic">No resume PDF uploaded yet</span>
              )}
            </div>
          </div>

          {/* Action Buttons (Current User Only) */}
          {!isCandidateView && (
            <div className="space-y-2 pt-2 border-t border-border-main">
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={onOpenAccountSettings}
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-text-main bg-surface-dim hover:bg-surface border border-border-main transition-colors cursor-pointer"
                >
                  <Settings className="w-3.5 h-3.5 text-text-muted" />
                  <span>Account</span>
                </button>

                <button
                  type="button"
                  onClick={onOpenEditModal}
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-white bg-primary-action hover:bg-primary-hover shadow-xs transition-colors cursor-pointer"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  <span>Edit Profile</span>
                </button>
                <button
                  type="button"
                  onClick={onOpenPreferencesModal}
                  className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-text-main bg-surface hover:bg-surface-dim border border-border-main transition-colors cursor-pointer"
                >
                  <Sliders className="w-3.5 h-3.5 text-primary-action" />
                  <span>Preferences & Settings</span>
                </button>

                <button
                  type="button"
                  onClick={onOpenLogoutConfirm}
                  className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-rose-500 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 transition-colors cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5 text-rose-500" />
                  <span>Log Out</span>
                </button>
              </div>
            </div>
          )}

          {/* About Section */}
          <div className="pt-4 border-t border-border-main space-y-1">
            <h3 className="text-xs font-black text-text-main uppercase tracking-wider">
              About
            </h3>
            <p className="text-xs text-text-muted leading-relaxed">
              {displaySummary}
            </p>
          </div>
        </div>
      </div>

      {/* Academic Background Card */}
      <div className="bg-surface rounded-2xl border border-border-main p-6 shadow-xs space-y-4">
        <h3 className="text-xs font-black text-text-main font-heading uppercase tracking-wider">
          Academic Background
        </h3>
        {educationList.length > 0 ? (
          <div className="space-y-3">
            {educationList.map((edu: any, i: number) => (
              <div key={i} className="space-y-0.5">
                <h4 className="text-sm font-bold text-text-main">{edu.college || displayUniversity}</h4>
                <p className="text-xs text-text-muted font-medium">{edu.degree}</p>
                {edu.year && <p className="text-[11px] text-text-muted font-medium">{edu.year}</p>}
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-0.5">
            <h4 className="text-sm font-bold text-text-main">{displayUniversity}</h4>
            <p className="text-xs text-text-muted italic">Student Participant</p>
          </div>
        )}
      </div>
    </div>
  );
}
