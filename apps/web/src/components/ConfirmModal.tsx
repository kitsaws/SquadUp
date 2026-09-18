import React, { useEffect } from "react";
import { AlertTriangle, Trash2, LogOut, UserMinus, X, Loader2 } from "lucide-react";

export interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  description: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  variant?: "danger" | "warning" | "primary";
  iconType?: "leave" | "remove" | "delete" | "warning";
  isLoading?: boolean;
  onConfirm: () => Promise<void> | void;
  onClose: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title,
  description,
  confirmText = "Confirm",
  cancelText = "Cancel",
  variant = "danger",
  iconType = "warning",
  isLoading = false,
  onConfirm,
  onClose,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen && !isLoading) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isLoading, onClose]);

  if (!isOpen) return null;

  const renderIcon = () => {
    switch (iconType) {
      case "leave":
        return <LogOut className="w-5 h-5 text-rose-500" />;
      case "remove":
        return <UserMinus className="w-5 h-5 text-rose-500" />;
      case "delete":
        return <Trash2 className="w-5 h-5 text-rose-500" />;
      case "warning":
      default:
        return <AlertTriangle className={`w-5 h-5 ${variant === "danger" ? "text-rose-500" : "text-amber-500"}`} />;
    }
  };

  const getButtonStyles = () => {
    if (variant === "danger") {
      return "bg-rose-600 hover:bg-rose-700 text-white shadow-xs focus:ring-rose-500/30";
    }
    if (variant === "warning") {
      return "bg-amber-600 hover:bg-amber-700 text-white shadow-xs focus:ring-amber-500/30";
    }
    return "bg-primary-action hover:bg-primary-hover text-white shadow-xs focus:ring-primary-action/30";
  };

  const getIconBg = () => {
    if (variant === "danger" || iconType === "leave" || iconType === "remove" || iconType === "delete") {
      return "bg-rose-500/10 border-rose-500/20";
    }
    if (variant === "warning") {
      return "bg-amber-500/10 border-amber-500/20";
    }
    return "bg-primary-light border-primary-action/20";
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isLoading) {
          onClose();
        }
      }}
    >
      <div
        className="relative w-full max-w-md bg-surface border border-border-main rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150"
        role="dialog"
        aria-modal="true"
      >
        {/* Header decoration */}
        <div className="p-6 pb-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${getIconBg()}`}
              >
                {renderIcon()}
              </div>
              <div>
                <h3 className="text-base font-bold text-text-main leading-snug">{title}</h3>
              </div>
            </div>
            <button
              onClick={onClose}
              disabled={isLoading}
              className="text-text-muted hover:text-text-main p-1.5 rounded-lg hover:bg-surface-dim transition-colors cursor-pointer disabled:opacity-50"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="mt-3 text-sm text-text-muted leading-relaxed">
            {description}
          </div>
        </div>

        {/* Footer actions */}
        <div className="p-4 px-6 bg-surface-dim/40 border-t border-border-main flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 rounded-xl border border-border-main bg-surface hover:bg-surface-dim text-text-main text-xs font-semibold transition-all cursor-pointer disabled:opacity-50"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer disabled:opacity-50 focus:ring-2 ${getButtonStyles()}`}
          >
            {isLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            <span>{confirmText}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
