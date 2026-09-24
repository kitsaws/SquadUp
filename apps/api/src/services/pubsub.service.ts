import { Redis } from "ioredis";

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";

export const redisPublisher = new Redis(REDIS_URL, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
});

export const redisSubscriber = new Redis(REDIS_URL, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
});

redisPublisher.on("error", (err) => {
  console.warn("[Redis Publisher] Error/Warning:", err.message);
});

redisSubscriber.on("error", (err) => {
  console.warn("[Redis Subscriber] Error/Warning:", err.message);
});

type NotificationListener = (payload: any) => void;

// In-memory mapping of active user listeners connected via SSE
const userListeners = new Map<string, Set<NotificationListener>>();
const campusListeners = new Map<string, Set<NotificationListener>>();

// Centralized message handler
redisSubscriber.on("message", (channel: string, message: string) => {
  try {
    const parsed = JSON.parse(message);

    if (channel.startsWith("notifications:user:")) {
      const userId = channel.replace("notifications:user:", "");
      const listeners = userListeners.get(userId);
      if (listeners && listeners.size > 0) {
        listeners.forEach((callback) => {
          try {
            callback(parsed);
          } catch (e) {
            console.error(`[PubSub] Error dispatching to listener for user ${userId}:`, e);
          }
        });
      }
    } else if (channel.startsWith("notifications:campus:")) {
      const campus = channel.replace("notifications:campus:", "");
      const listeners = campusListeners.get(campus);
      if (listeners && listeners.size > 0) {
        listeners.forEach((callback) => {
          try {
            callback(parsed);
          } catch (e) {
            console.error(`[PubSub] Error dispatching campus notification:`, e);
          }
        });
      }
    }
  } catch (err) {
    console.error("[PubSub] Failed to parse message on channel:", channel, err);
  }
});

export class PubSubService {
  /**
   * Subscribe an SSE client callback to receive real-time notifications for a user.
   */
  static async subscribeUser(userId: string, listener: NotificationListener): Promise<() => void> {
    if (!userListeners.has(userId)) {
      userListeners.set(userId, new Set());
      const channel = `notifications:user:${userId}`;
      try {
        await redisSubscriber.subscribe(channel);
      } catch (err) {
        console.warn(`[PubSub] Could not subscribe to Redis channel "${channel}":`, err);
      }
    }

    userListeners.get(userId)!.add(listener);

    // Return unsubscribe function
    return () => {
      PubSubService.unsubscribeUser(userId, listener);
    };
  }

  /**
   * Unsubscribe a specific listener.
   */
  static async unsubscribeUser(userId: string, listener: NotificationListener): Promise<void> {
    const listeners = userListeners.get(userId);
    if (!listeners) return;

    listeners.delete(listener);

    if (listeners.size === 0) {
      userListeners.delete(userId);
      const channel = `notifications:user:${userId}`;
      try {
        await redisSubscriber.unsubscribe(channel);
      } catch (err) {
        console.warn(`[PubSub] Could not unsubscribe from Redis channel "${channel}":`, err);
      }
    }
  }

  /**
   * Publish a real-time event to a specific user.
   */
  static async publishUser(userId: string, data: any): Promise<void> {
    const channel = `notifications:user:${userId}`;
    try {
      await redisPublisher.publish(channel, JSON.stringify(data));
    } catch (err) {
      console.warn(`[PubSub] Failed to publish to user "${userId}":`, err);
    }
  }

  /**
   * Publish a broadcast event to all students of a university campus.
   */
  static async publishCampus(campus: string, data: any): Promise<void> {
    const channel = `notifications:campus:${campus.toLowerCase().replace(/\s+/g, "-")}`;
    try {
      await redisPublisher.publish(channel, JSON.stringify(data));
    } catch (err) {
      console.warn(`[PubSub] Failed to publish to campus "${campus}":`, err);
    }
  }
}
