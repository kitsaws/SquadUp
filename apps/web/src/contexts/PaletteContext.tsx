import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { useUser } from "@clerk/react";
import { preferencesApi } from "../services/api";

export type ThemeMode = "light" | "dark" | "system";

export interface PaletteTokens {
  primaryAction: string;
  bestFit: string;
  crossCampus: string;
  campusExplorer: string;
  canvas: string;
  surface: string;
  textPrimary: string;
  textMuted: string;
  border: string;
}

export const DEFAULT_LIGHT_PALETTE: PaletteTokens = {
  primaryAction: "#2563eb",
  bestFit: "#68DBA9",
  crossCampus: "#6366F1",
  campusExplorer: "#ffc761",
  canvas: "#f8fafc",
  surface: "#ffffff",
  textPrimary: "#0f172a",
  textMuted: "#64748b",
  border: "#e2e8f0",
};

export const DEFAULT_DARK_PALETTE: PaletteTokens = {
  primaryAction: "#3b82f6",
  bestFit: "#34d399",
  crossCampus: "#818cf8",
  campusExplorer: "#fbbf24",
  canvas: "#0b0f19",
  surface: "#111827",
  textPrimary: "#f8fafc",
  textMuted: "#94a3b8",
  border: "#1e293b",
};

export const PALETTE_PRESETS: Record<string, PaletteTokens> = {
  "SquadUp 2.0 Default": DEFAULT_LIGHT_PALETTE,
  "Emerald Focus": {
    primaryAction: "#059669",
    bestFit: "#10b981",
    crossCampus: "#0284c7",
    campusExplorer: "#f59e0b",
    canvas: "#f4fbf7",
    surface: "#ffffff",
    textPrimary: "#064e3b",
    textMuted: "#047857",
    border: "#d1fae5",
  },
  "High Contrast Slate": {
    primaryAction: "#1d4ed8",
    bestFit: "#059669",
    crossCampus: "#4338ca",
    campusExplorer: "#d97706",
    canvas: "#f1f5f9",
    surface: "#ffffff",
    textPrimary: "#020617",
    textMuted: "#475569",
    border: "#cbd5e1",
  },
};

interface PaletteContextType {
  palette: PaletteTokens;
  themeMode: ThemeMode;
  isDark: boolean;
  setThemeMode: (mode: ThemeMode) => void;
  toggleThemeMode: () => void;
  updateToken: (key: keyof PaletteTokens, value: string) => void;
  loadPreset: (name: string) => void;
  resetPalette: () => void;
  exportCss: () => string;
  exportJson: () => string;
}

const PaletteContext = createContext<PaletteContextType | undefined>(undefined);

