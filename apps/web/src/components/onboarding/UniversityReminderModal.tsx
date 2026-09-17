import React from "react";
import { AlertTriangle, Building2, Globe, ShieldAlert, ArrowRight, X } from "lucide-react";
import { OrganizationItem } from "../../services/api";

interface UniversityReminderModalProps {
  isOpen: boolean;
  selectedUniversity: OrganizationItem | null;
  isIndependent: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export function UniversityReminderModal({
  isOpen,
  selectedUniversity,
  isIndependent,
  onClose,
  onConfirm,
}: UniversityReminderModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-surface rounded-2xl border border-border-main shadow-2xl max-w-lg w-full p-6 space-y-5 animate-in zoom-in-95 duration-150 relative">
        {/* Close icon button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-text-muted hover:text-text-main hover:bg-surface-dim transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {isIndependent ? (
          /* WARNING MODAL: Independent / No University */
          <>
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-600 flex items-center justify-center shadow-xs">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="space-y-2">
              <h3 className="text-xl font-bold text-text-main font-heading">
                Continuing as Independent Participant
              </h3>
              <p className="text-sm text-text-muted leading-relaxed">
                You are setting up your account without an institutional university affiliation.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-2 text-xs text-amber-600">
              <div className="flex items-center gap-1.5 font-bold text-amber-600">
                <ShieldAlert className="w-4 h-4 text-amber-500 shrink-0" />
                <span>Important Access Restriction</span>
              </div>
              <p className="leading-relaxed text-amber-600/90">
                You will only be eligible to join <strong>Global hackathons</strong> and open inter-university squads. You <strong>cannot apply to or form teams</strong> under campus-restricted events.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl border border-border-main text-xs font-semibold text-text-muted hover:text-text-main hover:bg-surface-dim transition-colors cursor-pointer"
              >
                Go Back & Select Campus
              </button>
              <button
                type="button"
                onClick={onConfirm}
                className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <span>I Understand, Continue</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </>
        ) : (
          /* REMINDER MODAL: Selected University Confirmation */
          <>
            <div className="w-12 h-12 rounded-2xl bg-primary-light border border-primary-border text-primary-action flex items-center justify-center shadow-xs">
              <Building2 className="w-6 h-6" />
            </div>

            <div className="space-y-1.5">
              <h3 className="text-xl font-bold text-text-main font-heading">
                Confirm Your Home Institution
              </h3>
              <p className="text-sm text-text-muted leading-relaxed">
                The university you select determines which campus-exclusive events and squads you can join. Make sure this is your correct educational institution!
              </p>
            </div>

            {/* University summary card */}
            {selectedUniversity && (
              <div className="p-4 rounded-xl bg-surface-dim border border-border-main flex items-center gap-3.5">
                {selectedUniversity.logoUrl ? (
                  <img
                    src={selectedUniversity.logoUrl}
                    alt={selectedUniversity.name}
                    className="w-11 h-11 rounded-xl object-contain bg-surface border border-border-main p-1 shrink-0 shadow-2xs"
                  />
                ) : (
                  <div className="w-11 h-11 rounded-xl bg-surface-dim text-text-main border border-border-main flex items-center justify-center font-bold text-sm shrink-0 font-heading shadow-2xs">
                    {selectedUniversity.name.charAt(0)}
                  </div>
                )}
                <div className="min-w-0">
                  <h4 className="text-sm font-bold text-text-main truncate font-heading">
                    {selectedUniversity.name}
                  </h4>
                  <div className="flex items-center gap-2 mt-0.5 text-xs text-text-muted">
                    {selectedUniversity.location && <span>{selectedUniversity.location}</span>}
                    {selectedUniversity.domain && (
                      <span className="px-1.5 py-0.2 rounded bg-surface text-text-main font-mono text-[10px] border border-border-main">
                        @{selectedUniversity.domain}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl border border-border-main text-xs font-semibold text-text-muted hover:text-text-main hover:bg-surface-dim transition-colors cursor-pointer"
              >
                Change University
              </button>
              <button
                type="button"
                onClick={onConfirm}
                className="px-5 py-2.5 rounded-xl bg-primary-action hover:bg-primary-hover text-white text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <span>Confirm & Proceed</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
