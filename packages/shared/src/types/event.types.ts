export interface CreateEventRequest {
  title: string;
  description: string;
  date: string; // ISO 8601 string
  location?: string;
  isGlobal?: boolean;
}

export interface EventResponse {
  id: string;
  title: string;
  description: string;
  date: string; // ISO 8601 string
  location?: string;
  organizerId: string;
  orgId?: string;
  isGlobal: boolean;
  createdAt: string;
  updatedAt: string;
}
