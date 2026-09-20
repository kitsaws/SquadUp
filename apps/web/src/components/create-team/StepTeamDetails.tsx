import React from "react";
import { Sparkles, Layers, Check } from "lucide-react";
import { PRESET_TEMPLATES } from "./create-team.types";

interface StepTeamDetailsProps {
  teamName: string;
  setTeamName: (name: string) => void;
  selectedPreset: string;
  handleApplyPreset: (presetId: string) => void;
}

export function StepTeamDetails({
  teamName,
  setTeamName,
  selectedPreset,
  handleApplyPreset,
}: StepTeamDetailsProps) {
  return (
    <>
      {/* Squad Name */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-black uppercase tracking-wider text-text-main flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-primary-action" />
            <span>Squad / Team Name</span>
          </label>
          <span className="text-[10px] text-text-muted font-medium">
            {teamName.length}/50
          </span>
        </div>

        <input
          type="text"
          placeholder="e.g. NeuralSync AI Agents, CloudZero Hackers, FinTech Pioneer"
          maxLength={50}
          value={teamName}
          onChange={(e) => setTeamName(e.target.value)}
          className="w-full px-4 py-2.5 text-xs sm:text-sm bg-surface-dim rounded-2xl border border-border-main text-text-main placeholder:text-text-muted focus:outline-hidden focus:ring-2 focus:ring-primary-action transition-all"
          required
        />
      </div>

      {/* Squad Presets / Architecture Templates */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <label className="text-xs font-black uppercase tracking-wider text-text-main flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-primary-action" />
            <span>Squad Preset Templates</span>
          </label>
          <span className="text-[10px] text-text-muted">1-Click Auto Fill</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {PRESET_TEMPLATES.map((preset) => {
            const IconComponent = preset.icon;
            const isSelected = selectedPreset === preset.id;

            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => handleApplyPreset(preset.id)}
                className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-2 ${
                  isSelected
                    ? "bg-primary-light border-primary-border ring-2 ring-primary-action/20 text-primary-action"
                    : "bg-surface hover:bg-surface-dim border-border-main text-text-main"
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <div
                    className={`p-1.5 rounded-lg ${
                      isSelected
                        ? "bg-primary-action text-white"
                        : "bg-surface-dim text-text-muted"
                    }`}
                  >
                    <IconComponent className="w-3.5 h-3.5" />
                  </div>
                  {isSelected && <Check className="w-3.5 h-3.5 text-primary-action" />}
                </div>

                <div>
                  <span className="text-xs font-bold block truncate font-heading">
                    {preset.name}
                  </span>
                  <span className="text-[10px] text-text-muted block truncate mt-0.5">
                    {preset.roles.length} Roles
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}
