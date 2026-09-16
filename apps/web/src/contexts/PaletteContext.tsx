import React, { createContext, useContext, useState, useEffect } from "react";
import { preferencesApi } from "../services/api";

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

export const DEFAULT_PALETTE: PaletteTokens = {
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

export const PALETTE_PRESETS: Record<string, PaletteTokens> = {
  "SquadUp 2.0 Default": DEFAULT_PALETTE,
  "Midnight Collegiate": {
    primaryAction: "#3b82f6",
    bestFit: "#34d399",
    crossCampus: "#818cf8",
    campusExplorer: "#fbbf24",
    canvas: "#090d16",
    surface: "#111827",
    textPrimary: "#f8fafc",
    textMuted: "#94a3b8",
    border: "#1f2937",
  },
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
  updateToken: (key: keyof PaletteTokens, value: string) => void;
  loadPreset: (name: string) => void;
  resetPalette: () => void;
  exportCss: () => string;
  exportJson: () => string;
}

const PaletteContext = createContext<PaletteContextType | undefined>(undefined);

export function PaletteProvider({ children }: { children: React.ReactNode }) {
  const [palette, setPalette] = useState<PaletteTokens>(() => {
    if (typeof window !== "undefined") {
      try {
        const cached = localStorage.getItem("squadup_active_palette");
        if (cached) {
          return { ...DEFAULT_PALETTE, ...JSON.parse(cached) };
        }
      } catch {
        // fallback to default
      }
    }
    return DEFAULT_PALETTE;
  });

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--sq-primary-action", palette.primaryAction);
    root.style.setProperty("--sq-primary-hover", `color-mix(in srgb, ${palette.primaryAction} 85%, black)`);
    root.style.setProperty("--sq-primary-light", `color-mix(in srgb, ${palette.primaryAction} 10%, transparent)`);
    root.style.setProperty("--sq-primary-border", `color-mix(in srgb, ${palette.primaryAction} 30%, transparent)`);
    root.style.setProperty("--sq-best-fit", palette.bestFit);
    root.style.setProperty("--sq-cross-campus", palette.crossCampus);
    root.style.setProperty("--sq-campus-explorer", palette.campusExplorer);
    root.style.setProperty("--sq-canvas", palette.canvas);
    root.style.setProperty("--sq-surface", palette.surface);
    root.style.setProperty("--sq-text-primary", palette.textPrimary);
    root.style.setProperty("--sq-text-muted", palette.textMuted);
    root.style.setProperty("--sq-border", palette.border);

    try {
      localStorage.setItem("squadup_active_palette", JSON.stringify(palette));
    } catch {
      // ignore
    }
  }, [palette]);

  // Load preferences from API on startup if user is logged in
  useEffect(() => {
    preferencesApi
      .getPreferences()
      .then((prefs) => {
        if (prefs) {
          if (prefs.palettePreset && PALETTE_PRESETS[prefs.palettePreset]) {
            setPalette((prev) => ({ ...prev, ...PALETTE_PRESETS[prefs.palettePreset] }));
          }
          if (prefs.primaryColor) {
            setPalette((prev) => ({ ...prev, primaryAction: prefs.primaryColor! }));
          }
        }
      })
      .catch(() => {
        // Not authenticated or guest; ignore silently
      });
  }, []);

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
    setPalette(DEFAULT_PALETTE);
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
