import React from "react";
import { LogOut } from "lucide-react";

interface SignOutConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export function SignOutConfirmModal({
  isOpen,
  onClose,
  onConfirm,
}: SignOutConfirmModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-surface rounded-2xl border border-border-main shadow-2xl p-6 w-full max-w-sm space-y-4 animate-in zoom-in-95 duration-150">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-500 border border-rose-500/20">
            <LogOut className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-black text-text-main font-heading">
              Confirm Sign Out
            </h3>
            <p className="text-xs text-text-muted">
              Are you sure you want to log out?
            </p>
          </div>
        </div>

        <p className="text-xs text-text-muted leading-relaxed">
          You will need to sign back in with your university or Clerk account to manage your squads and applications.
        </p>

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-border-main">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold text-text-muted hover:bg-surface-dim hover:text-text-main transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 shadow-xs transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Yes, Log Out</span>
          </button>
        </div>
      </div>
    </div>
  );
}
