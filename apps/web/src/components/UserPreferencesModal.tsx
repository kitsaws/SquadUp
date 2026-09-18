import React, { useState, useEffect } from "react";
import {
  X,
  Check,
  Palette,
  Bell,
  Sliders,
  Users,
  Mail,
  Sun,
  Moon,
  Monitor,
  Loader2,
  Sparkles,
  School,
  Save,
  AlertCircle,
  Calendar,
} from "lucide-react";
import { toast } from "react-toastify";
import { usePalette, PALETTE_PRESETS } from "../contexts/PaletteContext";
import {
  preferencesApi,
  UserPreferences,
  UpdateUserPreferencesRequest,
} from "../services/api";
import { CacheService } from "../services/cache.service";

interface UserPreferencesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPreferencesUpdated?: (prefs: UserPreferences) => void;
}

type TabType = "theme" | "notifications" | "matching";

const ROLE_OPTIONS = [
  "Frontend",
  "Backend",
  "Full Stack",
  "UI/UX Design",
  "AI / ML",
  "Mobile (iOS/Android)",
  "DevOps / Cloud",
  "Product / PM",
];

export const UserPreferencesModal: React.FC<UserPreferencesModalProps> = ({
  isOpen,
  onClose,
  onPreferencesUpdated,
}) => {
  const { palette, updateToken, loadPreset, themeMode: contextThemeMode, setThemeMode: setContextThemeMode } = usePalette();

  const [activeTab, setActiveTab] = useState<TabType>("theme");
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [themeMode, setThemeMode] = useState<"light" | "dark" | "system">(contextThemeMode || "light");
  const [selectedPreset, setSelectedPreset] = useState<string>("SquadUp 2.0 Default");
  const [customPrimaryColor, setCustomPrimaryColor] = useState<string>("#2563eb");
  const [syncThemeWithBanner, setSyncThemeWithBanner] = useState<boolean>(true);

  const [emailNotifications, setEmailNotifications] = useState<boolean>(true);
  const [teamInvitesNotification, setTeamInvitesNotification] = useState<boolean>(true);
  const [applicationUpdates, setApplicationUpdates] = useState<boolean>(true);
  const [eventNotifications, setEventNotifications] = useState<boolean>(true);
  const [marketingEmails, setMarketingEmails] = useState<boolean>(false);

  const [defaultCampusOnly, setDefaultCampusOnly] = useState<boolean>(false);
  const [openToCollaboration, setOpenToCollaboration] = useState<boolean>(true);
  const [preferredRoles, setPreferredRoles] = useState<string[]>([]);

  // Load preferences from API on modal open
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    setLoading(true);

    preferencesApi
      .getPreferences()
      .then((prefs) => {
        if (!isMounted) return;
        setThemeMode(prefs.themeMode || contextThemeMode || "light");
        const initialPreset =
          prefs.palettePreset === "midnight" || prefs.palettePreset === "Midnight Collegiate" || prefs.palettePreset === "Dark Theme"
            ? "SquadUp 2.0 Default"
            : prefs.palettePreset || "SquadUp 2.0 Default";
        setSelectedPreset(initialPreset);
        if (prefs.primaryColor) {
          setCustomPrimaryColor(prefs.primaryColor);
        } else {
          setCustomPrimaryColor(palette.primaryAction);
        }
        setSyncThemeWithBanner(prefs.bannerConfig?.syncTheme ?? true);

        setEmailNotifications(prefs.emailNotifications ?? true);
        setTeamInvitesNotification(prefs.teamInvitesNotification ?? true);
        setApplicationUpdates(prefs.applicationUpdates ?? true);
        setEventNotifications(prefs.eventNotifications ?? true);
        setMarketingEmails(prefs.marketingEmails ?? false);

        setDefaultCampusOnly(prefs.defaultCampusOnly ?? false);
        setOpenToCollaboration(prefs.openToCollaboration ?? true);
        setPreferredRoles(prefs.preferredRoles || []);
      })
      .catch((err) => {
        console.warn("[UserPreferencesModal] Error loading preferences:", err);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handlePresetSelect = (presetName: string) => {
    setSelectedPreset(presetName);
    if (PALETTE_PRESETS[presetName]) {
      setCustomPrimaryColor(PALETTE_PRESETS[presetName].primaryAction);
    }
  };

  const handleCustomColorChange = (hex: string) => {
    setCustomPrimaryColor(hex);
    setSelectedPreset("Custom");
  };

  const toggleRole = (role: string) => {
    setPreferredRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]
    );
  };

  const handleSave = async () => {
    setSaving(true);
    const updates: UpdateUserPreferencesRequest = {
      themeMode,
      palettePreset: selectedPreset,
      primaryColor: customPrimaryColor,
      emailNotifications,
      teamInvitesNotification,
      applicationUpdates,
      eventNotifications,
      marketingEmails,
      defaultCampusOnly,
      openToCollaboration,
      preferredRoles,
    };

    try {
      const updated = await preferencesApi.updatePreferences(updates);
      CacheService.invalidatePrefix("sq:profile:");
      CacheService.invalidatePrefix("sq:public_profile:");

      // Apply theme changes globally now that the user confirmed saving
      setContextThemeMode(themeMode);
      if (selectedPreset && PALETTE_PRESETS[selectedPreset]) {
        loadPreset(selectedPreset);
      } else if (customPrimaryColor) {
        updateToken("primaryAction", customPrimaryColor);
      }

      toast.success("Preferences saved successfully!", { position: "bottom-right" });
      onPreferencesUpdated?.(updated);
      onClose();
    } catch (err: any) {
      console.error("[UserPreferencesModal] Failed to save preferences:", err);
      setError(err.message || "Failed to save preferences.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl bg-surface rounded-2xl border border-border-main shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-5 border-b border-border-main flex items-center justify-between bg-surface-dim/40">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary-light text-primary-action border border-primary-border">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-text-main font-heading">
                Preferences & Settings
              </h2>
              <p className="text-xs text-text-muted">
                Customize your theme appearance, notification alerts, and squad matching rules.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-text-muted hover:text-text-main rounded-xl hover:bg-surface-dim transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-border-main px-6 bg-surface">
          {[
            { id: "theme", label: "Theme & Appearance", icon: Palette },
            { id: "notifications", label: "Notifications", icon: Bell },
            { id: "matching", label: "Squads & Matching", icon: Sliders },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as TabType)}
                className={`flex items-center gap-2 py-3 px-4 text-xs font-bold border-b-2 transition-all cursor-pointer ${
                  isActive
                    ? "border-primary-action text-primary-action"
                    : "border-transparent text-text-muted hover:text-text-main"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Modal Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center gap-2.5 text-xs text-rose-500 font-medium">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {loading ? (
            <div className="py-16 flex flex-col items-center justify-center space-y-3">
              <Loader2 className="w-6 h-6 text-primary-action animate-spin" />
              <p className="text-xs text-text-muted">Loading your preferences...</p>
            </div>
          ) : (
            <>
              {/* TAB 1: THEME & APPEARANCE */}
              {activeTab === "theme" && (
                <div className="space-y-6">
                  {/* Theme Mode */}
                  <div>
                    <label className="text-xs font-black uppercase tracking-wider text-text-muted block mb-2.5">
                      Interface Theme Mode
                    </label>
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { id: "light", label: "Light", icon: Sun },
                        { id: "dark", label: "Dark", icon: Moon },
                        { id: "system", label: "System", icon: Monitor },
                      ].map((mode) => {
                        const Icon = mode.icon;
                        const isSelected = themeMode === mode.id;
                        return (
                          <button
                            key={mode.id}
                            type="button"
                            onClick={() => {
                              const newMode = mode.id as "light" | "dark" | "system";
                              setThemeMode(newMode);
                            }}
                            className={`flex flex-col items-center justify-center p-3 rounded-xl border text-xs font-bold gap-1.5 transition-all cursor-pointer ${
                              isSelected
                                ? "border-primary-action bg-primary-light text-primary-action shadow-xs"
                                : "border-border-main bg-surface hover:bg-surface-dim text-text-muted hover:text-text-main"
                            }`}
                          >
                            <Icon className="w-4 h-4" />
                            <span>{mode.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Palette Presets */}
                  <div>
                    <label className="text-xs font-black uppercase tracking-wider text-text-muted block mb-2.5">
                      Color Palette Presets
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {Object.keys(PALETTE_PRESETS).map((presetName) => {
                        const preset = PALETTE_PRESETS[presetName];
                        const isSelected = selectedPreset === presetName;
                        return (
                          <button
                            key={presetName}
                            type="button"
                            onClick={() => handlePresetSelect(presetName)}
                            className={`flex items-center justify-between p-3 rounded-xl border text-left transition-all cursor-pointer ${
                              isSelected
                                ? "border-primary-action bg-primary-light shadow-xs"
                                : "border-border-main bg-surface hover:bg-surface-dim"
                            }`}
                          >
                            <div className="space-y-1">
                              <span
                                className={`text-xs font-bold block ${
                                  isSelected ? "text-primary-action" : "text-text-main"
                                }`}
                              >
                                {presetName}
                              </span>
                              <div className="flex items-center gap-1.5">
                                <span
                                  className="w-3.5 h-3.5 rounded-full border border-black/10 shadow-2xs"
                                  style={{ backgroundColor: preset.primaryAction }}
                                />
                                <span
                                  className="w-3.5 h-3.5 rounded-full border border-black/10 shadow-2xs"
                                  style={{ backgroundColor: preset.bestFit }}
                                />
                                <span
                                  className="w-3.5 h-3.5 rounded-full border border-black/10 shadow-2xs"
                                  style={{ backgroundColor: preset.crossCampus }}
                                />
                              </div>
                            </div>
                            {isSelected && (
                              <div className="w-5 h-5 rounded-full bg-primary-action text-white flex items-center justify-center">
                                <Check className="w-3 h-3 stroke-[3]" />
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Custom Primary Color Swatch */}
                  <div className="pt-2 border-t border-border-main">
                    <label className="text-xs font-black uppercase tracking-wider text-text-muted block mb-2">
                      Custom Primary Accent
                    </label>
                    <div className="flex items-center gap-3">
                      <input
                        type="color"
                        value={customPrimaryColor}
                        onChange={(e) => handleCustomColorChange(e.target.value)}
                        className="w-10 h-10 rounded-xl border border-border-main cursor-pointer p-0.5 bg-surface"
                      />
                      <div className="text-xs text-text-muted">
                        <span className="font-mono font-bold text-text-main block uppercase">
                          {customPrimaryColor}
                        </span>
                        <span>Fine-tune the brand primary tone.</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: NOTIFICATIONS */}
              {activeTab === "notifications" && (
                <div className="space-y-4">
                  {[
                    {
                      id: "emailNotifications",
                      title: "Master Email Alerts",
                      desc: "Receive email communications from SquadUp.",
                      state: emailNotifications,
                      setter: setEmailNotifications,
                      icon: Mail,
                    },
                    {
                      id: "teamInvitesNotification",
                      title: "Squad Invites",
                      desc: "Get notified when a team captain invites you to join their squad.",
                      state: teamInvitesNotification,
                      setter: setTeamInvitesNotification,
                      icon: Users,
                    },
                    {
                      id: "applicationUpdates",
                      title: "Application Updates",
                      desc: "Receive alerts when squads accept or review your join application.",
                      state: applicationUpdates,
                      setter: setApplicationUpdates,
                      icon: Sparkles,
                    },
                    {
                      id: "eventNotifications",
                      title: "Campus Events & Hackathons",
                      desc: "Get real-time alerts when new events or project fairs are hosted on your campus.",
                      state: eventNotifications,
                      setter: setEventNotifications,
                      icon: Calendar,
                    },
                    {
                      id: "marketingEmails",
                      title: "Hackathon & Product Digests",
                      desc: "Periodic digests with upcoming campus hackathons and product features.",
                      state: marketingEmails,
                      setter: setMarketingEmails,
                      icon: Bell,
                    },
                  ].map((item) => {
                    const Icon = item.icon;
                    return (
                      <div
                        key={item.id}
                        className="flex items-center justify-between p-3.5 rounded-xl border border-border-main bg-surface hover:bg-surface-dim/50 transition-colors"
                      >
                        <div className="flex items-start gap-3">
                          <div className="p-2 rounded-lg bg-surface-dim text-text-muted mt-0.5">
                            <Icon className="w-4 h-4" />
                          </div>
                          <div>
                            <span className="text-xs font-bold text-text-main block">
                              {item.title}
                            </span>
                            <span className="text-[11px] text-text-muted leading-tight block">
                              {item.desc}
                            </span>
                          </div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer ml-3 shrink-0">
                          <input
                            type="checkbox"
                            checked={item.state}
                            onChange={(e) => item.setter(e.target.checked)}
                            className="sr-only peer"
                          />
                          <div className="w-9 h-5 bg-surface-dim border border-border-main peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-text-main after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary-action peer-checked:border-primary-action peer-checked:after:bg-white"></div>
                        </label>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* TAB 3: SQUADS & MATCHING */}
              {activeTab === "matching" && (
                <div className="space-y-5">
                  <div className="flex items-center justify-between p-3.5 rounded-xl border border-border-main bg-surface">
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-surface-dim text-text-muted mt-0.5">
                        <School className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-xs font-bold text-text-main block">
                          Default Campus-Only Filter
                        </span>
                        <span className="text-[11px] text-text-muted leading-tight block">
                          Pre-filter team directory results to squads matching your university.
                        </span>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer ml-3 shrink-0">
                      <input
                        type="checkbox"
                        checked={defaultCampusOnly}
                        onChange={(e) => setDefaultCampusOnly(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-surface-dim border border-border-main peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-text-main after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary-action peer-checked:border-primary-action peer-checked:after:bg-white"></div>
                    </label>
                  </div>

                  <div className="flex items-center justify-between p-3.5 rounded-xl border border-border-main bg-surface">
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-surface-dim text-text-muted mt-0.5">
                        <Users className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-xs font-bold text-text-main block">
                          Open to Collaboration Status
                        </span>
                        <span className="text-[11px] text-text-muted leading-tight block">
                          Display a badge on your profile showing recruiters you are looking for teams.
                        </span>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer ml-3 shrink-0">
                      <input
                        type="checkbox"
                        checked={openToCollaboration}
                        onChange={(e) => setOpenToCollaboration(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-surface-dim border border-border-main peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-text-main after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary-action peer-checked:border-primary-action peer-checked:after:bg-white"></div>
                    </label>
                  </div>

                  {/* Preferred Roles Tag Picker */}
                  <div className="pt-2">
                    <label className="text-xs font-black uppercase tracking-wider text-text-muted block mb-2">
                      Preferred Squad Roles
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {ROLE_OPTIONS.map((role) => {
                        const isSelected = preferredRoles.includes(role);
                        return (
                          <button
                            key={role}
                            type="button"
                            onClick={() => toggleRole(role)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer flex items-center gap-1.5 ${
                              isSelected
                                ? "border-primary-action bg-primary-light text-primary-action"
                                : "border-border-main bg-surface text-text-muted hover:border-primary-action hover:text-text-main"
                            }`}
                          >
                            <span>{role}</span>
                            {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 border-t border-border-main bg-surface-dim/40 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold text-text-muted hover:text-text-main hover:bg-surface-dim transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || loading}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-primary-action hover:bg-primary-hover shadow-xs transition-all disabled:opacity-50 cursor-pointer"
          >
            {saving ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <Save className="w-3.5 h-3.5" />
                <span>Save Preferences</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
