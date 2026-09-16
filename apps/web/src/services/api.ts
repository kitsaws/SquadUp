/**
 * SquadUp API Service
 * Central integration layer connecting frontend to backend endpoints (http://localhost:3000/api)
 * Documentation reference: docs/endpoints.md
 */

export const API_BASE_URL = import.meta.env.VITE_API_URL || "/api";

let customTokenGetter: (() => Promise<string | null>) | null = null;

export function setAuthTokenGetter(getter: () => Promise<string | null>) {
  customTokenGetter = getter;
}

export async function getAuthToken(): Promise<string | null> {
  if (customTokenGetter) {
    try {
      const token = await customTokenGetter();
      if (token) return token;
    } catch {
      // fallback to window.Clerk
    }
  }
  if (typeof window !== "undefined" && (window as any).Clerk?.session) {
    try {
      return await (window as any).Clerk.session.getToken();
    } catch (e) {
      console.warn("[API] Could not retrieve Clerk JWT token:", e);
      return null;
    }
  }
  return null;
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE_URL}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`;
  const token = await getAuthToken();

  const headers: Record<string, string> = {
    ...((options.headers as Record<string, string>) || {}),
  };

  if (!(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorMessage = `Request failed with status ${response.status}`;
    try {
      const errorJson = await response.json();
      if (errorJson.error) errorMessage = errorJson.error;
      else if (errorJson.message) errorMessage = errorJson.message;
    } catch {
      // Non-JSON response
    }
    const err = new Error(errorMessage);
    (err as any).status = response.status;
    throw err;
  }

  return response.json();
}

/* =========================================================================
   TYPE DEFINITIONS
   ========================================================================= */

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface EventItem {
  id: string;
  title: string;
  description: string;
  date: string;
  location: string;
  isGlobal: boolean;
  orgId?: string | null;
  organizerId?: string;
  organizer?: {
    id: string;
    name: string;
    email: string;
  };
  organizerProfile?: {
    id: string;
    name: string;
    slug: string;
    logoUrl?: string | null;
  };
  teamsCount?: number;
  participantsCount?: number;
  tracks?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface TeamMember {
  id: string;
  userId: string;
  role: string;
  joinedAt: string;
  name: string;
  email: string;
  university?: string;
  skills?: string[];
  title?: string;
}

export interface TeamItem {
  id: string;
  name: string;
  eventId: string;
  event?: {
    id: string;
    title: string;
    date: string;
    isGlobal: boolean;
    location: string;
    university?: string;
  };
  requirements: string[];
  requirementNodeIds?: string[];
  university?: string;
  description?: string;
  members: TeamMember[];
  isLeader?: boolean;
  isMember?: boolean;
  hasApplied?: boolean;
  maxCapacity?: number;
  invites?: any[];
  applications?: any[];
  createdAt: string;
  updatedAt: string;
  // Augmented client fields
  taxonomyScore?: number;
  category?: "BEST" | "GOOD_DIFFERENT_UNIVERSITY" | "SAME_UNIVERSITY_LOWER_SCORE";
  neededRequirement?: string;
}

export interface UserProfileResponse {
  id: string;
  userId: string;
  clerkId: string;
  name: string;
  email: string;
  university?: string;
  title?: string;
  summary?: string;
  skills: string[];
  education?: Array<{ degree: string; college: string }>;
  experience?: Array<{
    role: string;
    company: string;
    duration: string;
    bullet_points?: string[];
    technologies?: string[];
  }>;
  projects?: Array<{
    name: string;
    description: string;
    bullet_points?: string[];
    technologies?: string[];
  }>;
  githubUrl?: string | null;
  linkedinUrl?: string | null;
  resumePdfUrl?: string;
  lastResumeUploadedAt?: string | null;
  taxonomyNodeIds?: string[];
  teams?: Array<{
    teamId: string;
    teamName: string;
    eventId: string;
    role: string;
    joinedAt: string;
  }>;
  bannerConfig?: BannerConfig | null;
}

export interface RecommendationBreakdownItem {
  requirementNodeId: string;
  requirementName: string;
  bestUserSkillName: string;
  score: number;
  explanationText: string;
  isStrong: boolean;
}

export interface RecommendationItem {
  rank: number;
  teamId: string;
  teamName: string;
  university: string;
  description: string;
  requirements: string[];
  taxonomyScore: number;
  sameUniversity: boolean;
  isGlobal: boolean;
  isEligible: boolean;
  recommendationCategory: "BEST" | "GOOD_DIFFERENT_UNIVERSITY" | "SAME_UNIVERSITY_LOWER_SCORE";
  fulfilledRequirementsCount: number;
  totalRequirementsCount: number;
  requirementBreakdown?: RecommendationBreakdownItem[];
}

export interface RecommendationsResponse {
  recommendations: RecommendationItem[];
  totalEligibleCandidates: number;
  userUniversity?: string;
  userTaxonomyNodesCount?: number;
}

export interface IncomingApplicationItem {
  id: string;
  candidateId: string;
  name: string;
  avatarUrl?: string | null;
  university: string;
  year?: string;
  appliedRole: string;
  matchScore: number;
  isCampusMatch: boolean;
  appliedTimeAgo?: string;
  coverNote?: string;
  skills: Array<{ name: string; provenance: string; score: number }>;
  status: "PENDING" | "ACCEPTED" | "REJECTED";
  teamId: string;
  teamName: string;
  createdAt: string;
}

export interface CandidateApplicationItem {
  id: string;
  teamId: string;
  teamName: string;
  eventId: string;
  eventTitle: string;
  university: string;
  requirements: string[];
  message?: string;
  status: "PENDING" | "ACCEPTED" | "REJECTED";
  createdAt: string;
  updatedAt: string;
}

export interface TeamInviteItem {
  id: string;
  teamId: string;
  teamName: string;
  eventId: string;
  eventTitle: string;
  isGlobal: boolean;
  senderName: string;
  membersCount: number;
  requirements: string[];
  createdAt: string;
}

/* =========================================================================
   EVENTS API (/api/events)
   ========================================================================= */

export const eventsApi = {
  getEvents: (params?: {
    page?: number;
    limit?: number;
    search?: string;
    scope?: "all" | "global" | "org";
    sort?: "date_asc" | "date_desc" | "created_at";
  }): Promise<PaginatedResponse<EventItem>> => {
    const query = new URLSearchParams();
    if (params?.page) query.set("page", params.page.toString());
    if (params?.limit) query.set("limit", params.limit.toString());
    if (params?.search) query.set("search", params.search);
    if (params?.scope) query.set("scope", params.scope);
    if (params?.sort) query.set("sort", params.sort);
    const queryString = query.toString();
    return request<PaginatedResponse<EventItem>>(`/events${queryString ? `?${queryString}` : ""}`);
  },

  getEvent: (id: string): Promise<EventItem> => {
    return request<EventItem>(`/events/${id}`);
  },

  getEventTeams: (id: string): Promise<{ event: EventItem; teams: TeamItem[] }> => {
    return request<{ event: EventItem; teams: TeamItem[] }>(`/events/${id}/teams`);
  },

  createEvent: (data: {
    title: string;
    description: string;
    date: string;
    location: string;
    isGlobal: boolean;
    organizerProfileId?: string;
  }): Promise<EventItem> => {
    return request<EventItem>("/events", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },
};

/* =========================================================================
   TEAMS API (/api/teams)
   ========================================================================= */

export const teamsApi = {
  getTeams: (params?: {
    page?: number;
    limit?: number;
    eventId?: string;
    myTeams?: "true" | "false";
    search?: string;
    sort?: "created_at" | "name";
  }): Promise<PaginatedResponse<TeamItem>> => {
    const query = new URLSearchParams();
    if (params?.page) query.set("page", params.page.toString());
    if (params?.limit) query.set("limit", params.limit.toString());
    if (params?.eventId) query.set("eventId", params.eventId);
    if (params?.myTeams) query.set("myTeams", params.myTeams);
    if (params?.search) query.set("search", params.search);
    if (params?.sort) query.set("sort", params.sort);
    const queryString = query.toString();
    return request<PaginatedResponse<TeamItem>>(`/teams${queryString ? `?${queryString}` : ""}`);
  },

  getTeam: (id: string): Promise<TeamItem> => {
    return request<TeamItem>(`/teams/${id}`);
  },

  createTeam: (data: {
    eventId: string;
    name: string;
    requirements: string[];
    invites?: string[];
  }): Promise<{ message: string; teamId: string }> => {
    return request<{ message: string; teamId: string }>("/teams", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  updateTeam: (
    id: string,
    data: { name?: string; requirements?: string[]; university?: string }
  ): Promise<TeamItem> => {
    return request<TeamItem>(`/teams/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  },

  deleteTeam: (id: string): Promise<{ message: string }> => {
    return request<{ message: string }>(`/teams/${id}`, {
      method: "DELETE",
    });
  },

  leaveTeam: (id: string): Promise<{ message: string }> => {
    return request<{ message: string }>(`/teams/${id}/leave`, {
      method: "DELETE",
    });
  },

  removeMember: (teamId: string, userId: string): Promise<{ message: string }> => {
    return request<{ message: string }>(`/teams/${teamId}/members/${userId}`, {
      method: "DELETE",
    });
  },

  cancelInvite: (teamId: string, inviteId: string): Promise<{ message: string }> => {
    return request<{ message: string }>(`/teams/${teamId}/invites/${inviteId}`, {
      method: "DELETE",
    });
  },
};

