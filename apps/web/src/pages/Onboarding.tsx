import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useClerk } from "@clerk/react";
import { useUserContext } from "../contexts/UserContext";
import { organizersApi, profileApi, resumeApi, OrganizationItem } from "../services/api";
import { UniversitySearchSelect } from "../components/onboarding/UniversitySearchSelect";
import { UniversityReminderModal } from "../components/onboarding/UniversityReminderModal";
import { ProfileChoiceCards } from "../components/onboarding/ProfileChoiceCards";
import { ResumeProcessingNotice } from "../components/onboarding/ResumeProcessingNotice";
import { OnboardingCompletedModal } from "../components/onboarding/OnboardingCompletedModal";

export function Onboarding() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { setActive } = useClerk();
  const { user, profile, refreshProfile, isOnboardingComplete, isSignedIn, isLoaded } = useUserContext();

  // Navigation steps: 1 = University, 2 = Profile Choice, 3 = Resume Processing Success
  const stepParam = parseInt(searchParams.get("step") || "1", 10);
  const [step, setStep] = useState<number>(stepParam >= 1 && stepParam <= 3 ? stepParam : 1);

  // If the user already completed onboarding prior to visiting this page, bounce them away unless on step 3 (completion)
  useEffect(() => {
    if (isLoaded && isSignedIn && isOnboardingComplete && step !== 3) {
      navigate("/", { replace: true });
    }
  }, [isLoaded, isSignedIn, isOnboardingComplete, step, navigate]);

  // University state
  const [universities, setUniversities] = useState<OrganizationItem[]>([]);
  const [isLoadingUniversities, setIsLoadingUniversities] = useState(true);
  const [selectedUniversity, setSelectedUniversity] = useState<OrganizationItem | null>(null);
  const [isIndependent, setIsIndependent] = useState<boolean>(false);
  const [isReminderOpen, setIsReminderOpen] = useState<boolean>(false);

  // Profile setup & completion state
  const [isUploadingResume, setIsUploadingResume] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isSubmittingManual, setIsSubmittingManual] = useState(false);
  const [resumeJobId, setResumeJobId] = useState<string | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [isCompletedModalOpen, setIsCompletedModalOpen] = useState(false);
  const [completionMethod, setCompletionMethod] = useState<"resume" | "manual">("resume");

  // Sync step state with URL param
  const updateStep = (newStep: number) => {
    setStep(newStep);
    setSearchParams({ step: newStep.toString() });
  };

  // Fetch registered universities
  useEffect(() => {
    async function loadUniversities() {
      setIsLoadingUniversities(true);
      try {
        const data = await organizersApi.getUniversities();
        setUniversities(data || []);

        // If user already had a university set in profile, pre-select it
        if (profile?.university) {
          const match = data.find((u) => u.name.toLowerCase() === profile.university?.toLowerCase());
          if (match) setSelectedUniversity(match);
        }
      } catch (err) {
        console.error("[Onboarding] Error fetching universities:", err);
      } finally {
        setIsLoadingUniversities(false);
      }
    }
    loadUniversities();
  }, [profile?.university]);

  // Handle university selection in Step 1
  const handleSelectUniversity = (uni: OrganizationItem | null, independent: boolean) => {
    setSelectedUniversity(uni);
    setIsIndependent(independent);
  };

  // When clicking "Continue to Profile Setup" in Step 1, open confirmation / warning modal
  const handleProceedStep1 = () => {
    if (!selectedUniversity && !isIndependent) return;
    setIsReminderOpen(true);
  };

  // Confirm in modal -> Transition to Step 2
  const handleConfirmUniversity = () => {
    setIsReminderOpen(false);
    updateStep(2);
  };

  // Finalize onboarding: Complete with AI Resume Upload
  const handleResumeUpload = async (file: File) => {
    setIsUploadingResume(true);
    setUploadError(null);

    try {
      // 1. Upload Resume PDF
      const uploadRes = await resumeApi.uploadResume(file);
      setResumeJobId(uploadRes.jobId);
      setUploadedFileName(file.name);

      // 2. Commit university selection to backend upon completion of onboarding
      if (selectedUniversity?.clerkOrgId) {
        await organizersApi.selectUniversity(selectedUniversity.clerkOrgId);
        if (setActive) {
          try {
            await setActive({ organization: selectedUniversity.clerkOrgId });
          } catch (activeErr) {
            console.warn("[Onboarding] Could not set active organization in Clerk session:", activeErr);
          }
        }
      } else if (isIndependent) {
        await profileApi.updateProfile({ university: undefined });
      }

      // 3. Mark onboarding complete in local storage
      if (user?.id) {
        localStorage.setItem(`squadup_onboarding_done_${user.id}`, "true");
      }

      // 4. Refresh UserContext bypassing cache
      await refreshProfile(true);

      // 5. Open Onboarding Completed celebration modal & transition to Step 3
      setCompletionMethod("resume");
      setIsCompletedModalOpen(true);
      updateStep(3);
    } catch (err: any) {
      console.error("[Onboarding] Error uploading resume:", err);
      setUploadError(err?.message || "Failed to upload resume. Please try again.");
    } finally {
      setIsUploadingResume(false);
    }
  };

  // Finalize onboarding: Complete with Manual Profile
  const handleManualProfileSubmit = async (data: any) => {
    setIsSubmittingManual(true);
    try {
      // 1. Commit profile and university to backend upon completion of onboarding
      await profileApi.updateProfile({
        title: data.title,
        summary: data.summary,
        skills: data.skills,
        education: data.degree
          ? [{ degree: data.degree, college: data.college || selectedUniversity?.name || "" }]
          : [],
        githubUrl: data.githubUrl || null,
        linkedinUrl: data.linkedinUrl || null,
        university: selectedUniversity ? selectedUniversity.name : undefined,
      });

      // 2. If institutional university selected, link Organization
      if (selectedUniversity?.clerkOrgId) {
        await organizersApi.selectUniversity(selectedUniversity.clerkOrgId);
        if (setActive) {
          try {
            await setActive({ organization: selectedUniversity.clerkOrgId });
          } catch (activeErr) {
            console.warn("[Onboarding] Could not set active organization in Clerk session:", activeErr);
          }
        }
      }

      // 3. Mark onboarding complete in local storage
      if (user?.id) {
        localStorage.setItem(`squadup_onboarding_done_${user.id}`, "true");
      }

      // 4. Refresh UserContext bypassing cache
      await refreshProfile(true);

      // 5. Open Onboarding Completed celebration modal & transition to Step 3
      setCompletionMethod("manual");
      setIsCompletedModalOpen(true);
      updateStep(3);
    } catch (err: any) {
      console.error("[Onboarding] Error saving manual profile:", err);
      throw err;
    } finally {
      setIsSubmittingManual(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-canvas py-8 sm:py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* STEP 1: Select Institution */}
        {step === 1 && (
          <UniversitySearchSelect
            universities={universities}
            isLoading={isLoadingUniversities}
            selectedUniversity={selectedUniversity}
            isIndependent={isIndependent}
            onSelectUniversity={handleSelectUniversity}
            onProceed={handleProceedStep1}
          />
        )}

        {/* STEP 2: Dual Profile Creation */}
        {step === 2 && (
          <ProfileChoiceCards
            selectedUniversity={selectedUniversity}
            isIndependent={isIndependent}
            onBackToStep1={() => updateStep(1)}
            onResumeUpload={handleResumeUpload}
            onManualSubmit={handleManualProfileSubmit}
            isUploading={isUploadingResume}
            uploadError={uploadError}
            isSubmittingManual={isSubmittingManual}
          />
        )}

        {/* STEP 3: Resume / Profile Success Notice (Optimistic Continuation) */}
        {step === 3 && (
          <ResumeProcessingNotice
            jobId={resumeJobId || ""}
            fileName={uploadedFileName || undefined}
            onContinue={() => navigate("/events")}
          />
        )}

        {/* University Confirmation & Warning Modal */}
        <UniversityReminderModal
          isOpen={isReminderOpen}
          selectedUniversity={selectedUniversity}
          isIndependent={isIndependent}
          onClose={() => setIsReminderOpen(false)}
          onConfirm={handleConfirmUniversity}
        />

        {/* Onboarding Completed Celebration Modal */}
        <OnboardingCompletedModal
          isOpen={isCompletedModalOpen}
          method={completionMethod}
          universityName={selectedUniversity ? selectedUniversity.name : null}
          onClose={() => setIsCompletedModalOpen(false)}
          onBrowseEvents={() => {
            setIsCompletedModalOpen(false);
            navigate("/events");
          }}
          onBrowseTeams={() => {
            setIsCompletedModalOpen(false);
            navigate("/teams");
          }}
        />
      </div>
    </div>
  );
}
