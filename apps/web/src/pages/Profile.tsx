import { useJobContext } from "../contexts/JobContext";
import { useUser, Show } from "@clerk/react";
import { Link } from "react-router-dom";

export function Profile() {
  const { jobId, isUploading, status, profileData } = useJobContext();
  const { user } = useUser();

  if (!user) return null;

  return (
    <div className="max-w-5xl mx-auto px-8 py-12 relative min-h-[60vh]">
      <Show when="signed-out">
        <div className="text-center">Please sign in to view your profile.</div>
      </Show>

      <Show when="signed-in">
        {!jobId && !profileData ? (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 text-center flex flex-col items-center justify-center min-h-[40vh]">
            <h2 className="text-2xl font-semibold mb-2">No Profile Found</h2>
            <p className="text-slate-500 mb-6">Upload a resume to automatically generate your professional AI profile.</p>
            <Link to="/" className="bg-slate-900 text-white px-6 py-2 rounded-md font-medium hover:bg-slate-800 transition-colors shadow-sm">
              Go to Upload
            </Link>
          </div>
        ) : null}

        {jobId && isUploading ? (
          <div className="bg-white p-12 rounded-xl shadow-sm border border-slate-200 text-center flex flex-col items-center justify-center min-h-[40vh]">
            <div className="w-16 h-16 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin mx-auto mb-6"></div>
            <h3 className="text-xl font-bold text-slate-800 mb-2">Creating Profile...</h3>
            <p className="text-sm text-slate-500 max-w-md">{status}</p>
          </div>
        ) : null}

        {!isUploading && profileData ? (
          <section className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mb-12">
            <div className="bg-slate-900 px-8 py-12 text-white text-center">
              <div className="w-24 h-24 bg-white/20 rounded-full mx-auto mb-4 flex items-center justify-center text-3xl shadow-inner">
                {user.imageUrl ? (
                  <img src={user.imageUrl} alt="Avatar" className="w-full h-full rounded-full object-cover" />
                ) : (
                  "👨‍💻"
                )}
              </div>
              <h1 className="text-3xl font-bold">{user.fullName || profileData.name || "Software Engineer"}</h1>
              {profileData.title && <h2 className="text-xl text-blue-300 mt-2 font-medium">{profileData.title}</h2>}
              {profileData.summary && <p className="text-slate-300 mt-4 max-w-2xl mx-auto">{profileData.summary}</p>}
            </div>

            <div className="p-8 grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="col-span-1 space-y-8">
                {profileData.skills && profileData.skills.length > 0 && (
                  <div>
                    <h3 className="text-lg font-bold border-b border-slate-200 pb-2 mb-4 text-slate-800">Skills</h3>
                    <div className="flex flex-wrap gap-2">
                      {profileData.skills.map((skill: string, i: number) => (
                        <span key={i} className="bg-blue-50 text-blue-700 text-sm font-medium px-3 py-1 rounded-full border border-blue-200">
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                
                {profileData.education && profileData.education.length > 0 && (
                  <div>
                    <h3 className="text-lg font-bold border-b border-slate-200 pb-2 mb-4 text-slate-800">Education</h3>
                    <div className="space-y-4">
                      {profileData.education.map((edu, i: number) => (
                        <div key={i}>
                          <h4 className="font-semibold text-slate-900">{edu.college}</h4>
                          <p className="text-sm text-slate-600">{edu.degree}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="col-span-2 space-y-8">
                {profileData.experience && profileData.experience.length > 0 && (
                  <div>
                    <h3 className="text-lg font-bold border-b border-slate-200 pb-2 mb-4 text-slate-800">Experience</h3>
                    <div className="space-y-6">
                      {profileData.experience.map((exp, i: number) => (
                        <div key={i}>
                          <h4 className="font-semibold text-slate-900">{exp.role} @ {exp.company}</h4>
                          <p className="text-sm text-slate-500 mb-2">{exp.duration}</p>
                          <ul className="list-disc list-inside text-sm text-slate-600 space-y-1">
                            {exp.bullet_points?.map((bp: string, j: number) => (
                              <li key={j}>{bp}</li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {profileData.projects && profileData.projects.length > 0 && (
                  <div>
                    <h3 className="text-lg font-bold border-b border-slate-200 pb-2 mb-4 text-slate-800">Projects</h3>
                    <div className="space-y-6">
                      {profileData.projects.map((proj, i: number) => (
                        <div key={i}>
                          <h4 className="font-semibold text-slate-900">{proj.name}</h4>
                          <p className="text-sm text-slate-600 mb-2">{proj.description}</p>
                          <ul className="list-disc list-inside text-sm text-slate-600 space-y-1">
                            {proj.bullet_points?.map((bp: string, j: number) => (
                              <li key={j}>{bp}</li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </section>
        ) : null}
      </Show>
    </div>
  );
}
