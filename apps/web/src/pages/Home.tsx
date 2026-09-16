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
        <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 text-center flex flex-col items-center justify-center min-h-[40vh]">
          <h1 className="text-3xl font-semibold mb-4 text-slate-800">Welcome to SquadUp</h1>
          <p className="text-slate-500 max-w-md text-lg">
            Join the platform built for universities and tech events. Sign in to start building your professional profile and scouting for teammates.
          </p>
          <div className="mt-8">
            <SignUpButton mode="modal">
              <button className="bg-primary-action text-white px-6 py-3 rounded-lg font-medium hover:bg-primary-hover transition-all shadow-md hover:shadow-lg cursor-pointer">
                Get Started Now
              </button>
            </SignUpButton>
          </div>
        </section>
      </Show>

      <Show when="signed-in">
        <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 text-center flex flex-col items-center justify-center min-h-[40vh]">
          <div className="bg-green-50 border border-green-200 text-green-700 px-6 py-4 rounded-lg flex items-center gap-3 mb-8">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="font-medium text-lg">You are successfully authenticated!</p>
          </div>

          <h1 className="text-2xl font-bold mb-2">Build Your AI Profile</h1>
          <p className="text-slate-500 mb-8 max-w-md">
            Upload your resume and our AI will automatically extract your skills, experience, and projects to match you with the perfect team.
          </p>

          <input type="file" accept=".pdf" className="hidden" ref={fileInputRef} onChange={handleFileChange} />

          {!file ? (
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className={`px-8 py-3 rounded-lg font-medium shadow-md flex items-center gap-2 ${
                isUploading
                  ? "bg-slate-300 text-slate-500 cursor-not-allowed"
                  : "bg-slate-900 text-white hover:bg-slate-800 transition-all cursor-pointer"
              }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
              </svg>
              {isUploading ? "Processing..." : "Select Resume (PDF)"}
            </button>
          ) : (
            <div className="flex flex-col items-center gap-4">
              <p className="text-sm font-medium bg-slate-100 px-4 py-2 rounded border border-slate-200">
                Selected: {file.name}
              </p>
              <button
                onClick={handleUpload}
                disabled={isUploading}
                className="bg-primary-action text-white px-8 py-3 rounded-lg font-medium hover:bg-primary-hover transition-all shadow-md cursor-pointer"
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
