export interface TeamRoleDTO {
  id?: string;
  teamId?: string;
  title: string;
  skills: string[];
  spots?: number;
  assignedToId?: string | null;
  requirementNodeIds?: string[];
}

export interface BestMatchingRoleDTO {
  roleId?: string;
  roleTitle: string;
  score: number;
  fulfilledCount: number;
  totalCount: number;
  skills: string[];
}

export interface CreateTeamRequest {
  eventId: string;
  name: string;
  description?: string;
  roles?: TeamRoleDTO[];
  leaderRoleIndex?: number;
  requirements?: string[];
  invites?: string[]; // Array of emails
  roleInvites?: RoleInvitePayload[];
  orgId?: string;
}

export interface UpdateTeamRequest {
  name?: string;
  description?: string;
  roles?: TeamRoleDTO[];
  requirements?: string[];
  university?: string;
}

export interface RoleInvitePayload {
  email: string;
  roleId?: string;
  roleTitle?: string;
  roleSkills?: string[];
}

export interface TeamInviteResponse {
  id: string;
  teamId: string;
  teamName?: string;
  eventId?: string;
  eventTitle?: string;
  isGlobal?: boolean;
  senderId: string;
  senderName?: string;
  email: string;
  roleId?: string | null;
  roleTitle?: string | null;
  roleSkills?: string[];
  membersCount?: number;
  requirements?: string[];
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
  avatarUrl?: string | null;
  imageUrl?: string | null;
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
  invites: Array<string | RoleInvitePayload>;
  roleId?: string;
  roleTitle?: string;
  roleSkills?: string[];
}

export interface SendTeamInvitesResponse {
  message: string;
  successful?: string[];
  failed?: Array<{ email: string; reason: string }>;
  invitedEmails?: string[];
}

export interface TeamDetailResponse {
  id: string;
  name: string;
  description?: string;
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
  roles?: TeamRoleDTO[];
  bestMatchingRole?: BestMatchingRoleDTO | null;
  university?: string | null;
  members: TeamMemberDTO[];
  invites?: TeamInviteResponse[];
  applications?: TeamApplicationDTO[];
  isLeader?: boolean;
  isMember?: boolean;
  hasApplied?: boolean;
  maxCapacity?: number;
  taxonomyScore?: number;
  category?: "BEST" | "GOOD_DIFFERENT_UNIVERSITY" | "SAME_UNIVERSITY_LOWER_SCORE" | null;
  requirementBreakdown?: Array<{
    requirementNodeId?: string;
    requirementName: string;
    bestUserSkillName?: string | null;
    score: number;
    explanationText?: string;
    isStrong?: boolean;
  }>;
  neededRequirement?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TeamQueryFilters {
  page?: number;
  limit?: number;
  eventId?: string;
  search?: string;
  myTeams?: boolean;
  campus?: string;
  openSpotsOnly?: boolean;
  tier?: "BEST" | "CROSS_CAMPUS" | "CAMPUS_EXPLORER" | "ALL";
  sort?: "fit_desc" | "fit_asc" | "spots_desc" | "name_asc" | "created_at";
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