/* =========================================================================
   AI RECOMMENDATIONS API (/api/teams/recommendations)
   ========================================================================= */

export const recommendationsApi = {
  getRecommendations: (params?: {
    eventId?: string;
    sameUniversityOnly?: boolean;
    topK?: number;
  }): Promise<RecommendationsResponse> => {
    return request<RecommendationsResponse>("/teams/recommendations", {
      method: "POST",
      body: JSON.stringify(params || {}),
    });
  },
};

/* =========================================================================
   APPLICATIONS API (/api/applications & /api/teams/:id/applications)
   ========================================================================= */

export const applicationsApi = {
  applyToTeam: (teamId: string, message?: string): Promise<{ message: string; applicationId: string; status: string }> => {
    return request<{ message: string; applicationId: string; status: string }>(`/teams/${teamId}/apply`, {
      method: "POST",
      body: JSON.stringify({ message: message || "I'd love to join your squad!" }),
    });
  },

  withdrawApplication: (teamId: string): Promise<{ message: string }> => {
    return request<{ message: string }>(`/teams/${teamId}/apply`, {
      method: "DELETE",
    });
  },

  withdrawApplicationById: (applicationId: string): Promise<{ message: string }> => {
    return request<{ message: string }>(`/applications/${applicationId}`, {
      method: "DELETE",
    });
  },

  getApplication: (applicationId: string): Promise<any> => {
    return request<any>(`/applications/${applicationId}`);
  },

  getMyApplications: (): Promise<{ total: number; applications: CandidateApplicationItem[] }> => {
    return request<{ total: number; applications: CandidateApplicationItem[] }>("/applications/my-applications");
  },

  getIncomingApplications: (params?: { teamId?: string; status?: string }): Promise<{ total: number; applications: IncomingApplicationItem[] }> => {
    const query = new URLSearchParams();
    if (params?.teamId) query.set("teamId", params.teamId);
    if (params?.status) query.set("status", params.status);
    const queryString = query.toString();
    return request<{ total: number; applications: IncomingApplicationItem[] }>(`/applications/incoming${queryString ? `?${queryString}` : ""}`);
  },

  getTeamApplications: (teamId: string): Promise<IncomingApplicationItem[] | { applications: IncomingApplicationItem[] }> => {
    return request<IncomingApplicationItem[] | { applications: IncomingApplicationItem[] }>(`/teams/${teamId}/applications`);
  },

  acceptApplication: (applicationId: string): Promise<{ message: string }> => {
    return request<{ message: string }>(`/applications/${applicationId}/accept`, {
      method: "POST",
    });
  },

  rejectApplication: (applicationId: string): Promise<{ message: string }> => {
    return request<{ message: string }>(`/applications/${applicationId}/reject`, {
      method: "POST",
    });
  },
};

