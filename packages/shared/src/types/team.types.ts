export interface CreateTeamRequest {
  eventId: string;
  name: string;
  requirements?: string[];
  invites?: string[]; // Array of emails
  orgId?: string;
}

export interface UpdateTeamRequest {
  name?: string;
  requirements?: string[];
  university?: string;
}

export interface TeamInviteResponse {
  id: string;
  teamId: string;
  senderId: string;
  email: string;
  status: string;
  createdAt: string;
}

export interface TeamMemberDTO {
  id: string;
  userId: string;
  role: string | null;
  joinedAt: string;
  name: string;
  email: string;
  university?: string | null;
  skills?: string[];
  title?: string | null;
}

export interface TeamApplicationDTO {
  id: string;
  teamId: string;
  userId: string;
  message?: string | null;
  status: string; // PENDING, ACCEPTED, REJECTED, WITHDRAWN
  createdAt: string;
  applicant?: {
    id: string;
    name: string;
    email: string;
    university?: string | null;
    skills?: string[];
    title?: string | null;
    taxonomyNodeIds?: string[];
  };
}

export interface CreateApplicationRequest {
  message?: string;
}

export interface SendTeamInvitesRequest {
  invites: string[];
}

export interface TeamDetailResponse {
  id: string;
  name: string;
  eventId: string;
  event?: {
    id: string;
    title: string;
    date: string;
    isGlobal: boolean;
    location?: string | null;
    university?: string | null;
  };
  orgId?: string | null;
  requirements: string[];
  requirementNodeIds?: string[];
  university?: string | null;
  members: TeamMemberDTO[];
  invites?: TeamInviteResponse[];
  applications?: TeamApplicationDTO[];
  isLeader?: boolean;
  isMember?: boolean;
  hasApplied?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TeamQueryFilters {
  page?: number;
  limit?: number;
  eventId?: string;
  search?: string;
  myTeams?: boolean;
  sort?: "created_at" | "name";
}

export interface MyApplicationResponse {
  id: string;
  teamId: string;
  teamName: string;
  eventId: string;
  eventTitle: string;
  university?: string | null;
  requirements: string[];
  message?: string | null;
  status: string; // PENDING, ACCEPTED, REJECTED, WITHDRAWN
  createdAt: string;
  updatedAt: string;
}

export interface IncomingApplicationSkill {
  name: string;
  provenance: string;
  score: number;
}

export interface IncomingApplicationResponse {
  id: string;
  candidateId: string;
  name: string;
  avatarUrl?: string | null;
  university: string;
  year?: string | null;
  appliedRole: string;
  matchScore: number; // 0.0 to 1.0
  isCampusMatch: boolean;
  appliedTimeAgo: string;
  coverNote: string;
  skills: IncomingApplicationSkill[];
  status: "PENDING" | "ACCEPTED" | "REJECTED" | "WITHDRAWN";
  teamId: string;
  teamName: string;
  createdAt: string;
}


