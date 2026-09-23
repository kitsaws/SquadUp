export type NotificationType =
  | "TEAM_INVITE"
  | "APPLICATION_RECEIVED"
  | "APPLICATION_ACCEPTED"
  | "APPLICATION_REJECTED"
  | "TEAM_JOINED"
  | "TEAM_MEMBER_LEFT"
  | "EVENT_ANNOUNCEMENT"
  | "PROFILE_UPDATED";

export interface NotificationDTO {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  link?: string | null;
  data?: {
    teamId?: string;
    inviteId?: string;
    roleId?: string;
    roleTitle?: string;
    roleSkills?: string[];
    eventId?: string;
    eventTitle?: string;
    senderName?: string;
    candidateName?: string;
    applicationId?: string;
    [key: string]: any;
  } | null;
  isRead: boolean;
  expiresAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationListResponse {
  notifications: NotificationDTO[];
  unreadCount: number;
  total: number;
}
