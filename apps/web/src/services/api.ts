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
   TYPE DEFINITIONS (Imported & Re-exported from @squadup/shared)
   ========================================================================= */

import type {
  PaginatedResponse,
  EventItem,
  EventDetailResponse,
  CreateEventRequest,
  UpdateEventRequest,
  TeamRoleDTO as TeamRoleItem,
  BestMatchingRoleDTO as BestMatchingRoleItem,
  TeamMemberDTO as TeamMember,
  TeamDetailResponse as TeamItem,
  UserProfileResponse,
  EducationItem,
  ExperienceItem,
  AchievementItem,
  ProjectItem,
  RecommendationItem,
  RecommendationsResponse,
  IncomingApplicationResponse as IncomingApplicationItem,
  MyApplicationResponse as CandidateApplicationItem,
  TeamInviteResponse as TeamInviteItem,
  RoleInvitePayload,
  SendTeamInvitesRequest as SendTeamInvitesPayload,
  NotificationDTO,
  NotificationType,
  NotificationListResponse,
  OrganizationResponse as OrganizationItem,
  OrganizerResponse as OrganizerItem,
  UserPreferences,
  BannerConfig,
  UpdateUserPreferencesRequest,
} from "@squadup/shared";

export type {
  PaginatedResponse,
  EventItem,
  EventDetailResponse,
  CreateEventRequest,
  UpdateEventRequest,
  TeamRoleItem,
  BestMatchingRoleItem,
  TeamMember,
  TeamItem,
  UserProfileResponse,
  EducationItem,
  ExperienceItem,
  AchievementItem,
  ProjectItem,
  RecommendationItem,
  RecommendationsResponse,
  IncomingApplicationItem,
  CandidateApplicationItem,
  TeamInviteItem,
  RoleInvitePayload,
  SendTeamInvitesPayload,
  NotificationDTO,
  NotificationType,
  NotificationListResponse,
  OrganizationItem,
  OrganizerItem,
  UserPreferences,
  BannerConfig,
  UpdateUserPreferencesRequest,
};

export interface RecommendationBreakdownItem {
  requirementNodeId: string;
  requirementName: string;
  bestUserSkillName: string;
  score: number;
  explanationText: string;
  isStrong: boolean;
}

import { CacheService } from "./cache.service";

/* =========================================================================
   EVENTS API (/api/events)
   ========================================================================= */

