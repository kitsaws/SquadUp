export interface CreateOrganizerRequest {
  name: string;
  slug: string;
  description?: string;
  logoUrl?: string;
  website?: string;
  email?: string;
  orgId?: string; // Clerk Organization ID of University
  organizationId?: string;
}

export interface UpdateOrganizerRequest {
  name?: string;
  description?: string;
  logoUrl?: string;
  website?: string;
  email?: string;
}

export interface OrganizerMemberDTO {
  id: string;
  userId: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
}

export interface OrganizerResponse {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  logoUrl?: string | null;
  website?: string | null;
  email?: string | null;
  orgId?: string | null;
  organizationId?: string | null;
  ownerId: string;
  members?: OrganizerMemberDTO[];
  eventsCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateOrganizationRequest {
  clerkOrgId: string;
  name: string;
  slug: string;
  domain?: string;
  logoUrl?: string;
  location?: string;
}

export interface UpdateOrganizationRequest {
  name?: string;
  domain?: string;
  logoUrl?: string;
  location?: string;
}

export interface OrganizationResponse {
  id: string;
  clerkOrgId: string;
  name: string;
  slug: string;
  domain?: string | null;
  logoUrl?: string | null;
  location?: string | null;
  subOrganizersCount?: number;
  eventsCount?: number;
  createdAt: string;
  updatedAt: string;
}
