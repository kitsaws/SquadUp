import { UserProfileResponse } from "../../services/api";

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

export interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: UserProfileResponse;
  onProfileUpdated: (updatedProfile: UserProfileResponse) => void;
  currentBanner?: BannerConfig;
  onBannerUpdated?: (banner: BannerConfig) => void;
  initialView?: "choose" | "manual" | "banner";
}

export const GRADIENT_PRESETS = [
  { name: "Midnight Collegiate", color1: "#0f172a", color2: "#1e3a8a", angle: 135 },
  { name: "Electric Indigo", color1: "#1e1b4b", color2: "#4f46e5", angle: 110 },
  { name: "Cyber Violet", color1: "#311042", color2: "#7c3aed", angle: 120 },
  { name: "Sunset Blaze", color1: "#831843", color2: "#ec4899", angle: 90 },
  { name: "Emerald Focus", color1: "#064e3b", color2: "#059669", angle: 140 },
  { name: "Crimson Ember", color1: "#450a0a", color2: "#dc2626", angle: 135 },
];
