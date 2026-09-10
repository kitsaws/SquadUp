export interface CreateTeamRequest {
  eventId: string;
  name: string;
  requirements?: string[];
  invites?: string[]; // Array of emails
  orgId?: string;
}

export interface TeamInviteResponse {
  id: string;
  teamId: string;
  senderId: string;
  email: string;
  status: string;
  createdAt: Date;
}
