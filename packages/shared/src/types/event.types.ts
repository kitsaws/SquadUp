export interface CreateEventRequest {
  title: string;
  description: string;
  date: string; // ISO 8601 string
  location?: string;
  organizerProfileId?: string;
  orgId?: string;
  isGlobal?: boolean;
}

export interface UpdateEventRequest {
  title?: string;
  description?: string;
  date?: string; // ISO 8601 string
  location?: string;
  organizerProfileId?: string;
  orgId?: string;
  isGlobal?: boolean;
}

export interface EventResponse {
  id: string;
  title: string;
  description: string;
  date: string; // ISO 8601 string
  location?: string;
  organizerId: string;
  organizerProfileId?: string | null;
  orgId?: string;
  isGlobal: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface EventDetailResponse extends EventResponse {
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
  } | null;
  organization?: {
    id: string;
    name: string;
    slug: string;
    logoUrl?: string | null;
  } | null;
  teamsCount?: number;
  participantsCount?: number;
  tracks?: string[];
  teams?: {
    id: string;
    name: string;
    membersCount: number;
    requirements: string[];
  }[];
}

export type EventItem = EventDetailResponse;

export interface EventQueryFilters {
  page?: number;
  limit?: number;
  search?: string;
  scope?: "all" | "global" | "org" | "my_university";
  campus?: string;
  sort?: "popularity" | "popular" | "date_asc" | "date_desc" | "created_at";
}

