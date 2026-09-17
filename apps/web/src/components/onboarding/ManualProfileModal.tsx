import React, { useState } from "react";
import { Code2, Plus, X, Check, AlertCircle } from "lucide-react";

interface ManualProfileData {
  title: string;
  summary: string;
  degree: string;
  college: string;
  skills: string[];
  githubUrl: string;
  linkedinUrl: string;
}

interface ManualProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: ManualProfileData) => Promise<void>;
  isSubmitting: boolean;
  defaultCollegeName?: string;
}

const POPULAR_SKILL_SUGGESTIONS = [
  "React",
  "TypeScript",
  "Python",
  "FastAPI",
  "Node.js",
  "PostgreSQL",
  "Docker",
  "Tailwind CSS",
  "Next.js",
  "PyTorch",
];

export function ManualProfileModal({
  isOpen,
  onClose,
  onSubmit,
  isSubmitting,
  defaultCollegeName,
}: ManualProfileModalProps) {
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [degree, setDegree] = useState("");
  const [college, setCollege] = useState(defaultCollegeName || "");
  const [skills, setSkills] = useState<string[]>([]);
  const [skillInput, setSkillInput] = useState("");
  const [githubUrl, setGithubUrl] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleAddSkill = (skillToAdd: string) => {
    const trimmed = skillToAdd.trim();
    if (!trimmed) return;
    if (!skills.some((s) => s.toLowerCase() === trimmed.toLowerCase())) {
      setSkills((prev) => [...prev, trimmed]);
    }
    setSkillInput("");
  };

  const handleRemoveSkill = (skillToRemove: string) => {
    setSkills((prev) => prev.filter((s) => s !== skillToRemove));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!title.trim()) {
      setError("Please provide a primary role / headline.");
      return;
    }

    if (skills.length === 0) {
      setError("Please add at least 1 technical skill.");
      return;
    }

    try {
      await onSubmit({
        title: title.trim(),
        summary: summary.trim(),
        degree: degree.trim(),
        college: college.trim(),
        skills,
        githubUrl: githubUrl.trim(),
        linkedinUrl: linkedinUrl.trim(),
      });
    } catch (err: any) {
      setError(err?.message || "Failed to save profile. Please try again.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150 overflow-y-auto">
      <div className="bg-surface rounded-2xl border border-border-main shadow-2xl max-w-lg w-full p-5 sm:p-6 space-y-4 animate-in zoom-in-95 duration-150 relative my-4 max-h-[92vh] overflow-y-auto">
        {/* Close Button */}
        <button
          onClick={onClose}
          disabled={isSubmitting}
          className="absolute top-4 right-4 p-1 rounded-lg text-text-muted hover:text-text-main hover:bg-surface-dim transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Header */}
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-primary-light text-primary-action text-[11px] font-bold uppercase tracking-wider">
            <Code2 className="w-3 h-3" />
            <span>Manual Profile Builder</span>
          </div>
          <h3 className="text-lg sm:text-xl font-bold text-text-main tracking-tight font-heading">
            Tell us about your developer skills
          </h3>
          <p className="text-xs text-text-muted">
            Set up your headline and technical skills to match with squads.
          </p>
        </div>

        {error && (
          <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-500 text-xs flex items-center gap-2">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="space-y-3">
          {/* Headline / Title */}
          <div>
            <label className="block text-[11px] font-bold text-text-muted uppercase tracking-wider mb-1">
              Headline / Primary Role <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Full Stack Developer, AI & ML Engineer"
              className="w-full px-3 py-2 rounded-xl border border-border-main bg-surface text-text-main text-xs focus:outline-none focus:ring-2 focus:ring-primary-action/20 focus:border-primary-action"
            />
          </div>

          {/* Degree & College */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div>
              <label className="block text-[11px] font-bold text-text-muted uppercase tracking-wider mb-1">
                Degree & Grad Year
              </label>
              <input
                type="text"
                value={degree}
                onChange={(e) => setDegree(e.target.value)}
                placeholder="e.g. B.Tech CS, 2027"
                className="w-full px-3 py-2 rounded-xl border border-border-main bg-surface text-text-main text-xs focus:outline-none focus:ring-2 focus:ring-primary-action/20 focus:border-primary-action"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-text-muted uppercase tracking-wider mb-1">
                College / Institution
              </label>
              <input
                type="text"
                value={college}
                onChange={(e) => setCollege(e.target.value)}
                placeholder="e.g. VIT Vellore"
                className="w-full px-3 py-2 rounded-xl border border-border-main bg-surface text-text-main text-xs focus:outline-none focus:ring-2 focus:ring-primary-action/20 focus:border-primary-action"
              />
            </div>
          </div>

          {/* Bio / Summary */}
          <div>
            <label className="block text-[11px] font-bold text-text-muted uppercase tracking-wider mb-1">
              Bio / About You
            </label>
            <textarea
              rows={2}
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="Briefly describe what you like building or your hackathon goals..."
              className="w-full px-3 py-2 rounded-xl border border-border-main bg-surface text-text-main text-xs focus:outline-none focus:ring-2 focus:ring-primary-action/20 focus:border-primary-action resize-none"
            />
          </div>

          {/* Technical Skills Tag Input */}
          <div>
            <label className="block text-[11px] font-bold text-text-muted uppercase tracking-wider mb-1">
              Technical Skills <span className="text-red-500">*</span>
            </label>
            <div className="flex gap-1.5 mb-1.5">
              <input
                type="text"
                value={skillInput}
                onChange={(e) => setSkillInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddSkill(skillInput);
                  }
                }}
                placeholder="Type a skill and press Enter (e.g. React, Python)..."
                className="flex-1 px-3 py-2 rounded-xl border border-border-main bg-surface text-text-main text-xs focus:outline-none focus:ring-2 focus:ring-primary-action/20 focus:border-primary-action"
              />
              <button
                type="button"
                onClick={() => handleAddSkill(skillInput)}
                className="px-3 py-2 rounded-xl bg-surface-dim hover:bg-surface text-text-main border border-border-main text-xs font-bold transition-colors cursor-pointer flex items-center gap-1"
              >
                <Plus className="w-3 h-3" />
                <span>Add</span>
              </button>
            </div>

            {/* Selected Skill Tags */}
            {skills.length > 0 && (
              <div className="flex flex-wrap gap-1 p-1.5 rounded-xl bg-surface-dim border border-border-main mb-1.5 max-h-24 overflow-y-auto">
                {skills.map((skill) => (
                  <span
                    key={skill}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-surface border border-border-main text-[11px] font-semibold text-text-main shadow-2xs"
                  >
                    <span>{skill}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveSkill(skill)}
                      className="text-text-muted hover:text-text-main ml-0.5 cursor-pointer"
                    >
                      <X className="w-2.5 h-2.5" />
                    </button>
                  </span>
                ))}
              </div>
            )}

            {/* Suggested Skill Chips */}
            <div className="flex flex-wrap gap-1 items-center">
              <span className="text-[10px] text-text-muted font-medium">Quick:</span>
              {POPULAR_SKILL_SUGGESTIONS.map((s) => {
                const alreadyAdded = skills.some((existing) => existing.toLowerCase() === s.toLowerCase());
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => handleAddSkill(s)}
                    disabled={alreadyAdded}
                    className={`px-1.5 py-0.5 rounded text-[10px] font-medium border transition-colors cursor-pointer ${
                      alreadyAdded
                        ? "bg-surface-dim text-text-muted border-border-main cursor-default"
                        : "bg-surface text-text-main border-border-main hover:bg-primary-light hover:text-primary-action hover:border-primary-border"
                    }`}
                  >
                    +{s}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Social Links */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-0.5">
            <div>
              <label className="block text-[11px] font-bold text-text-muted uppercase tracking-wider mb-1">
                GitHub URL
              </label>
              <input
                type="url"
                value={githubUrl}
                onChange={(e) => setGithubUrl(e.target.value)}
                placeholder="https://github.com/..."
                className="w-full px-3 py-2 rounded-xl border border-border-main bg-surface text-text-main text-xs focus:outline-none focus:ring-2 focus:ring-primary-action/20 focus:border-primary-action"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-text-muted uppercase tracking-wider mb-1">
                LinkedIn URL
              </label>
              <input
                type="url"
                value={linkedinUrl}
                onChange={(e) => setLinkedinUrl(e.target.value)}
                placeholder="https://linkedin.com/in/..."
                className="w-full px-3 py-2 rounded-xl border border-border-main bg-surface text-text-main text-xs focus:outline-none focus:ring-2 focus:ring-primary-action/20 focus:border-primary-action"
              />
            </div>
          </div>

          {/* Submit Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border-main">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-3.5 py-2 rounded-xl border border-border-main text-xs font-semibold text-text-muted hover:text-text-main hover:bg-surface-dim transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 rounded-xl bg-primary-action hover:bg-primary-hover text-white text-xs font-bold shadow-xs transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Save & Complete Profile</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
