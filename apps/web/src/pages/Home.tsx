import React, { useState, useRef } from "react";
import { Show, SignUpButton, useAuth } from "@clerk/react";
import { useJobContext } from "../contexts/JobContext";
import { resumeApi } from "../services/api";
import { toast } from "react-toastify";

export function Home() {
  const { getToken } = useAuth();
  const { startJob, isUploading } = useJobContext();
  const [file, setFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    try {
      const token = await getToken();
      const data = await resumeApi.uploadResume(file);
      
      // Start polling in the global context
      startJob(data.jobId, token || "");
      toast.info("Resume uploaded! AI extraction started.", { position: "bottom-right" });
      
      // Clear the selected file
      setFile(null);
    } catch (err: any) {
      console.error("[Home] Resume upload error:", err);
      toast.error(err.message || "Upload failed. Please try again.", { position: "bottom-right" });
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-8 py-12">
      <Show when="signed-out">
        <section className="bg-surface rounded-2xl shadow-xs border border-border-main p-8 text-center flex flex-col items-center justify-center min-h-[40vh]">
          <h1 className="text-3xl font-bold mb-4 text-text-main">Welcome to SquadUp</h1>
          <p className="text-text-muted max-w-md text-lg">
            Join the platform built for universities and tech events. Sign in to start building your professional profile and scouting for teammates.
          </p>
          <div className="mt-8">
            <SignUpButton mode="modal">
              <button className="bg-primary-action text-white px-6 py-3 rounded-xl font-bold hover:bg-primary-hover transition-all shadow-xs hover:shadow-md cursor-pointer">
                Get Started Now
              </button>
            </SignUpButton>
          </div>
        </section>
      </Show>

      <Show when="signed-in">
        <section className="bg-surface rounded-2xl shadow-xs border border-border-main p-8 text-center flex flex-col items-center justify-center min-h-[40vh]">
          <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 px-6 py-4 rounded-xl flex items-center gap-3 mb-8">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="font-semibold text-lg">You are successfully authenticated!</p>
          </div>

          <h1 className="text-2xl font-bold mb-2 text-text-main">Build Your AI Profile</h1>
          <p className="text-text-muted mb-8 max-w-md">
            Upload your resume and our AI will automatically extract your skills, experience, and projects to match you with the perfect team.
          </p>

          <input type="file" accept=".pdf" className="hidden" ref={fileInputRef} onChange={handleFileChange} />

          {!file ? (
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className={`px-8 py-3 rounded-xl font-bold shadow-xs flex items-center gap-2 ${
                isUploading
                  ? "bg-surface-dim text-text-muted border border-border-main cursor-not-allowed"
                  : "bg-primary-action text-white hover:bg-primary-hover transition-all cursor-pointer"
              }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
              </svg>
              {isUploading ? "Processing..." : "Select Resume (PDF)"}
            </button>
          ) : (
            <div className="flex flex-col items-center gap-4">
              <p className="text-sm font-medium bg-surface-dim text-text-main px-4 py-2 rounded-xl border border-border-main">
                Selected: {file.name}
              </p>
              <button
                onClick={handleUpload}
                disabled={isUploading}
                className="bg-primary-action text-white px-8 py-3 rounded-xl font-bold hover:bg-primary-hover transition-all shadow-xs cursor-pointer"
              >
                Upload & Extract AI Profile
              </button>
            </div>
          )}
        </section>
      </Show>
    </div>
  );
}
