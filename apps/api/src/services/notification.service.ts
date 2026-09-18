import { PrismaClient } from "@prisma/client";
import { NotificationDTO, NotificationType } from "@squadup/shared";
import { PubSubService } from "./pubsub.service.js";

const prisma = new PrismaClient();

export interface CreateNotificationParams {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  link?: string | null;
  data?: Record<string, any> | null;
  ttlDays?: number;
  expiresAt?: Date | null;
}

export class NotificationService {
  /**
   * Create a notification in PostgreSQL and broadcast to real-time Redis Pub/Sub stream.
   */
  static async createNotification(params: CreateNotificationParams): Promise<NotificationDTO | null> {
    const { userId, type, title, message, link, data, ttlDays = 30 } = params;

    try {
      // 1. Check User Notification Preferences
      const preferences = await prisma.userPreferences.findUnique({
        where: { userId },
      });

      if (preferences) {
        if (
          (type === "TEAM_INVITE" || type === "TEAM_JOINED" || type === "TEAM_MEMBER_LEFT") &&
          preferences.teamInvitesNotification === false
        ) {
          return null;
        }
        if (
          (type === "APPLICATION_RECEIVED" ||
            type === "APPLICATION_ACCEPTED" ||
            type === "APPLICATION_REJECTED") &&
          preferences.applicationUpdates === false
        ) {
          return null;
        }
        if (type === "EVENT_ANNOUNCEMENT" && (preferences as any).eventNotifications === false) {
          return null;
        }
      }

      // 2. Compute TTL Expiry
      const expiresAt =
        params.expiresAt !== undefined
          ? params.expiresAt
          : new Date(Date.now() + ttlDays * 24 * 60 * 60 * 1000);

      // 3. Persist to Database
      const record = await (prisma as any).notification.create({
        data: {
          userId,
          type,
          title,
          message,
          link: link || null,
          data: data || null,
          isRead: false,
          expiresAt,
        },
      });

      const notificationDTO: NotificationDTO = {
        id: record.id,
        userId: record.userId,
        type: record.type as NotificationType,
        title: record.title,
        message: record.message,
        link: record.link,
        data: record.data,
        isRead: record.isRead,
        expiresAt: record.expiresAt ? record.expiresAt.toISOString() : null,
        createdAt: record.createdAt.toISOString(),
        updatedAt: record.updatedAt.toISOString(),
      };

      // 4. Publish real-time event to user's Redis Pub/Sub channel
      await PubSubService.publishUser(userId, {
        type: "NOTIFICATION_CREATED",
        notification: notificationDTO,
      });

      return notificationDTO;
    } catch (err) {
      console.error(`[NotificationService] Error creating notification for user ${userId}:`, err);
      return null;
    }
  }

  /**
   * Broadcast a newly hosted campus event to all students affiliated with the university.
   */
  static async broadcastCampusEvent(params: {
    eventId: string;
    eventTitle: string;
    university: string;
    organizerName?: string;
    eventDate?: Date;
  }): Promise<void> {
    const { eventId, eventTitle, university, organizerName, eventDate } = params;

    try {
      // Find all students whose profile belongs to this university
      const students = await prisma.user.findMany({
        where: {
          profile: {
            university: { equals: university, mode: "insensitive" },
          },
        },
        select: { id: true },
      });

      if (!students || students.length === 0) return;

      const expiresAt = eventDate
        ? new Date(new Date(eventDate).getTime() + 3 * 24 * 60 * 60 * 1000)
        : new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);

      // Asynchronously batch dispatch notifications
      for (const student of students) {
        NotificationService.createNotification({
          userId: student.id,
          type: "EVENT_ANNOUNCEMENT",
          title: "🎉 New Campus Event Announced!",
          message: `${eventTitle} has just been posted by ${organizerName || "campus organizers"} at ${university}. Form your squad now!`,
          link: `/events`,
          data: { eventId, eventTitle, university },
          expiresAt,
        }).catch((e) => console.warn(`[NotificationService] Failed to dispatch campus event to ${student.id}:`, e));
      }
    } catch (err) {
      console.error(`[NotificationService] Error broadcasting campus event:`, err);
    }
  }

  /**
   * Fetch active, non-expired notifications for a user with unread counter.
   */
  static async getUserNotifications(
    userId: string,
    options?: { page?: number; limit?: number; unreadOnly?: boolean }
  ): Promise<{ notifications: NotificationDTO[]; unreadCount: number; total: number }> {
    const page = Math.max(1, options?.page || 1);
    const limit = Math.min(50, Math.max(1, options?.limit || 20));
    const now = new Date();

    const whereClause: any = {
      userId,
      OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
    };

    if (options?.unreadOnly) {
      whereClause.isRead = false;
    }

    const [rawNotifications, unreadCount, total] = await Promise.all([
      (prisma as any).notification.findMany({
        where: whereClause,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      (prisma as any).notification.count({
        where: {
          userId,
          isRead: false,
          OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
        },
      }),
      (prisma as any).notification.count({ where: whereClause }),
    ]);

    const notifications: NotificationDTO[] = rawNotifications.map((n: any) => ({
      id: n.id,
      userId: n.userId,
      type: n.type as NotificationType,
      title: n.title,
      message: n.message,
      link: n.link,
      data: n.data,
      isRead: n.isRead,
      expiresAt: n.expiresAt ? n.expiresAt.toISOString() : null,
      createdAt: n.createdAt.toISOString(),
      updatedAt: n.updatedAt.toISOString(),
    }));

    return {
      notifications,
      unreadCount,
      total,
    };
  }

  /**
   * Mark a single notification as read.
   */
  static async markAsRead(notificationId: string, userId: string): Promise<boolean> {
    try {
      await (prisma as any).notification.updateMany({
        where: { id: notificationId, userId },
        data: { isRead: true },
      });

      await PubSubService.publishUser(userId, {
        type: "NOTIFICATION_READ",
        notificationId,
      });

      return true;
    } catch (err) {
      console.error(`[NotificationService] Failed to mark notification ${notificationId} as read:`, err);
      return false;
    }
  }

  /**
   * Mark all notifications for a user as read.
   */
  static async markAllAsRead(userId: string): Promise<number> {
    try {
      const result = await (prisma as any).notification.updateMany({
        where: { userId, isRead: false },
        data: { isRead: true },
      });

      await PubSubService.publishUser(userId, {
        type: "NOTIFICATIONS_ALL_READ",
      });

      return result.count;
    } catch (err) {
      console.error(`[NotificationService] Failed to mark all notifications as read for ${userId}:`, err);
      return 0;
    }
  }
}
