import React, { useState, useEffect } from "react";
import { useJobContext } from "../contexts/JobContext";
import { useUser, UserProfile, SignInButton } from "@clerk/react";
import { Link, useParams } from "react-router-dom";
import {
  Shield,
  FileText,
  Building,
  GraduationCap,
  Briefcase,
  Layers,
  Sparkles,
  ExternalLink,
  Settings,
  ArrowUpRight,
  Upload,
  CheckCircle2,
  Users,
  ArrowRight,
  Crown,
  Clock,
  MapPin,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { SkillTag } from "../components/Badges";
import {
  profileApi,
  applicationsApi,
  UserProfileResponse,
  CandidateApplicationItem,
} from "../services/api";

export function ProfileSplit() {
  const { candidateId } = useParams<{ candidateId?: string }>();
  const { jobId, isUploading, status } = useJobContext();
  const { user } = useUser();

  const [profile, setProfile] = useState<UserProfileResponse | null>(null);
  const [myApplications, setMyApplications] = useState<CandidateApplicationItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [showClerkSettings, setShowClerkSettings] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function fetchProfileData() {
      setLoading(true);
      setError(null);

      try {
        if (candidateId) {
          // Public candidate profile view
          const publicProf = await profileApi.getPublicProfile(candidateId);
          if (isMounted) {
            setProfile(publicProf);
            setMyApplications([]);
          }
        } else {
          // Current logged-in user profile view
          const myProf = await profileApi.getProfile();
          if (isMounted) setProfile(myProf);

          // Fetch user's submitted applications
          try {
            const apps = await applicationsApi.getMyApplications();
            if (isMounted) setMyApplications(apps.applications || []);
          } catch {
            // Unauthenticated or none
          }
        }
      } catch (err: any) {
        console.error("[ProfileSplit] Error fetching profile:", err);
        if (isMounted) setError(err.message || "Failed to load profile.");
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    fetchProfileData();
    return () => {
      isMounted = false;
    };
  }, [candidateId]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 flex flex-col items-center justify-center space-y-3">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
        <p className="text-sm font-semibold text-slate-600">Loading student dossier...</p>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="max-w-md mx-auto my-20 bg-white rounded-2xl border border-slate-200 p-8 text-center space-y-4 shadow-sm">
        <AlertCircle className="w-12 h-12 text-blue-500 mx-auto" />
        <h2 className="text-xl font-bold text-slate-900 font-heading">
          {candidateId ? "Candidate Dossier Not Found" : "Authentication Required"}
        </h2>
        <p className="text-xs text-slate-500">
          {candidateId
            ? "The student candidate you are evaluating could not be found or their profile is private."
            : "Sign in with your university credentials to access your verified profile, AI competencies, and squad applications."}
        </p>
        <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
          {!candidateId && (
            <SignInButton mode="modal">
              <button className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer">
                Sign In to View Profile
              </button>
            </SignInButton>
          )}
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors"
          >
            Return Home
          </Link>
        </div>
      </div>
    );
  }

  const isCandidateView = Boolean(candidateId);
  const resumeUrl = isCandidateView
    ? `/api/resume/view/${candidateId}`
    : `/api/resume/view`;

  const hasResume = Boolean(profile.lastResumeUploadedAt || profile.resumePdfUrl || (profile as any).hasResume);

  const displayName = profile.name || user?.fullName || "Student Builder";
  const displayTitle = profile.title || "Full Stack Engineer & Hackathon Builder";
  const displayUniversity = profile.university || "Collegiate Participant";
  const displaySummary =
    profile.summary ||
    "Upload a resume to automatically extract your technical competencies, project experiences, and collegiate education using our AI parser.";

  const skillsList = profile.skills && profile.skills.length > 0 ? profile.skills : [];
  const educationList = profile.education || [];
  const experienceList = profile.experience || [];
  const projectsList = profile.projects || [];
  const userTeams = profile.teams || [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 animate-in fade-in duration-200">
      {/* Clerk User Management Modal */}
      {showClerkSettings && !isCandidateView && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 relative">
            <button
              onClick={() => setShowClerkSettings(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 font-bold text-sm bg-slate-100 p-2 rounded-full cursor-pointer"
            >
              ✕
            </button>
            <h3 className="text-lg font-black text-slate-900 mb-4 font-heading">
              Clerk Account & Authentication Settings
            </h3>
            <UserProfile routing="hash" />
          </div>
        </div>
      )}

      {/* Uploading Status Banner */}
      {jobId && isUploading && (
        <div className="bg-blue-50 border border-blue-200 p-6 rounded-2xl flex items-center gap-4">
          <div className="w-8 h-8 border-3 border-blue-200 border-t-blue-600 rounded-full animate-spin shrink-0" />
          <div>
            <h3 className="text-sm font-black text-blue-950">Ingesting Resume & Synthesizing Profile...</h3>
            <p className="text-xs text-blue-800 mt-0.5">{status || "Extracting semantic competencies..."}</p>
          </div>
        </div>
      )}

      {/* 2-PART RADICAL SPLIT LAYOUT */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* ================= LEFT SIDE (5 COLS): IDENTITY & BIO ================= */}
        <div className="lg:col-span-5 space-y-6">
          {/* Identity Card */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
            {/* Banner */}
            <div className="h-32 w-full bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 relative">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(99,102,241,0.25),transparent_50%)]" />
            </div>

            {/* Avatar & Personal Info */}
            <div className="p-6 pt-0 space-y-4">
              {/* Avatar Hanging Over Banner - square with heavily rounded corners */}
              <div className="flex items-end justify-between -mt-12 mb-2 relative z-10">
                <div className="w-24 h-24 rounded-2xl border-4 border-white shadow-md bg-white overflow-hidden shrink-0">
                  {user?.imageUrl && !isCandidateView ? (
                    <img
                      src={user.imageUrl}
                      alt={displayName}
                      className="w-full h-full object-cover rounded-xl"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-tr from-blue-600 to-indigo-700 text-white flex items-center justify-center text-3xl font-black font-heading rounded-xl">
                      {displayName[0]?.toUpperCase() || "U"}
                    </div>
                  )}
                </div>

                <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 mb-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  Verified Student
                </span>
              </div>

              {/* Name & Headline */}
              <div>
                <h1 className="text-2xl font-black text-slate-900 font-heading">
                  {displayName}
                </h1>
                <p className="text-xs sm:text-sm text-slate-600 font-medium mt-1 leading-snug">
                  {displayTitle}
                </p>
              </div>

              {/* Affiliation & Resume links */}
              <div className="space-y-1.5 text-xs text-slate-500 pt-1 border-t border-slate-100">
                <div className="flex items-center gap-1.5 text-slate-800 font-semibold">
                  <Building className="w-3.5 h-3.5 text-blue-600" />
                  <span>{displayUniversity}</span>
                </div>
                {educationList[0] && (
                  <div className="flex items-center gap-1.5 font-medium">
                    <GraduationCap className="w-3.5 h-3.5 text-indigo-600" />
                    <span>{educationList[0].degree || educationList[0].college}</span>
                  </div>
                )}
                {profile.email && (
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    <span>{profile.email}</span>
                  </div>
                )}
                <div className="pt-1">
                  {hasResume ? (
                    <a
                      href={resumeUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-blue-600 font-bold hover:underline inline-flex items-center gap-1 cursor-pointer"
                    >
                      <FileText className="w-3.5 h-3.5" /> View Resume PDF <ArrowUpRight className="w-3 h-3" />
                    </a>
                  ) : (
                    <span className="text-slate-400 italic">No resume PDF uploaded yet</span>
                  )}
                </div>
              </div>

              {/* Action Buttons (Current User Only) */}
              {!isCandidateView && (
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
                  <button
                    onClick={() => setShowClerkSettings(true)}
                    className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition-colors cursor-pointer"
                  >
                    <Settings className="w-3.5 h-3.5" />
                    <span>Account</span>
                  </button>

                  <Link
                    to="/resume-upload"
                    className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-xs transition-colors cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Update Profile</span>
                  </Link>
                </div>
              )}

              {/* About Section */}
              <div className="pt-4 border-t border-slate-100 space-y-1">
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                  About
                </h3>
                <p className="text-xs text-slate-700 leading-relaxed">
                  {displaySummary}
                </p>
              </div>
            </div>
          </div>

          {/* Education Card */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
            <h3 className="text-xs font-black text-slate-900 font-heading uppercase tracking-wider">
              Academic Background
            </h3>
            {educationList.length > 0 ? (
              <div className="space-y-3">
                {educationList.map((edu: any, i: number) => (
                  <div key={i} className="space-y-0.5">
                    <h4 className="text-sm font-bold text-slate-900">{edu.college}</h4>
                    <p className="text-xs text-slate-600 font-medium">{edu.degree}</p>
                    {edu.year && <p className="text-[11px] text-slate-400 font-medium">{edu.year}</p>}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic">No formal academic institutions listed yet.</p>
            )}
          </div>
        </div>

        {/* ================= RIGHT SIDE (7 COLS): SQUADS, SKILLS, EXP ================= */}
        <div className="lg:col-span-7 space-y-6">
          {/* Section 1: "Teams / Squads" */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-7 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-black text-slate-900 font-heading flex items-center gap-2">
                  <Users className="w-5 h-5 text-blue-600" /> {isCandidateView ? "Active Squads" : "My Squads"}
                </h2>
                <p className="text-xs text-slate-500">
                  {isCandidateView
                    ? "Teams this candidate is currently participating in or leading."
                    : "Teams you are participating in or have applied to join."}
                </p>
              </div>

              <Link
                to="/teams"
                className="text-xs font-bold text-blue-600 hover:underline inline-flex items-center gap-1"
              >
                Explore More Squads <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {/* Squads Container */}
            <div className="space-y-3.5 max-h-[420px] overflow-y-auto pr-1">
              {/* 1. Confirmed Memberships */}
              {userTeams.map((squad) => (
                <div
                  key={squad.teamId}
                  className={`p-4 rounded-xl border transition-all flex flex-col justify-between gap-3 ${
                    squad.role === "Leader"
                      ? "bg-blue-50/30 border-blue-200 hover:border-blue-300"
                      : "bg-slate-50/50 border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        {squad.role === "Leader" ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 flex items-center gap-1">
                            <Crown className="w-3 h-3 text-blue-600" /> Squad Leader
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 text-slate-700">
                            Member
                          </span>
                        )}
                      </div>

                      <h3 className="text-base font-bold text-slate-900 font-heading">
                        {squad.teamName}
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Joined {new Date(squad.joinedAt).toLocaleDateString()}
                      </p>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-xs font-bold text-slate-800 block">
                        Role: {squad.role}
                      </span>
                    </div>
                  </div>

                  {/* Action Link */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-200/70 text-xs">
                    <span className="text-slate-500 font-medium">
                      Status: <strong className="text-slate-800">Active Member</strong>
                    </span>

                    <Link
                      to={`/team/${squad.teamId}`}
                      className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl font-bold transition-colors shadow-2xs cursor-pointer ${
                        squad.role === "Leader"
                          ? "text-white bg-blue-600 hover:bg-blue-700"
                          : "text-slate-700 bg-white hover:bg-slate-100 border border-slate-200"
                      }`}
                    >
                      <span>{squad.role === "Leader" ? "Manage Team" : "View Team"}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              ))}

              {/* 2. Submitted Applications (Pending candidate applications) */}
              {!isCandidateView &&
                myApplications.map((app) => (
                  <div
                    key={app.id}
                    className="p-4 rounded-xl border border-amber-200 bg-amber-50/20 flex flex-col justify-between gap-3"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 flex items-center gap-1">
                            <Clock className="w-3 h-3 text-amber-600" /> Application Pending
                          </span>
                          <span className="text-[11px] font-medium text-slate-400">• {app.eventTitle}</span>
                        </div>
                        <h3 className="text-base font-bold text-slate-900 font-heading">
                          {app.teamName}
                        </h3>
                        {app.message && (
                          <p className="text-xs text-slate-600 mt-0.5 line-clamp-1 italic">
                            "{app.message}"
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-amber-200/60 text-xs">
                      <span className="text-amber-800 font-medium">Under review by squad leader</span>
                      <Link
                        to={`/team/${app.teamId}`}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl font-bold text-amber-900 bg-white hover:bg-amber-50 border border-amber-200 transition-colors shadow-2xs cursor-pointer"
                      >
                        <span>View Squad</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>
                ))}

              {userTeams.length === 0 && myApplications.length === 0 && (
                <div className="p-6 rounded-xl border border-dashed border-slate-200 text-center space-y-2">
                  <Users className="w-8 h-8 text-slate-300 mx-auto" />
                  <p className="text-xs font-semibold text-slate-600">No active squads or pending applications</p>
                  <p className="text-[11px] text-slate-400">Join an existing squad for an upcoming hackathon or recruit teammates.</p>
                  <Link
                    to="/teams"
                    className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:underline pt-1"
                  >
                    Find Squads to Join →
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* Section 2: Verified Skills */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-slate-900 font-heading uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-blue-600" /> Verified Skills & Taxonomy
              </h3>
              <span className="text-xs text-slate-400">
                {skillsList.length} Competencies
              </span>
            </div>

            {skillsList.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {skillsList.map((skill: string, i: number) => (
                  <SkillTag key={i} skill={skill} isMatched={true} />
                ))}
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 text-center space-y-1">
                <p className="text-xs text-slate-600 font-medium">No verified skills detected yet</p>
                <p className="text-[11px] text-slate-400">Upload your PDF resume to generate automated skill taxonomy alignments.</p>
              </div>
            )}
          </div>

          {/* Section 3: Experience */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-5">
            <h3 className="text-sm font-black text-slate-900 font-heading uppercase tracking-wider flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-slate-600" /> Experience
            </h3>

            {experienceList.length > 0 ? (
              <div className="space-y-5">
                {experienceList.map((exp: any, i: number) => (
                  <div key={i} className="space-y-1.5 pb-4 border-b border-slate-100 last:border-0 last:pb-0">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <h4 className="text-sm font-bold text-slate-900">
                        {exp.role} <span className="text-blue-600 font-semibold">@ {exp.company}</span>
                      </h4>
                      <span className="text-xs text-slate-400 font-medium">{exp.duration}</span>
                    </div>
                    <ul className="space-y-1 text-xs text-slate-600 list-disc list-inside">
                      {exp.bullet_points?.map((bp: string, j: number) => (
                        <li key={j} className="leading-relaxed">
                          {bp}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic">No formal engineering experience listed yet.</p>
            )}
          </div>

          {/* Section 4: Projects */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-5">
            <h3 className="text-sm font-black text-slate-900 font-heading uppercase tracking-wider flex items-center gap-2">
              <Layers className="w-4 h-4 text-slate-600" /> Technical Projects
            </h3>

            {projectsList.length > 0 ? (
              <div className="space-y-5">
                {projectsList.map((proj: any, i: number) => (
                  <div key={i} className="space-y-1.5 pb-4 border-b border-slate-100 last:border-0 last:pb-0">
                    <h4 className="text-sm font-bold text-slate-900">{proj.name}</h4>
                    <p className="text-xs text-slate-600">{proj.description}</p>
                    <ul className="space-y-1 text-xs text-slate-600 list-disc list-inside">
                      {proj.bullet_points?.map((bp: string, j: number) => (
                        <li key={j} className="leading-relaxed">
                          {bp}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic">No public technical projects listed yet.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
