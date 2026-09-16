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
} from "lucide-react";
import { toast } from "react-toastify";
import { usePalette, PALETTE_PRESETS } from "../contexts/PaletteContext";
import {
  preferencesApi,
  UserPreferences,
  UpdateUserPreferencesRequest,
} from "../services/api";

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
  const { palette, updateToken, loadPreset } = usePalette();

  const [activeTab, setActiveTab] = useState<TabType>("theme");
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);

  // Form states
  const [themeMode, setThemeMode] = useState<"light" | "dark" | "system">("system");
  const [selectedPreset, setSelectedPreset] = useState<string>("SquadUp 2.0 Default");
  const [customPrimaryColor, setCustomPrimaryColor] = useState<string>("#2563eb");
  const [syncThemeWithBanner, setSyncThemeWithBanner] = useState<boolean>(true);

  const [emailNotifications, setEmailNotifications] = useState<boolean>(true);
  const [teamInvitesNotification, setTeamInvitesNotification] = useState<boolean>(true);
  const [applicationUpdates, setApplicationUpdates] = useState<boolean>(true);
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
        setThemeMode(prefs.themeMode || "system");
        setSelectedPreset(prefs.palettePreset || "SquadUp 2.0 Default");
        if (prefs.primaryColor) {
          setCustomPrimaryColor(prefs.primaryColor);
        } else {
          setCustomPrimaryColor(palette.primaryAction);
        }
        setSyncThemeWithBanner(prefs.bannerConfig?.syncTheme ?? true);

        setEmailNotifications(prefs.emailNotifications ?? true);
        setTeamInvitesNotification(prefs.teamInvitesNotification ?? true);
        setApplicationUpdates(prefs.applicationUpdates ?? true);
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
    loadPreset(presetName);
    if (PALETTE_PRESETS[presetName]) {
      setCustomPrimaryColor(PALETTE_PRESETS[presetName].primaryAction);
    }
  };

  const handleCustomColorChange = (hex: string) => {
    setCustomPrimaryColor(hex);
    setSelectedPreset("Custom");
    updateToken("primaryAction", hex);
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
      marketingEmails,
      defaultCampusOnly,
      openToCollaboration,
      preferredRoles,
    };

    try {
      const updated = await preferencesApi.updatePreferences(updates);
      toast.success("Preferences saved successfully!", { position: "bottom-right" });
      if (onPreferencesUpdated) {
        onPreferencesUpdated(updated);
      }
      onClose();
    } catch (err) {
      console.error("[UserPreferencesModal] Failed to save:", err);
      toast.error("Failed to save preferences. Please try again.", { position: "bottom-right" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-surface w-full max-w-2xl rounded-2xl border border-border-main shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-border-main flex items-center justify-between bg-surface-dim/40">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-primary-light text-primary-action border border-primary-border">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-text-main font-heading">
                User Preferences
              </h2>
              <p className="text-xs text-text-muted">
                Customize your theme appearance, notifications, and default squad options.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-text-muted hover:text-text-main hover:bg-surface-dim transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Section Tabs */}
        <div className="flex border-b border-border-main px-6 bg-surface">
          <button
            onClick={() => setActiveTab("theme")}
            className={`flex items-center gap-2 py-3 px-3 text-xs font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === "theme"
                ? "border-primary-action text-primary-action"
                : "border-transparent text-text-muted hover:text-text-main"
            }`}
          >
            <Palette className="w-4 h-4" />
            <span>Theme & Appearance</span>
          </button>
          <button
            onClick={() => setActiveTab("notifications")}
            className={`flex items-center gap-2 py-3 px-3 text-xs font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === "notifications"
                ? "border-primary-action text-primary-action"
                : "border-transparent text-text-muted hover:text-text-main"
            }`}
          >
            <Bell className="w-4 h-4" />
            <span>Notifications</span>
          </button>
          <button
            onClick={() => setActiveTab("matching")}
            className={`flex items-center gap-2 py-3 px-3 text-xs font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === "matching"
                ? "border-primary-action text-primary-action"
                : "border-transparent text-text-muted hover:text-text-main"
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Squads & Matching</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {loading ? (
            <div className="py-16 flex flex-col items-center justify-center gap-3">
              <Loader2 className="w-8 h-8 text-primary-action animate-spin" />
              <p className="text-xs font-semibold text-text-muted">Loading preferences...</p>
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
                            onClick={() => setThemeMode(mode.id as any)}
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
                        className="w-10 h-10 rounded-xl cursor-pointer border border-border-main p-0.5 bg-surface"
                      />
                      <div className="space-y-0.5">
                        <span className="text-xs font-mono font-bold text-text-main">
                          {customPrimaryColor.toUpperCase()}
                        </span>
                        <p className="text-[11px] text-text-muted">
                          Fine-tune the brand action color to your exact choice.
                        </p>
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
                          <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary-action"></div>
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
                      <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary-action"></div>
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
                      <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary-action"></div>
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
                                : "border-border-main bg-surface text-text-muted hover:border-slate-300 hover:text-text-main"
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
