export interface BannerConfig {
  type: "gradient" | "image" | "default";
  gradient?: {
    color1: string;
    color2: string;
    angle: number;
  };
  imageUrl?: string;
  syncTheme?: boolean;
}

export interface UserPreferences {
  id: string;
  userId: string;

  // 1. Theme & Appearance
  themeMode: "light" | "dark" | "system";
  palettePreset: string;
  primaryColor?: string | null;
  bannerConfig?: BannerConfig | null;

  // 2. Notification Settings
  emailNotifications: boolean;
  teamInvitesNotification: boolean;
  applicationUpdates: boolean;
  eventNotifications?: boolean;
  marketingEmails: boolean;

  // 3. Default Options & Matching Preferences
  defaultCampusOnly: boolean;
  openToCollaboration: boolean;
  preferredRoles: string[];

  createdAt: string;
  updatedAt: string;
}

export type UpdateUserPreferencesRequest = Partial<
  Omit<UserPreferences, "id" | "userId" | "createdAt" | "updatedAt">
>;
