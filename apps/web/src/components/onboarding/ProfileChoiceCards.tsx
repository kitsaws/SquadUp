import React, { useState } from "react";
import { Sparkles, FileText, Edit3, ArrowLeft, Building2, Globe, CheckCircle2 } from "lucide-react";
import { OrganizationItem } from "../../services/api";
import { ResumeDropzone } from "./ResumeDropzone";
import { ManualProfileModal } from "./ManualProfileModal";

interface ProfileChoiceCardsProps {
  selectedUniversity: OrganizationItem | null;
  isIndependent: boolean;
  onBackToStep1: () => void;
  onResumeUpload: (file: File) => Promise<void>;
  onManualSubmit: (data: any) => Promise<void>;
  isUploading: boolean;
  uploadError: string | null;
  isSubmittingManual: boolean;
}

export function ProfileChoiceCards({
  selectedUniversity,
  isIndependent,
  onBackToStep1,
  onResumeUpload,
  onManualSubmit,
  isUploading,
  uploadError,
  isSubmittingManual,
}: ProfileChoiceCardsProps) {
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Header section */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary-light text-primary-action text-xs font-bold uppercase tracking-wider">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Step 2 of 2</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight font-heading">
          Let's build your developer profile
        </h2>
        <p className="text-sm text-slate-600 max-w-lg mx-auto">
          SquadUp computes pure compatibility match scores based on your technical capabilities. Choose how to set up your profile.
        </p>

        {/* Selected Institution summary bar with back button */}
        <div className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-white border border-slate-200 text-xs text-slate-700 shadow-2xs mt-2">
          {isIndependent ? (
            <Globe className="w-3.5 h-3.5 text-purple-600" />
          ) : (
            <Building2 className="w-3.5 h-3.5 text-primary-action" />
          )}
          <span className="font-semibold text-slate-900">
            {isIndependent ? "Independent Participant" : selectedUniversity?.name}
          </span>
          <button
            type="button"
            onClick={onBackToStep1}
            className="text-xs font-bold text-primary-action hover:underline ml-1 cursor-pointer"
          >
            Change
          </button>
        </div>
      </div>

      {/* Dual Selection Cards */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
        {/* OPTION A: Highlighted Primary CTA — AI Resume Upload (7 cols) */}
        <div className="md:col-span-7 bg-gradient-to-b from-primary-light/40 to-white rounded-2xl border-2 border-primary-action/40 shadow-md p-6 sm:p-7 space-y-5 relative overflow-hidden">
          {/* Top Pill Badge */}
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary-action text-white text-xs font-bold shadow-2xs">
              <Sparkles className="w-3.5 h-3.5" />
              Recommended — Takes 10s
            </span>
            <span className="text-[11px] font-semibold text-primary-action uppercase tracking-wider">
              Zero Manual Typing
            </span>
          </div>

          <div className="space-y-1.5">
            <h3 className="text-lg font-bold text-slate-900 font-heading">
              Upload Resume (Smart Ingestion)
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Upload your PDF resume. Our AI parser extracts your technical skills, projects, and work experience, mapping them directly into the 143-node canonical taxonomy.
            </p>
          </div>

          {/* Integrated Dropzone */}
          <ResumeDropzone
            onUpload={onResumeUpload}
            isUploading={isUploading}
            uploadError={uploadError}
          />
        </div>

        {/* OPTION B: Secondary Fallback — Manual Setup (5 cols) */}
        <div className="md:col-span-5 bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-7 space-y-5 flex flex-col justify-between h-full">
          <div className="space-y-4">
            <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 text-slate-700 flex items-center justify-center shadow-2xs">
              <Edit3 className="w-5 h-5" />
            </div>

            <div className="space-y-1.5">
              <h3 className="text-lg font-bold text-slate-900 font-heading">
                Build Profile Manually
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Don't have a resume handy? Enter your primary role, bio, links, and select your skill tags manually.
              </p>
            </div>

            <ul className="space-y-2 text-xs text-slate-600 pt-1">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Headline & degree credentials</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Curated skill tags</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>GitHub & LinkedIn links</span>
              </li>
            </ul>
          </div>

          <button
            type="button"
            onClick={() => setIsManualModalOpen(true)}
            className="w-full py-2.5 px-4 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 hover:border-slate-400 text-slate-800 text-xs font-bold transition-all shadow-2xs flex items-center justify-center gap-2 cursor-pointer mt-4"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>Enter Details Manually</span>
          </button>
        </div>
      </div>

      {/* Back button */}
      <div className="text-center pt-2">
        <button
          type="button"
          onClick={onBackToStep1}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to University Selection</span>
        </button>
      </div>

      {/* Manual Profile Builder Modal */}
      <ManualProfileModal
        isOpen={isManualModalOpen}
        onClose={() => setIsManualModalOpen(false)}
        onSubmit={async (data) => {
          await onManualSubmit(data);
          setIsManualModalOpen(false);
        }}
        isSubmitting={isSubmittingManual}
        defaultCollegeName={isIndependent ? "" : selectedUniversity?.name}
      />
    </div>
  );
}
