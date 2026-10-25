import React, { useEffect, useRef } from "react";
import { toast } from "react-toastify";
import { healthApi } from "../services/api";

const TOAST_ID = "server-warmup-status";

export const ServerWarmupNotifier: React.FC = () => {
  const hasStartedRef = useRef(false);

  useEffect(() => {
    // Only run once per session mount
    if (hasStartedRef.current) return;
    hasStartedRef.current = true;

    let isMounted = true;
    let pollInterval: NodeJS.Timeout | null = null;
    let attempts = 0;
    const maxAttempts = 40; // ~100 seconds polling window

    // 1. Initial Toast: Notify user that the free-tier server is spinning up
    toast.loading(
      React.createElement(
        "div",
        { className: "flex flex-col gap-0.5" },
        React.createElement(
          "span",
          { className: "font-semibold text-sm flex items-center gap-1.5 text-amber-400" },
          "⚡ Initializing Server..."
        ),
        React.createElement(
          "span",
          { className: "text-xs text-slate-300 leading-snug" },
          "Backend is hosted on a free tier and spins down when idle. First boot may take ~30–50s."
        )
      ),
      {
        toastId: TOAST_ID,
        autoClose: false,
        closeOnClick: false,
        closeButton: false,
        draggable: false,
        theme: "dark",
        position: "bottom-right",
      }
    );

    // 2. Poll /health until server responds with 200 { status: "ok" }
    const checkServer = async () => {
      attempts++;
      try {
        const res = await healthApi.checkHealth(4000);
        if (res && res.status === "ok") {
          if (!isMounted) return;

          // 3. Update Toast to Success
          toast.update(TOAST_ID, {
            render: React.createElement(
              "div",
              { className: "flex flex-col gap-0.5" },
              React.createElement(
                "span",
                { className: "font-semibold text-sm text-emerald-400 flex items-center gap-1.5" },
                "🚀 Server is Online & Ready!"
              ),
              React.createElement(
                "span",
                { className: "text-xs text-slate-300 leading-snug" },
                "Backend connected. AI resume parsing, matchmaking & real-time alerts are live."
              )
            ),
            type: "success",
            isLoading: false,
            autoClose: 4500,
            closeButton: true,
            closeOnClick: true,
            draggable: true,
          });

          return; // Done!
        }
      } catch {
        // Server still waking up or timeout, continue polling
      }

      if (attempts >= maxAttempts) {
        if (!isMounted) return;
        toast.update(TOAST_ID, {
          render: React.createElement(
            "div",
            { className: "flex flex-col gap-0.5" },
            React.createElement(
              "span",
              { className: "font-semibold text-sm text-amber-300" },
              "⚠️ Server Wake-up Taking Longer"
            ),
            React.createElement(
              "span",
              { className: "text-xs text-slate-300 leading-snug" },
              "Render is taking longer to start up. Please refresh the page in a few seconds."
            )
          ),
          type: "warning",
          isLoading: false,
          autoClose: 6000,
          closeButton: true,
          closeOnClick: true,
        });
        return;
      }

      // Schedule next check in 2.5 seconds
      if (isMounted) {
        pollInterval = setTimeout(checkServer, 2500);
      }
    };

    // Begin check immediately
    checkServer();

    return () => {
      isMounted = false;
      if (pollInterval) clearTimeout(pollInterval);
    };
  }, []);

  return null;
};
