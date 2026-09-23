import React from "react";
import { Sliders, Image as ImageIcon, Loader2, Check } from "lucide-react";
import { GRADIENT_PRESETS } from "./edit-profile.types";

interface BannerCustomizerProps {
  fullName: string;
  bannerType: "gradient" | "image" | "default";
  setBannerType: (type: "gradient" | "image" | "default") => void;
  gradientColor1: string;
  setGradientColor1: (color: string) => void;
  gradientColor2: string;
  setGradientColor2: (color: string) => void;
  gradientAngle: number;
  setGradientAngle: (angle: number) => void;
  bannerImageDataUrl: string;
  setBannerImageDataUrl: (url: string) => void;
  syncThemeWithBanner: boolean;
  setSyncThemeWithBanner: (sync: boolean) => void;
  isSavingBanner: boolean;
  bannerImageInputRef: React.RefObject<HTMLInputElement | null>;
  handleBannerImageSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleSaveBanner: () => void;
  onCancel: () => void;
  initialView?: "choose" | "manual" | "banner";
}

export function BannerCustomizer({
  fullName,
  bannerType,
  setBannerType,
  gradientColor1,
  setGradientColor1,
  gradientColor2,
  setGradientColor2,
  gradientAngle,
  setGradientAngle,
  bannerImageDataUrl,
  setBannerImageDataUrl,
  syncThemeWithBanner,
  setSyncThemeWithBanner,
  isSavingBanner,
  bannerImageInputRef,
  handleBannerImageSelect,
  handleSaveBanner,
  onCancel,
  initialView,
}: BannerCustomizerProps) {
  const liveBannerStyle: React.CSSProperties =
    bannerType === "image" && bannerImageDataUrl
      ? {
          backgroundImage: `url(${bannerImageDataUrl})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }
      : bannerType === "gradient"
      ? {
          background: `linear-gradient(${gradientAngle}deg, ${gradientColor1}, ${gradientColor2})`,
        }
      : {
          background: "linear-gradient(to right, #0f172a, #172554, #1e1b4b)",
        };

  return (
    <div className="space-y-5">
      {/* Live Preview */}
      <div className="space-y-1.5">
        <span className="text-[11px] font-bold text-text-muted uppercase tracking-wider block">
          Live Banner Preview
        </span>
        <div
          style={liveBannerStyle}
          className="h-28 w-full rounded-xl border border-border-main shadow-inner relative overflow-hidden transition-all duration-300 flex items-end p-3"
        >
          <div className="bg-black/40 backdrop-blur-md px-2.5 py-1 rounded-lg text-white text-[11px] font-semibold flex items-center gap-1.5 border border-white/15">
            <span>{fullName || "Student Profile"}</span>
          </div>
        </div>
      </div>

      {/* Mode Selector: Gradient vs Image */}
      <div className="grid grid-cols-2 gap-2 p-1 bg-surface-dim rounded-xl">
        <button
          type="button"
          onClick={() => setBannerType("gradient")}
          className={`py-1.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            bannerType === "gradient"
              ? "bg-surface text-text-main shadow-2xs"
              : "text-text-muted hover:text-text-main"
          }`}
        >
          <Sliders className="w-3.5 h-3.5" /> Gradient Designer
        </button>
        <button
          type="button"
          onClick={() => setBannerType("image")}
          className={`py-1.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            bannerType === "image"
              ? "bg-surface text-text-main shadow-2xs"
              : "text-text-muted hover:text-text-main"
          }`}
        >
          <ImageIcon className="w-3.5 h-3.5" /> Upload Image
        </button>
      </div>

      {/* Option A: Gradient Controls */}
      {bannerType === "gradient" && (
        <div className="space-y-4">
          {/* Preset Gradient Chips */}
          <div className="space-y-1.5">
            <span className="text-[11px] font-bold text-text-muted uppercase tracking-wider block">
              Curated Designer Presets
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {GRADIENT_PRESETS.map((p, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => {
                    setGradientColor1(p.color1);
                    setGradientColor2(p.color2);
                    setGradientAngle(p.angle);
                  }}
                  className="px-2.5 py-1.5 rounded-lg border border-border-main text-left text-[11px] font-semibold hover:border-primary-border transition-all flex items-center gap-2 cursor-pointer bg-surface"
                >
                  <span
                    className="w-3.5 h-3.5 rounded-full shrink-0 border border-black/10"
                    style={{
                      background: `linear-gradient(${p.angle}deg, ${p.color1}, ${p.color2})`,
                    }}
                  />
                  <span className="truncate text-text-main">{p.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Gradient Sliders / Pickers */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-text-muted block">
                Start Color
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={gradientColor1}
                  onChange={(e) => setGradientColor1(e.target.value)}
                  className="w-8 h-8 rounded-lg border border-border-main cursor-pointer p-0.5 bg-surface"
                />
                <input
                  type="text"
                  value={gradientColor1}
                  onChange={(e) => setGradientColor1(e.target.value)}
                  className="flex-1 px-2 py-1 text-xs rounded-lg border border-border-main bg-surface text-text-main font-mono"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-text-muted block">
                End Color
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={gradientColor2}
                  onChange={(e) => setGradientColor2(e.target.value)}
                  className="w-8 h-8 rounded-lg border border-border-main cursor-pointer p-0.5 bg-surface"
                />
                <input
                  type="text"
                  value={gradientColor2}
                  onChange={(e) => setGradientColor2(e.target.value)}
                  className="flex-1 px-2 py-1 text-xs rounded-lg border border-border-main bg-surface text-text-main font-mono"
                />
              </div>
            </div>
          </div>

          {/* Angle Slider */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[11px] font-bold text-text-muted">
              <span>Gradient Angle</span>
              <span>{gradientAngle}°</span>
            </div>
            <input
              type="range"
              min={0}
              max={360}
              value={gradientAngle}
              onChange={(e) => setGradientAngle(Number(e.target.value))}
              className="w-full h-1.5 bg-surface-dim rounded-lg appearance-none cursor-pointer accent-primary-action"
            />
          </div>
        </div>
      )}

      {/* Option B: Image Upload Controls */}
      {bannerType === "image" && (
        <div className="space-y-3">
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            ref={bannerImageInputRef}
            onChange={handleBannerImageSelect}
            className="hidden"
          />

          <div
            onClick={() => bannerImageInputRef.current?.click()}
            className="border-2 border-dashed border-border-main hover:border-primary-border rounded-xl p-6 text-center cursor-pointer transition-colors bg-surface"
          >
            <ImageIcon className="w-8 h-8 text-text-muted mx-auto mb-1.5" />
            <p className="text-xs font-semibold text-text-main">
              Click to choose banner photo
            </p>
            <p className="text-[10px] text-text-muted mt-0.5">
              Recommended: 1200x300px • Max size: 2MB (JPG, PNG, WebP)
            </p>
          </div>

          {bannerImageDataUrl && (
            <div className="flex items-center justify-between p-2 rounded-lg bg-surface border border-border-main text-xs">
              <span className="text-text-main font-medium truncate max-w-xs">
                Custom Image Loaded
              </span>
              <button
                type="button"
                onClick={() => setBannerImageDataUrl("")}
                className="text-rose-600 hover:text-rose-700 font-bold cursor-pointer text-[11px]"
              >
                Clear Image
              </button>
            </div>
          )}
        </div>
      )}

      {/* Dynamic Theme Color Sync Toggle */}
      <div className="p-3.5 rounded-xl border border-border-main bg-surface space-y-1 shadow-2xs">
        <label className="flex items-start gap-2.5 cursor-pointer">
          <input
            type="checkbox"
            checked={syncThemeWithBanner}
            onChange={(e) => setSyncThemeWithBanner(e.target.checked)}
            className="mt-0.5 w-4 h-4 rounded text-primary-action border-border-main focus:ring-primary-action cursor-pointer"
          />
          <div>
            <span className="text-xs font-bold text-text-main block">
              Set workspace primary color to match banner (one-off update)
            </span>
            <span className="text-[11px] text-text-muted leading-snug block">
              Updates your primary accent color once to harmonize with this banner without altering other theme preferences.
            </span>
          </div>
        </label>
      </div>

      {/* Action Buttons */}
      <div className="pt-3 border-t border-border-main flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-xs font-bold text-text-muted hover:bg-surface-dim rounded-xl transition-colors cursor-pointer"
        >
          {initialView === "banner" ? "Cancel" : "Back"}
        </button>
        <button
          type="button"
          onClick={handleSaveBanner}
          disabled={isSavingBanner}
          className="inline-flex items-center gap-1.5 px-5 py-2 bg-primary-action hover:bg-primary-hover text-white text-xs font-bold rounded-xl transition-colors shadow-xs disabled:opacity-50 cursor-pointer"
        >
          {isSavingBanner ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Saving...</span>
            </>
          ) : (
            <>
              <Check className="w-3.5 h-3.5" />
              <span>Apply Banner</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
