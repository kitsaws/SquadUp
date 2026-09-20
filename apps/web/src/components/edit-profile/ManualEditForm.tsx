import React from "react";
import { Lock, Sparkles, Plus, X, Loader2, Check } from "lucide-react";

interface ManualEditFormProps {
  fullName: string;
  setFullName: (name: string) => void;
  title: string;
  setTitle: (title: string) => void;
  summary: string;
  setSummary: (summary: string) => void;
  skills: string[];
  setSkills: (skills: string[]) => void;
  newSkillInput: string;
  setNewSkillInput: (skill: string) => void;
  githubUrl: string;
  setGithubUrl: (url: string) => void;
  linkedinUrl: string;
  setLinkedinUrl: (url: string) => void;
  degree: string;
  setDegree: (degree: string) => void;
  isSavingManual: boolean;
  university?: string | null;
  handleAddSkill: () => void;
  handleRemoveSkill: (skill: string) => void;
  handleSaveManual: (e: React.FormEvent) => void;
  onCancel: () => void;
}

export function ManualEditForm({
  fullName,
  setFullName,
  title,
  setTitle,
  summary,
  setSummary,
  skills,
  newSkillInput,
  setNewSkillInput,
  githubUrl,
  setGithubUrl,
  linkedinUrl,
  setLinkedinUrl,
  degree,
  setDegree,
  isSavingManual,
  university,
  handleAddSkill,
  handleRemoveSkill,
  handleSaveManual,
  onCancel,
}: ManualEditFormProps) {
  return (
    <form onSubmit={handleSaveManual} className="space-y-4">
      {/* Full Name */}
      <div className="space-y-1">
        <label className="text-xs font-bold text-text-main uppercase tracking-wider block">
          Full Name
        </label>
        <input
          type="text"
          required
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder="e.g. Jane Doe"
          className="w-full px-3 py-2 text-xs rounded-xl border border-border-main bg-surface text-text-main focus:outline-none focus:ring-2 focus:ring-primary-action/20 focus:border-primary-action transition-all font-medium"
        />
      </div>

      {/* Professional Title */}
      <div className="space-y-1">
        <label className="text-xs font-bold text-text-main uppercase tracking-wider block">
          Headline / Role
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Full Stack Engineer | Systems & AI"
          className="w-full px-3 py-2 text-xs rounded-xl border border-border-main bg-surface text-text-main focus:outline-none focus:ring-2 focus:ring-primary-action/20 focus:border-primary-action transition-all font-medium"
        />
      </div>

      {/* University (Locked) */}
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold text-text-main uppercase tracking-wider block">
            University / Institution
          </label>
          <span className="text-[10px] font-bold text-text-muted flex items-center gap-1">
            <Lock className="w-3 h-3 text-text-muted" /> Managed via Institution
          </span>
        </div>
        <div className="flex items-center justify-between bg-surface-dim/70 border border-border-main rounded-xl px-3 py-2 text-xs text-text-main font-semibold cursor-not-allowed">
          <span>{university || "Collegiate Participant"}</span>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-surface border border-border-main text-text-muted">
            Verified
          </span>
        </div>
        <p className="text-[10px] text-text-muted italic">
          Institutional affiliation is bound to your Clerk university organization to maintain event eligibility.
        </p>
      </div>

      {/* Bio / Summary */}
      <div className="space-y-1">
        <label className="text-xs font-bold text-text-main uppercase tracking-wider block">
          About / Bio
        </label>
        <textarea
          rows={3}
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          placeholder="Brief summary of your interests, hackathon goals, and technical focus..."
          className="w-full px-3 py-2 text-xs rounded-xl border border-border-main bg-surface text-text-main focus:outline-none focus:ring-2 focus:ring-primary-action/20 focus:border-primary-action transition-all font-medium resize-none"
        />
      </div>

      {/* Skills Tag Manager */}
      <div className="space-y-2 pt-1 border-t border-border-main">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold text-text-main uppercase tracking-wider block flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-primary-action" /> Technical Skills
          </label>
          <span className="text-[11px] text-primary-action font-bold">
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
            className="flex-1 px-3 py-1.5 text-xs rounded-xl border border-border-main bg-surface text-text-main focus:outline-none focus:ring-2 focus:ring-primary-action/20 focus:border-primary-action transition-all font-medium"
          />
          <button
            type="button"
            onClick={handleAddSkill}
            className="px-3 py-1.5 bg-primary-light hover:bg-primary-light/80 text-primary-action text-xs font-bold rounded-xl border border-primary-border transition-colors flex items-center gap-1 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" /> Add
          </button>
        </div>

        {skills.length > 0 ? (
          <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-2 bg-surface rounded-xl border border-border-main">
            {skills.map((skill, index) => (
              <span
                key={index}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-surface-dim border border-border-main text-text-main shadow-2xs"
              >
                <span>{skill}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveSkill(skill)}
                  className="text-text-muted hover:text-rose-600 rounded-full p-0.5 transition-colors cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        ) : (
          <p className="text-[11px] text-text-muted italic">No skills specified yet.</p>
        )}
      </div>

      {/* Links */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t border-border-main">
        <div className="space-y-1">
          <label className="text-[11px] font-bold text-text-muted uppercase tracking-wider block">
            GitHub Profile URL
          </label>
          <input
            type="text"
            value={githubUrl}
            onChange={(e) => setGithubUrl(e.target.value)}
            placeholder="https://github.com/... or username"
            className="w-full px-3 py-1.5 text-xs rounded-xl border border-border-main bg-surface text-text-main focus:outline-none focus:ring-2 focus:ring-primary-action/20 focus:border-primary-action transition-all font-medium"
          />
        </div>

        <div className="space-y-1">
          <label className="text-[11px] font-bold text-text-muted uppercase tracking-wider block">
            LinkedIn Profile URL
          </label>
          <input
            type="text"
            value={linkedinUrl}
            onChange={(e) => setLinkedinUrl(e.target.value)}
            placeholder="https://linkedin.com/in/... or handle"
            className="w-full px-3 py-1.5 text-xs rounded-xl border border-border-main bg-surface text-text-main focus:outline-none focus:ring-2 focus:ring-primary-action/20 focus:border-primary-action transition-all font-medium"
          />
        </div>
      </div>

      {/* Academic Degree / Major */}
      <div className="space-y-1">
        <label className="text-[11px] font-bold text-text-muted uppercase tracking-wider block">
          Degree / Major
        </label>
        <input
          type="text"
          value={degree}
          onChange={(e) => setDegree(e.target.value)}
          placeholder="e.g. B.S. Computer Science"
          className="w-full px-3 py-1.5 text-xs rounded-xl border border-border-main bg-surface text-text-main focus:outline-none focus:ring-2 focus:ring-primary-action/20 focus:border-primary-action transition-all font-medium"
        />
      </div>

      {/* Action Buttons */}
      <div className="pt-4 border-t border-border-main flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-xs font-bold text-text-muted hover:bg-surface-dim rounded-xl transition-colors cursor-pointer"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSavingManual}
          className="inline-flex items-center gap-1.5 px-5 py-2 bg-primary-action hover:bg-primary-hover disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-colors shadow-xs cursor-pointer"
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
  );
}
