import React, { useState } from "react";
import {
  Sparkles,
  Users,
  Shield,
  Calendar,
  CheckCircle2,
  XCircle,
  Loader2,
  Layers,
  Award,
  ArrowRight,
  X,
} from "lucide-react";
import { TeamInviteItem } from "../services/api";
import { SkillTag } from "./Badges";

interface TeamInviteModalProps {
  isOpen: boolean;
  invite: TeamInviteItem | null;
  teamName: string;
  eventTitle?: string;
  university?: string;
  onClose: () => void;
  onAccept: (inviteId: string) => Promise<void>;
  onDecline: (inviteId: string) => Promise<void>;
}

export const TeamInviteModal: React.FC<TeamInviteModalProps> = ({
  isOpen,
  invite,
  teamName,
  eventTitle,
  university,
  onClose,
  onAccept,
  onDecline,
}) => {
  const [isAccepting, setIsAccepting] = useState(false);
  const [isDeclining, setIsDeclining] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !invite) return null;

  const roleTitle = invite.roleTitle || "Squad Contributor";
  const roleSkills = invite.roleSkills || invite.requirements || [];
  const senderName = invite.senderName || "The squad captain";

  const handleAcceptClick = async () => {
    setIsAccepting(true);
    setError(null);
    try {
      await onAccept(invite.id);
    } catch (err: any) {
      setError(err.message || "Failed to accept invitation. Please try again.");
      setIsAccepting(false);
    }
  };

  const handleDeclineClick = async () => {
    setIsDeclining(true);
    setError(null);
    try {
      await onDecline(invite.id);
    } catch (err: any) {
      setError(err.message || "Failed to decline invitation.");
      setIsDeclining(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-surface rounded-2xl border border-border-main shadow-2xl overflow-hidden flex flex-col">
        {/* Modal Top Accent Header */}
        <div className="px-6 py-5 border-b border-border-main flex items-center justify-between bg-surface-dim/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary-light text-primary-action border border-primary-border flex items-center justify-center font-bold shadow-2xs">
              <Sparkles className="w-5 h-5 text-primary-action animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-text-main font-heading">
                  Official Squad Invitation
                </h3>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                  Pending Your Decision
                </span>
              </div>
              <p className="text-xs text-text-muted">
                You've been designated for a position in this squad.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-text-muted hover:text-text-main rounded-lg hover:bg-surface-dim transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5">
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-500 font-medium">
              {error}
            </div>
          )}

          {/* Invitation Context Card */}
          <div className="p-4 rounded-xl border border-border-main bg-surface-dim/40 space-y-2">
            <div className="flex items-center justify-between text-xs text-text-muted">
              <span className="flex items-center gap-1 font-medium">
                <Users className="w-3.5 h-3.5 text-primary-action" />
                Invited by <strong className="text-text-main font-semibold ml-1">{senderName}</strong>
              </span>
              {university && (
                <span className="flex items-center gap-1">
                  <Shield className="w-3 h-3 text-primary-action" />
                  {university}
                </span>
              )}
            </div>

            <div className="pt-2 border-t border-border-main/60 flex items-center justify-between">
              <div>
                <span className="text-[11px] uppercase tracking-wider font-bold text-text-muted block">
                  Target Squad
                </span>
                <span className="text-base font-black text-text-main font-heading">
                  {teamName}
                </span>
              </div>
              {eventTitle && (
                <div className="text-right">
                  <span className="text-[11px] uppercase tracking-wider font-bold text-text-muted block">
                    Event
                  </span>
                  <span className="text-xs font-bold text-primary-action bg-primary-light border border-primary-border px-2 py-0.5 rounded-md inline-block">
                    {eventTitle}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Designated Role & Required Technologies Card */}
          <div className="p-4.5 rounded-xl border-2 border-primary-action/30 bg-primary-action/5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-primary-action text-white">
                  <Layers className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-primary-action block">
                    Designated Role
                  </span>
                  <h4 className="text-sm font-extrabold text-text-main font-heading">
                    {roleTitle}
                  </h4>
                </div>
              </div>
              <span className="text-[11px] font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                1 Open Position
              </span>
            </div>

            {roleSkills.length > 0 && (
              <div className="space-y-1.5 pt-2 border-t border-primary-border/40">
                <span className="text-[11px] font-bold uppercase tracking-wider text-text-muted block">
                  Required Technologies & Skills
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {roleSkills.map((skill, i) => (
                    <SkillTag
                      key={i}
                      skill={skill}
                      matchType="perfect"
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          <p className="text-[11px] text-text-muted text-center leading-relaxed">
            Accepting this invitation will immediately add you to the squad roster under the{" "}
            <strong className="text-text-main font-semibold">{roleTitle}</strong> role.
          </p>
        </div>

        {/* Action Footer */}
        <div className="p-6 border-t border-border-main bg-surface-dim/30 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={handleDeclineClick}
            disabled={isDeclining || isAccepting}
            className="px-4 py-2.5 rounded-xl border border-border-main bg-surface hover:bg-surface-dim text-text-muted hover:text-text-main text-xs font-bold transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
          >
            {isDeclining ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Declining...</span>
              </>
            ) : (
              <>
                <XCircle className="w-3.5 h-3.5 text-rose-500" />
                <span>Decline</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleAcceptClick}
            disabled={isAccepting || isDeclining}
            className="px-5 py-2.5 rounded-xl bg-primary-action hover:bg-primary-hover text-white text-xs font-bold transition-all shadow-md hover:shadow-lg cursor-pointer disabled:opacity-50 flex items-center gap-2"
          >
            {isAccepting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Joining Squad...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>Accept & Join Squad</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
