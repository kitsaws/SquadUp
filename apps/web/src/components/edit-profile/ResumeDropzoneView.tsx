import React from "react";
import { Sparkles, Upload, FileText, Loader2 } from "lucide-react";

interface ResumeDropzoneViewProps {
  resumeFile: File | null;
  setResumeFile: (file: File | null) => void;
  handleFileDrop: (e: React.DragEvent<HTMLDivElement>) => void;
  handleResumeSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleUploadResume: () => void;
  isDragOver: boolean;
  setIsDragOver: (drag: boolean) => void;
  isSubmittingResume: boolean;
  isUploading: boolean;
  resumeInputRef: React.RefObject<HTMLInputElement | null>;
}

export function ResumeDropzoneView({
  resumeFile,
  setResumeFile,
  handleFileDrop,
  handleResumeSelect,
  handleUploadResume,
  isDragOver,
  setIsDragOver,
  isSubmittingResume,
  isUploading,
  resumeInputRef,
}: ResumeDropzoneViewProps) {
  return (
    <div className="p-5 rounded-2xl border border-primary-border bg-primary-light/30 space-y-3.5 relative overflow-hidden">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="p-1.5 rounded-lg bg-primary-action text-white shadow-2xs">
            <Sparkles className="w-4 h-4" />
          </span>
          <div>
            <h4 className="text-sm font-bold text-text-main font-heading">
              Upload New Resume
            </h4>
            <p className="text-[11px] text-text-muted">
              AI automatically parses latest skills, projects, and roles into your profile.
            </p>
          </div>
        </div>
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary-light text-primary-action border border-primary-border">
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
              ? "border-primary-action bg-primary-light/50 scale-[0.99]"
              : "border-primary-border hover:border-primary-action bg-surface"
          }`}
        >
          <Upload className="w-6 h-6 text-primary-action mx-auto mb-1.5" />
          <p className="text-xs font-semibold text-text-main">
            Drag and drop your PDF resume here, or{" "}
            <span className="text-primary-action underline">browse</span>
          </p>
          <p className="text-[10px] text-text-muted mt-0.5">Maximum size: 10MB • Format: .pdf</p>
        </div>
      ) : (
        <div className="bg-surface rounded-xl p-3.5 border border-primary-border flex items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <FileText className="w-5 h-5 text-primary-action shrink-0" />
            <div className="truncate text-left">
              <p className="text-xs font-bold text-text-main truncate">
                {resumeFile.name}
              </p>
              <p className="text-[10px] text-text-muted">
                {(resumeFile.size / (1024 * 1024)).toFixed(2)} MB • Ready to ingest
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setResumeFile(null)}
              className="text-xs text-text-muted hover:text-rose-600 font-semibold cursor-pointer p-1"
            >
              Remove
            </button>

            <button
              type="button"
              onClick={handleUploadResume}
              disabled={isSubmittingResume || isUploading}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-primary-action hover:bg-primary-hover disabled:opacity-50 text-white text-xs font-bold rounded-lg shadow-2xs transition-colors cursor-pointer"
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
  );
}
