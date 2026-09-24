import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { useUserContext } from "./UserContext";
import {
  notificationsApi,
  NotificationDTO,
  getAuthToken,
  API_BASE_URL,
} from "../services/api";

export type { NotificationDTO };

interface NotificationContextType {
  notifications: NotificationDTO[];
  unreadCount: number;
  loading: boolean;
  refreshNotifications: () => Promise<void>;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  latestToast: NotificationDTO | null;
  clearToast: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isSignedIn } = useUserContext();
  const [notifications, setNotifications] = useState<NotificationDTO[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [latestToast, setLatestToast] = useState<NotificationDTO | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);

  const clearToast = useCallback(() => {
    setLatestToast(null);
  }, []);

  const refreshNotifications = useCallback(async () => {
    if (!isSignedIn) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    try {
      setLoading(true);
      const res = await notificationsApi.getNotifications({ limit: 30 });
      setNotifications(res.notifications || []);
      setUnreadCount(res.unreadCount || 0);
    } catch (err) {
      console.warn("[NotificationContext] Error fetching notifications:", err);
    } finally {
      setLoading(false);
    }
  }, [isSignedIn]);

  // Initial fetch on sign in state transition
  useEffect(() => {
    if (isSignedIn) {
      refreshNotifications();
    } else {
      setNotifications([]);
      setUnreadCount(0);
    }
  }, [isSignedIn, refreshNotifications]);

  // Real-time SSE listener using fetch ReadableStream (with Bearer Authorization header)
  useEffect(() => {
    if (!isSignedIn) return;

    let isSubscribed = true;
    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    async function connectSSE() {
      try {
        const token = await getAuthToken();
        if (!token) {
          // Token not ready yet; retry in 2s
          if (isSubscribed) {
            setTimeout(connectSSE, 2000);
          }
          return;
        }
        if (!isSubscribed) return;

        const response = await fetch(`${API_BASE_URL}/notifications/stream`, {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "text/event-stream",
          },
          signal: controller.signal,
        });

        if (!response.ok || !response.body) {
          console.warn("[Notification SSE] Stream connection rejected:", response.status);
          if (isSubscribed) {
            setTimeout(connectSSE, 5000);
          }
          return;
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (isSubscribed) {
          const { value, done } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n\n");
          buffer = lines.pop() || "";

          for (const chunk of lines) {
            const trimmed = chunk.trim();
            if (!trimmed || trimmed.startsWith(":")) continue; // Skip comments/keepalives

            if (trimmed.startsWith("data:")) {
              try {
                const jsonString = trimmed.replace(/^data:\s*/, "");
                const event = JSON.parse(jsonString);

                if (event.type === "STREAM_CONNECTED") {
                  refreshNotifications();
                } else if (event.type === "NOTIFICATION_CREATED" && event.notification) {
                  const newNotif: NotificationDTO = event.notification;
                  setNotifications((prev) => [newNotif, ...prev.filter((n) => n.id !== newNotif.id)]);
                  setUnreadCount((prev) => prev + 1);
                  setLatestToast(newNotif);

                  // Auto-dismiss toast banner after 6 seconds
                  setTimeout(() => {
                    setLatestToast((curr) => (curr?.id === newNotif.id ? null : curr));
                  }, 6000);
                } else if (event.type === "NOTIFICATION_READ" && event.notificationId) {
                  setNotifications((prev) =>
                    prev.map((n) => (n.id === event.notificationId ? { ...n, isRead: true } : n))
                  );
                  setUnreadCount((prev) => Math.max(0, prev - 1));
                } else if (event.type === "NOTIFICATIONS_ALL_READ") {
                  setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
                  setUnreadCount(0);
                }
              } catch (e) {
                console.warn("[Notification SSE] Error parsing event chunk:", e);
              }
            }
          }
        }
      } catch (err: any) {
        if (err.name !== "AbortError" && isSubscribed) {
          console.warn("[Notification SSE] Connection error, retrying in 5s...", err);
          setTimeout(() => {
            if (isSubscribed) connectSSE();
          }, 5000);
        }
      }
    }

    connectSSE();

    // Background heartbeat polling (every 20s) and tab-focus re-sync
    const handleVisibilityOrFocus = () => {
      if (document.visibilityState === "visible") {
        refreshNotifications();
      }
    };

    window.addEventListener("focus", handleVisibilityOrFocus);
    document.addEventListener("visibilitychange", handleVisibilityOrFocus);

    const interval = setInterval(() => {
      if (document.visibilityState === "visible") {
        refreshNotifications();
      }
    }, 20000);

    return () => {
      isSubscribed = false;
      controller.abort();
      window.removeEventListener("focus", handleVisibilityOrFocus);
      document.removeEventListener("visibilitychange", handleVisibilityOrFocus);
      clearInterval(interval);
    };
  }, [isSignedIn, refreshNotifications]);

  const markAsRead = async (notificationId: string) => {
    try {
      // Optimistic update
      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, isRead: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
      await notificationsApi.markAsRead(notificationId);
    } catch (err) {
      console.warn("[NotificationContext] Error marking as read:", err);
      refreshNotifications();
    }
  };

  const markAllAsRead = async () => {
    try {
      // Optimistic update
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
      await notificationsApi.markAllAsRead();
    } catch (err) {
      console.warn("[NotificationContext] Error marking all as read:", err);
      refreshNotifications();
    }
  };

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        loading,
        refreshNotifications,
        markAsRead,
        markAllAsRead,
        latestToast,
        clearToast,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error("useNotifications must be used within a NotificationProvider");
  }
  return context;
}