export function PaletteProvider({ children }: { children: React.ReactNode }) {
  const { isSignedIn, isLoaded } = useUser();
  const wasSignedIn = useRef(false);

  // Theme mode: light | dark | system. Default is "light"
  const [themeMode, setThemeModeState] = useState<ThemeMode>(() => {
    if (typeof window !== "undefined") {
      try {
        const savedMode = localStorage.getItem("squadup_theme_mode") as ThemeMode | null;
        if (savedMode && (savedMode === "light" || savedMode === "dark" || savedMode === "system")) {
          return savedMode;
        }
      } catch {
        // fallback to light
      }
    }
    return "light";
  });

  const [systemPrefersDark, setSystemPrefersDark] = useState<boolean>(() => {
    if (typeof window !== "undefined" && window.matchMedia) {
      return window.matchMedia("(prefers-color-scheme: dark)").matches;
    }
    return false;
  });

  // Clear theme from localStorage on logout and revert to default light mode
  useEffect(() => {
    if (isLoaded) {
      if (isSignedIn) {
        wasSignedIn.current = true;
      } else if (wasSignedIn.current && !isSignedIn) {
        wasSignedIn.current = false;
        try {
          localStorage.removeItem("squadup_theme_mode");
          localStorage.removeItem("squadup_active_palette");
        } catch {
          // ignore
        }
        setThemeModeState("light");
        setPalette(DEFAULT_LIGHT_PALETTE);
      }
    }
  }, [isSignedIn, isLoaded]);

  // Listen for system theme changes
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (e: MediaQueryListEvent) => setSystemPrefersDark(e.matches);
    mediaQuery.addEventListener("change", handler);
    return () => mediaQuery.removeEventListener("change", handler);
  }, []);

  const isDark = themeMode === "dark" || (themeMode === "system" && systemPrefersDark);

  const [palette, setPalette] = useState<PaletteTokens>(() => {
    if (typeof window !== "undefined") {
      try {
        const cached = localStorage.getItem("squadup_active_palette");
        if (cached) {
          return { ...DEFAULT_LIGHT_PALETTE, ...JSON.parse(cached) };
        }
      } catch {
        // fallback
      }
    }
    return DEFAULT_LIGHT_PALETTE;
  });

  const setThemeMode = useCallback((mode: ThemeMode) => {
    setThemeModeState(mode);
    try {
      localStorage.setItem("squadup_theme_mode", mode);
    } catch {
      // ignore
    }
  }, []);

  const toggleThemeMode = useCallback(() => {
    // Toggle between light and dark
    const nextMode: ThemeMode = isDark ? "light" : "dark";
    setThemeMode(nextMode);
  }, [isDark, setThemeMode]);

  // Apply root CSS variables & .dark class on documentElement
  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", isDark);

    // Dynamic brand primary tints
    root.style.setProperty("--sq-primary-action", palette.primaryAction);
    root.style.setProperty(
      "--sq-primary-hover",
      isDark
        ? `color-mix(in srgb, ${palette.primaryAction} 85%, white)`
        : `color-mix(in srgb, ${palette.primaryAction} 85%, black)`
    );
    root.style.setProperty(
      "--sq-primary-light",
      isDark
        ? `color-mix(in srgb, ${palette.primaryAction} 18%, transparent)`
        : `color-mix(in srgb, ${palette.primaryAction} 10%, transparent)`
    );
    root.style.setProperty(
      "--sq-primary-border",
      isDark
        ? `color-mix(in srgb, ${palette.primaryAction} 35%, transparent)`
        : `color-mix(in srgb, ${palette.primaryAction} 30%, transparent)`
    );

    // Recommendation tiers
    root.style.setProperty("--sq-best-fit", palette.bestFit);
    root.style.setProperty("--sq-cross-campus", palette.crossCampus);
    root.style.setProperty("--sq-campus-explorer", palette.campusExplorer);

    // Foundations: if dark mode, adapt canvas/surface/text tokens
    if (isDark) {
      root.style.setProperty("--sq-canvas", palette.canvas === "#f8fafc" ? "#0b0f19" : palette.canvas);
      root.style.setProperty("--sq-surface", palette.surface === "#ffffff" ? "#111827" : palette.surface);
      root.style.setProperty("--sq-surface-dim", "#1e293b");
      root.style.setProperty("--sq-text-primary", palette.textPrimary === "#0f172a" ? "#f8fafc" : palette.textPrimary);
      root.style.setProperty("--sq-text-muted", palette.textMuted === "#64748b" ? "#94a3b8" : palette.textMuted);
      root.style.setProperty("--sq-border", palette.border === "#e2e8f0" ? "#1e293b" : palette.border);
    } else {
      root.style.setProperty("--sq-canvas", palette.canvas);
      root.style.setProperty("--sq-surface", palette.surface);
      root.style.setProperty("--sq-surface-dim", "#f1f5f9");
      root.style.setProperty("--sq-text-primary", palette.textPrimary);
      root.style.setProperty("--sq-text-muted", palette.textMuted);
      root.style.setProperty("--sq-border", palette.border);
    }

    try {
      localStorage.setItem("squadup_active_palette", JSON.stringify(palette));
    } catch {
      // ignore
    }
  }, [palette, isDark]);

  // Load preferences from API on startup if user is logged in
  useEffect(() => {
    if (!isSignedIn) return;
    preferencesApi
      .getPreferences()
      .then((prefs) => {
        if (prefs) {
          const savedMode = localStorage.getItem("squadup_theme_mode");
          if (!savedMode && prefs.themeMode && (prefs.themeMode === "light" || prefs.themeMode === "dark" || prefs.themeMode === "system")) {
            setThemeMode(prefs.themeMode);
          }
          const resolvedPreset = prefs.palettePreset;
          if (resolvedPreset && PALETTE_PRESETS[resolvedPreset]) {
            setPalette((prev) => ({ ...prev, ...PALETTE_PRESETS[resolvedPreset] }));
          }
          if (prefs.primaryColor) {
            setPalette((prev) => ({ ...prev, primaryAction: prefs.primaryColor! }));
          }
        }
      })
      .catch(() => {
        // Not authenticated or guest; ignore silently
      });
  }, [isSignedIn, setThemeMode]);

  const updateToken = (key: keyof PaletteTokens, value: string) => {
    setPalette((prev) => ({ ...prev, [key]: value }));
  };

  const loadPreset = (name: string) => {
    if (PALETTE_PRESETS[name]) {
      setPalette(PALETTE_PRESETS[name]);
      return;
    }
    const lower = name.toLowerCase();
    const found = Object.keys(PALETTE_PRESETS).find(
      (k) => k.toLowerCase().includes(lower) || lower.includes(k.toLowerCase())
    );
    if (found) {
      setPalette(PALETTE_PRESETS[found]);
    }
  };

  const resetPalette = () => {
    setPalette(isDark ? DEFAULT_DARK_PALETTE : DEFAULT_LIGHT_PALETTE);
  };

  const exportCss = () => {
    return `/* SquadUp 2.0 Exported CSS Tokens (Paste into styles.css @theme or :root) */
@theme {
  --color-primary-action: ${palette.primaryAction};
  --color-best-fit: ${palette.bestFit};
  --color-cross-campus: ${palette.crossCampus};
  --color-campus-explorer: ${palette.campusExplorer};
  --color-canvas: ${palette.canvas};
  --color-surface: ${palette.surface};
  --color-text-main: ${palette.textPrimary};
  --color-text-muted: ${palette.textMuted};
  --color-surface-border: ${palette.border};
}

:root {
  --sq-primary-action: ${palette.primaryAction};
  --sq-best-fit: ${palette.bestFit};
  --sq-cross-campus: ${palette.crossCampus};
  --sq-campus-explorer: ${palette.campusExplorer};
  --sq-canvas: ${palette.canvas};
  --sq-surface: ${palette.surface};
  --sq-text-primary: ${palette.textPrimary};
  --sq-text-muted: ${palette.textMuted};
  --sq-border: ${palette.border};
}`;
  };

  const exportJson = () => {
    return JSON.stringify(
      {
        name: "SquadUp 2.0 Custom Theme",
        tokens: palette,
      },
      null,
      2
    );
  };

  return (
    <PaletteContext.Provider
      value={{
        palette,
        themeMode,
        isDark,
        setThemeMode,
        toggleThemeMode,
        updateToken,
        loadPreset,
        resetPalette,
        exportCss,
        exportJson,
      }}
    >
      {children}
    </PaletteContext.Provider>
  );
}

export function usePalette() {
  const context = useContext(PaletteContext);
  if (!context) {
    throw new Error("usePalette must be used within a PaletteProvider");
  }
  return context;
}
