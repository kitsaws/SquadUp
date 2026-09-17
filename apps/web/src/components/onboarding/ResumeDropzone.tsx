import React, { useState, useRef } from "react";
import { UploadCloud, FileText, CheckCircle2, AlertCircle, X, Sparkles, ArrowRight } from "lucide-react";

interface ResumeDropzoneProps {
  onUpload: (file: File) => Promise<void>;
  isUploading: boolean;
  uploadError: string | null;
}

export function ResumeDropzone({ onUpload, isUploading, uploadError }: ResumeDropzoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateAndSetFile = (file: File) => {
    setLocalError(null);

    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      setLocalError("Please upload a PDF document (.pdf). Other formats are not supported.");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setLocalError("File size exceeds 10MB limit. Please upload a smaller PDF.");
      return;
    }

    setSelectedFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const handleRemoveFile = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedFile(null);
    setLocalError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleGenerateClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (selectedFile && !isUploading) {
      onUpload(selectedFile);
    }
  };

  const errorToShow = localError || uploadError;

  return (
    <div className="space-y-4">
      {/* Dropzone Container */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !isUploading && !selectedFile && fileInputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-2xl p-6 sm:p-7 text-center transition-all ${
          selectedFile
            ? "border-primary-action/60 bg-primary-light/30"
            : isDragOver
            ? "border-primary-action bg-primary-light/50 scale-[1.01] cursor-pointer"
            : "border-border-main bg-surface-dim/50 hover:bg-surface-dim hover:border-primary-action/50 cursor-pointer"
        } ${isUploading ? "pointer-events-none opacity-80" : ""}`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,application/pdf"
          onChange={handleFileChange}
          className="hidden"
          disabled={isUploading}
        />

        {selectedFile ? (
          /* File Selected Preview State */
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3.5 bg-surface rounded-xl border border-primary-border shadow-xs text-left">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-primary-light border border-primary-border flex items-center justify-center text-primary-action shrink-0">
                  <FileText className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h4 className="text-xs sm:text-sm font-bold text-text-main truncate font-heading">
                    {selectedFile.name}
                  </h4>
                  <span className="text-[11px] text-text-muted">
                    {Math.round(selectedFile.size / 1024)} KB • Ready to parse
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleRemoveFile}
                disabled={isUploading}
                className="p-1.5 rounded-lg text-text-muted hover:text-text-main hover:bg-surface-dim transition-colors cursor-pointer shrink-0 ml-2"
                title="Change or remove resume"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Prominent "Generate Profile" Action Button */}
            <button
              type="button"
              onClick={handleGenerateClick}
              disabled={isUploading}
              className="w-full py-3 px-5 rounded-xl bg-primary-action hover:bg-primary-hover text-white text-xs sm:text-sm font-bold shadow-md shadow-primary-action/25 transition-all flex items-center justify-center gap-2 cursor-pointer hover:scale-[1.01] disabled:opacity-60"
            >
              {isUploading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Analyzing Resume & Building Profile...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Generate Profile</span>
                  <ArrowRight className="w-4 h-4 ml-1" />
                </>
              )}
            </button>
          </div>
        ) : (
          /* Empty / Awaiting File State */
          <div className="flex flex-col items-center justify-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-surface border border-border-main shadow-xs flex items-center justify-center text-primary-action group-hover:scale-105 transition-transform">
              <UploadCloud className="w-6 h-6" />
            </div>

            <div className="space-y-1">
              <h4 className="text-sm font-bold text-text-main font-heading">
                Drag and drop your resume PDF
              </h4>
              <p className="text-xs text-text-muted max-w-sm mx-auto">
                Supports standard PDF resumes up to 10MB. We'll extract your skills and projects into your profile.
              </p>
            </div>

            <button
              type="button"
              className="mt-1 px-4 py-1.5 rounded-xl bg-surface border border-border-main text-xs font-bold text-text-main hover:bg-surface-dim hover:border-primary-border transition-all shadow-2xs pointer-events-none"
            >
              Browse Files
            </button>
          </div>
        )}
      </div>

      {/* Error message */}
      {errorToShow && (
        <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-500 text-xs flex items-center gap-2">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>{errorToShow}</span>
        </div>
      )}
    </div>
  );
}