export const eventsApi = {
  getEvents: (params?: {
    page?: number;
    limit?: number;
    search?: string;
    scope?: "all" | "global" | "org" | "my_university";
    sort?: "popularity" | "popular" | "date_asc" | "date_desc" | "created_at";
    campus?: string;
  }): Promise<PaginatedResponse<EventItem>> => {
    const query = new URLSearchParams();
    if (params?.page) query.set("page", params.page.toString());
    if (params?.limit) query.set("limit", params.limit.toString());
    if (params?.search) query.set("search", params.search);
    if (params?.scope) query.set("scope", params.scope);
    if (params?.sort) query.set("sort", params.sort);
    if (params?.campus) query.set("campus", params.campus);
    const queryString = query.toString();
    return request<PaginatedResponse<EventItem>>(`/events${queryString ? `?${queryString}` : ""}`);
  },

  getPopularEvents: async (options?: { bypassCache?: boolean; onBackgroundUpdate?: (events: EventItem[]) => void }): Promise<EventItem[]> => {
    const cacheKey = "sq:events:popular";
    return CacheService.fetchWithSWR<EventItem[]>(
      cacheKey,
      async () => {
        const res = await request<PaginatedResponse<EventItem>>("/events?limit=6&sort=popularity");
        return res.data || [];
      },
      {
        ttlMs: 1000 * 60 * 10, // 10 minutes TTL
        storage: "local",
        bypassCache: options?.bypassCache,
        onBackgroundUpdate: options?.onBackgroundUpdate,
      }
    );
  },

  getEvent: (id: string): Promise<EventItem> => {
    return request<EventItem>(`/events/${id}`);
  },

  getEventTeams: (id: string): Promise<{ event: EventItem; teams: TeamItem[] }> => {
    return request<{ event: EventItem; teams: TeamItem[] }>(`/events/${id}/teams`);
  },

  createEvent: async (data: {
    title: string;
    description: string;
    date: string;
    location: string;
    isGlobal: boolean;
    organizerProfileId?: string;
  }): Promise<EventItem> => {
    const res = await request<EventItem>("/events", {
      method: "POST",
      body: JSON.stringify(data),
    });
    CacheService.invalidatePrefix("sq:events:");
    CacheService.invalidatePrefix("sq:teams:");
    return res;
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
    campus?: string;
    openSpotsOnly?: boolean;
    tier?: string;
    sort?: "fit_desc" | "fit_asc" | "spots_desc" | "name_asc" | "created_at" | "name";
  }): Promise<PaginatedResponse<TeamItem>> => {
    const query = new URLSearchParams();
    if (params?.page) query.set("page", params.page.toString());
    if (params?.limit) query.set("limit", params.limit.toString());
    if (params?.eventId) query.set("eventId", params.eventId);
    if (params?.myTeams) query.set("myTeams", params.myTeams);
    if (params?.search) query.set("search", params.search);
    if (params?.campus && params.campus !== "ALL") query.set("campus", params.campus);
    if (params?.openSpotsOnly) query.set("openSpotsOnly", "true");
    if (params?.tier && params.tier !== "ALL") query.set("tier", params.tier);
    if (params?.sort) query.set("sort", params.sort);
    const queryString = query.toString();
    return request<PaginatedResponse<TeamItem>>(`/teams${queryString ? `?${queryString}` : ""}`);
  },

  getTeam: (id: string): Promise<TeamItem> => {
    return request<TeamItem>(`/teams/${id}`);
  },

  createTeam: async (data: {
    eventId: string;
    name: string;
    description?: string;
    roles?: TeamRoleItem[];
    leaderRoleIndex?: number;
    requirements?: string[];
    invites?: string[];
    roleInvites?: Array<{ email: string; roleId?: string; roleTitle?: string; roleSkills?: string[] }>;
  }): Promise<{ message: string; teamId: string; team?: TeamItem; requirementNodeIds?: string[] }> => {
    const res = await request<{ message: string; teamId: string; team?: TeamItem; requirementNodeIds?: string[] }>("/teams", {
      method: "POST",
      body: JSON.stringify(data),
    });
    CacheService.invalidatePrefix("sq:teams:");
    CacheService.invalidatePrefix("sq:recs:");
    CacheService.invalidatePrefix("sq:events:");
    CacheService.invalidatePrefix("sq:profile:");
    CacheService.invalidatePrefix("sq:public_profile:");
    return res;
  },

  updateTeam: async (
    id: string,
    data: { name?: string; requirements?: string[]; university?: string }
  ): Promise<TeamItem> => {
    const res = await request<TeamItem>(`/teams/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
    CacheService.invalidatePrefix("sq:teams:");
    CacheService.invalidatePrefix("sq:recs:");
    CacheService.invalidatePrefix("sq:profile:");
    CacheService.invalidatePrefix("sq:public_profile:");
    return res;
  },

  deleteTeam: async (id: string): Promise<{ message: string }> => {
    const res = await request<{ message: string }>(`/teams/${id}`, {
      method: "DELETE",
    });
    CacheService.invalidatePrefix("sq:teams:");
    CacheService.invalidatePrefix("sq:recs:");
    CacheService.invalidatePrefix("sq:profile:");
    CacheService.invalidatePrefix("sq:public_profile:");
    return res;
  },

  leaveTeam: async (id: string): Promise<{ message: string }> => {
    const res = await request<{ message: string }>(`/teams/${id}/leave`, {
      method: "DELETE",
    });
    CacheService.invalidatePrefix("sq:teams:");
    CacheService.invalidatePrefix("sq:recs:");
    CacheService.invalidatePrefix("sq:profile:");
    CacheService.invalidatePrefix("sq:public_profile:");
    return res;
  },

  removeMember: async (teamId: string, userId: string): Promise<{ message: string }> => {
    const res = await request<{ message: string }>(`/teams/${teamId}/members/${userId}`, {
      method: "DELETE",
    });
    CacheService.invalidatePrefix("sq:teams:");
    CacheService.invalidatePrefix("sq:recs:");
    CacheService.invalidatePrefix("sq:profile:");
    CacheService.invalidatePrefix("sq:public_profile:");
    return res;
  },

  cancelInvite: async (teamId: string, inviteId: string): Promise<{ message: string }> => {
    return request<{ message: string }>(`/teams/${teamId}/invites/${inviteId}`, {
      method: "DELETE",
    });
  },
};

/* =========================================================================
   AI RECOMMENDATIONS API (/api/teams/recommendations)
   ========================================================================= */

export const recommendationsApi = {
  getRecommendations: async (params?: {
    eventId?: string;
    sameUniversityOnly?: boolean;
    topK?: number;
    bypassCache?: boolean;
    userId?: string;
    onBackgroundUpdate?: (recs: RecommendationsResponse) => void;
  }): Promise<RecommendationsResponse> => {
    // Only cache generic topK recommendations per user
    const isGenericTopRecommendations = !params?.eventId && !params?.sameUniversityOnly;
    const userScope = params?.userId || "active_user";
    const cacheKey = `sq:recs:${userScope}`;

    if (isGenericTopRecommendations) {
      return CacheService.fetchWithSWR<RecommendationsResponse>(
        cacheKey,
        () =>
          request<RecommendationsResponse>("/teams/recommendations", {
            method: "POST",
            body: JSON.stringify({ topK: params?.topK || 50 }),
          }),
        {
          ttlMs: 1000 * 60 * 15, // 15 minutes TTL
          storage: "session",
          bypassCache: params?.bypassCache,
          onBackgroundUpdate: params?.onBackgroundUpdate,
        }
      );
    }

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
  applyToTeam: async (
    teamId: string,
    message?: string,
    roleTitle?: string,
    roleId?: string
  ): Promise<{ message: string; applicationId: string; status: string }> => {
    const res = await request<{ message: string; applicationId: string; status: string }>(`/teams/${teamId}/apply`, {
      method: "POST",
      body: JSON.stringify({
        message: message || "I'd love to join your squad!",
        roleTitle: roleTitle?.trim() || undefined,
        roleId: roleId || undefined,
      }),
    });
    CacheService.invalidatePrefix("sq:teams:");
    CacheService.invalidatePrefix("sq:recs:");
    return res;
  },

  withdrawApplication: async (teamId: string): Promise<{ message: string }> => {
    const res = await request<{ message: string }>(`/teams/${teamId}/apply`, {
      method: "DELETE",
    });
    CacheService.invalidatePrefix("sq:teams:");
    return res;
  },

  withdrawApplicationById: async (applicationId: string): Promise<{ message: string }> => {
    const res = await request<{ message: string }>(`/applications/${applicationId}`, {
      method: "DELETE",
    });
    CacheService.invalidatePrefix("sq:teams:");
    return res;
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

  acceptApplication: async (applicationId: string): Promise<{ message: string }> => {
    const res = await request<{ message: string }>(`/applications/${applicationId}/accept`, {
      method: "POST",
    });
    CacheService.invalidatePrefix("sq:teams:");
    CacheService.invalidatePrefix("sq:recs:");
    CacheService.invalidatePrefix("sq:profile:");
    CacheService.invalidatePrefix("sq:public_profile:");
    return res;
  },

  rejectApplication: async (applicationId: string): Promise<{ message: string }> => {
    const res = await request<{ message: string }>(`/applications/${applicationId}/reject`, {
      method: "POST",
    });
    CacheService.invalidatePrefix("sq:teams:");
    return res;
  },
};

/* =========================================================================
   PROFILE API (/api/profile)
   ========================================================================= */

export const profileApi = {
  getProfile: async (options?: {
    userId?: string;
    bypassCache?: boolean;
    onBackgroundUpdate?: (prof: UserProfileResponse) => void;
  }): Promise<UserProfileResponse> => {
    const userScope = options?.userId || "active_user";
    const cacheKey = `sq:profile:${userScope}`;

    if (options?.bypassCache) {
      CacheService.invalidate(cacheKey);
      CacheService.invalidatePrefix("sq:profile:");
    }

    const endpoint = options?.bypassCache ? "/profile?bypassCache=true" : "/profile";

    return CacheService.fetchWithSWR<UserProfileResponse>(
      cacheKey,
      () => request<UserProfileResponse>(endpoint),
      {
        ttlMs: 1000 * 60 * 30, // 30 minutes TTL
        storage: "local",
        bypassCache: options?.bypassCache,
        onBackgroundUpdate: options?.onBackgroundUpdate,
      }
    );
  },

  updateProfile: async (data: Partial<UserProfileResponse>, userId?: string): Promise<{ message: string; profile: UserProfileResponse }> => {
    const res = await request<{ message: string; profile: UserProfileResponse }>("/profile", {
      method: "PATCH",
      body: JSON.stringify(data),
    });

    if (res.profile) {
      // Invalidate all related profile & recommendation caches
      CacheService.invalidatePrefix("sq:profile:");
      CacheService.invalidatePrefix("sq:public_profile:");
      CacheService.invalidatePrefix("sq:recs:");
      CacheService.invalidatePrefix("sq:teams:");

      // Store fresh profile across all relevant keys
      if (res.profile.clerkId) {
        CacheService.set(`sq:profile:${res.profile.clerkId}`, res.profile, 1000 * 60 * 30, "local");
      }
      if (res.profile.userId) {
        CacheService.set(`sq:profile:${res.profile.userId}`, res.profile, 1000 * 60 * 30, "local");
      }
      if (userId) {
        CacheService.set(`sq:profile:${userId}`, res.profile, 1000 * 60 * 30, "local");
      }
      CacheService.set(`sq:profile:active_user`, res.profile, 1000 * 60 * 30, "local");
    }

    return res;
  },

  getPublicProfile: async (userId: string): Promise<UserProfileResponse> => {
    const cacheKey = `sq:public_profile:${userId}`;
    return CacheService.fetchWithSWR<UserProfileResponse>(
      cacheKey,
      () => request<UserProfileResponse>(`/profile/${userId}`),
      {
        ttlMs: 1000 * 60 * 5, // 5 minutes TTL
        storage: "session",
      }
    );
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
   INVITES & NOTIFICATIONS API (/api/teams/invites & /api/notifications)
   ========================================================================= */

export const invitesApi = {
  getMyInvites: (): Promise<{ totalInvites: number; invites: TeamInviteItem[] }> => {
    return request<{ totalInvites: number; invites: TeamInviteItem[] }>("/teams/invites/my-invites");
  },

  getInviteById: (inviteId: string): Promise<TeamInviteItem> => {
    return request<TeamInviteItem>(`/teams/invites/${inviteId}`);
  },

  acceptInvite: async (inviteId: string): Promise<{ message: string; teamId?: string }> => {
    const res = await request<{ message: string; teamId?: string }>(`/teams/invites/${inviteId}/accept`, {
      method: "POST",
    });
    CacheService.invalidatePrefix("sq:teams:");
    CacheService.invalidatePrefix("sq:recs:");
    CacheService.invalidatePrefix("sq:profile:");
    CacheService.invalidatePrefix("sq:public_profile:");
    return res;
  },

  declineInvite: (inviteId: string): Promise<{ message: string }> => {
    return request<{ message: string }>(`/teams/invites/${inviteId}/decline`, {
      method: "POST",
    });
  },

  sendInvites: (
    teamId: string,
    payload: string[] | SendTeamInvitesPayload
  ): Promise<{ message: string; successful?: string[]; failed?: Array<{ email: string; reason: string }>; invitedEmails?: string[] }> => {
    const body = Array.isArray(payload) ? { invites: payload } : payload;
    return request<{ message: string; successful?: string[]; failed?: Array<{ email: string; reason: string }>; invitedEmails?: string[] }>(`/teams/${teamId}/invites`, {
      method: "POST",
      body: JSON.stringify(body),
    });
  },

  cancelInvite: (teamId: string, inviteId: string): Promise<{ message: string }> => {
    return request<{ message: string }>(`/teams/${teamId}/invites/${inviteId}`, {
      method: "DELETE",
    });
  },
};

export const notificationsApi = {
  getNotifications: (params?: {
    page?: number;
    limit?: number;
    unreadOnly?: boolean;
  }): Promise<NotificationListResponse> => {
    const query = new URLSearchParams();
    if (params?.page) query.set("page", params.page.toString());
    if (params?.limit) query.set("limit", params.limit.toString());
    if (params?.unreadOnly) query.set("unreadOnly", "true");
    const qs = query.toString();
    return request<NotificationListResponse>(`/notifications${qs ? `?${qs}` : ""}`);
  },

  markAsRead: (notificationId: string): Promise<{ message: string }> => {
    return request<{ message: string }>(`/notifications/${notificationId}/read`, {
      method: "PATCH",
    });
  },

  markAllAsRead: (): Promise<{ message: string; count: number }> => {
    return request<{ message: string; count: number }>("/notifications/read-all", {
      method: "POST",
    });
  },

  getStreamUrl: (): string => {
    return `${API_BASE_URL}/notifications/stream`;
  },
};

/* =========================================================================
   ORGANIZERS API (/api/organizers)
   ========================================================================= */

export const organizersApi = {
  getUniversities: (): Promise<OrganizationItem[]> => {
    return request<OrganizationItem[]>("/organizers/universities");
  },

  getUniversity: (clerkOrgId: string): Promise<OrganizationItem> => {
    return request<OrganizationItem>(`/organizers/universities/${clerkOrgId}`);
  },

  selectUniversity: (clerkOrgId: string): Promise<{ success: boolean; organization: OrganizationItem; profile: UserProfileResponse }> => {
    return request<{ success: boolean; organization: OrganizationItem; profile: UserProfileResponse }>("/organizers/universities/select", {
      method: "POST",
      body: JSON.stringify({ clerkOrgId }),
    });
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