/* =========================================================================
   PROFILE API (/api/profile)
   ========================================================================= */

export const profileApi = {
  getProfile: (): Promise<UserProfileResponse> => {
    return request<UserProfileResponse>("/profile");
  },

  updateProfile: (data: Partial<UserProfileResponse>): Promise<{ message: string; profile: UserProfileResponse }> => {
    return request<{ message: string; profile: UserProfileResponse }>("/profile", {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  },

  getPublicProfile: (userId: string): Promise<UserProfileResponse> => {
    return request<UserProfileResponse>(`/profile/${userId}`);
  },
};

/* =========================================================================
   RESUME API (/api/resume)
   ========================================================================= */

export const resumeApi = {
  uploadResume: (file: File): Promise<{ message: string; jobId: string }> => {
    const formData = new FormData();
    formData.append("file", file);
    return request<{ message: string; jobId: string }>("/resume/upload", {
      method: "POST",
      body: formData,
    });
  },

  getResumeStatus: (jobId: string): Promise<{
    jobId: string;
    state: string;
    result?: any;
    error?: string;
  }> => {
    return request<{
      jobId: string;
      state: string;
      result?: any;
      error?: string;
    }>(`/resume/status/${jobId}`);
  },

  getResumePdfUrl: (targetUserId?: string): string => {
    return targetUserId ? `${API_BASE_URL}/resume/view/${targetUserId}` : `${API_BASE_URL}/resume/view`;
  },
};

/* =========================================================================
   INVITES API (/api/teams/invites)
   ========================================================================= */

export const invitesApi = {
  getMyInvites: (): Promise<{ totalInvites: number; invites: TeamInviteItem[] }> => {
    return request<{ totalInvites: number; invites: TeamInviteItem[] }>("/teams/invites/my-invites");
  },

  acceptInvite: (inviteId: string): Promise<{ message: string }> => {
    return request<{ message: string }>(`/teams/invites/${inviteId}/accept`, {
      method: "POST",
    });
  },

  declineInvite: (inviteId: string): Promise<{ message: string }> => {
    return request<{ message: string }>(`/teams/invites/${inviteId}/decline`, {
      method: "POST",
    });
  },

  sendInvites: (teamId: string, emails: string[]): Promise<{ message: string }> => {
    return request<{ message: string }>(`/teams/${teamId}/invites`, {
      method: "POST",
      body: JSON.stringify({ invites: emails }),
    });
  },
};

/* =========================================================================
   ORGANIZERS API (/api/organizers)
   ========================================================================= */

export const organizersApi = {
  getUniversities: (): Promise<any[]> => {
    return request<any[]>("/organizers/universities");
  },

  getUniversity: (clerkOrgId: string): Promise<any> => {
    return request<any>(`/organizers/universities/${clerkOrgId}`);
  },

  getOrganizers: (params?: { orgId?: string; search?: string }): Promise<any[]> => {
    const query = new URLSearchParams();
    if (params?.orgId) query.set("orgId", params.orgId);
    if (params?.search) query.set("search", params.search);
    const queryString = query.toString();
    return request<any[]>(`/organizers${queryString ? `?${queryString}` : ""}`);
  },

  getOrganizer: (id: string): Promise<any> => {
    return request<any>(`/organizers/${id}`);
  },
};

/* =========================================================================
   USER PREFERENCES API (/api/preferences)
   ========================================================================= */

import type {
  UserPreferences,
  BannerConfig,
  UpdateUserPreferencesRequest,
} from "@squadup/shared";

export type { UserPreferences, BannerConfig, UpdateUserPreferencesRequest };

export const preferencesApi = {
  getPreferences: (): Promise<UserPreferences> => {
    return request<UserPreferences>("/preferences");
  },

  updatePreferences: (data: UpdateUserPreferencesRequest): Promise<UserPreferences> => {
    return request<UserPreferences>("/preferences", {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  },
};
