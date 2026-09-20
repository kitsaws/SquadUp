import React from "react";
import { Users } from "lucide-react";
import {
  CandidateApplicationTile,
  CandidateApplicationData,
} from "../CandidateApplicationTile";

interface TeamApplicationsSectionProps {
  applications: CandidateApplicationData[];
  isUserLeader: boolean;
  onAccept?: (applicationId: string, candidateName?: string) => void;
  onDecline?: (applicationId: string, candidateName?: string) => void;
}

export function TeamApplicationsSection({
  applications,
  isUserLeader,
  onAccept,
  onDecline,
}: TeamApplicationsSectionProps) {
  return (
    <div className="bg-surface rounded-2xl border border-border-main p-6 sm:p-8 shadow-xs space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-black text-text-main font-heading">
            Incoming Applications & Candidate Review
          </h2>
          <p className="text-xs text-text-muted">
            Tiles are collapsed by default. Click any candidate to view their note, verified skills, and direct profile link.
          </p>
        </div>

        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-surface-dim text-text-muted border border-border-main self-start sm:self-auto shrink-0">
          {applications.length} Candidates
        </span>
      </div>

      {applications.length > 0 ? (
        <div className="space-y-3">
          {applications.map((app) => (
            <CandidateApplicationTile
              key={app.id}
              application={app}
              defaultExpanded={false}
              onAccept={isUserLeader ? onAccept : undefined}
              onDecline={isUserLeader ? onDecline : undefined}
            />
          ))}
        </div>
      ) : (
        <div className="bg-surface-dim rounded-xl border border-border-main p-8 text-center space-y-2">
          <Users className="w-8 h-8 text-text-muted mx-auto opacity-50" />
          <p className="text-sm font-bold text-text-main">No applications received yet</p>
          <p className="text-xs text-text-muted">Candidates applying to your squad will appear here with live skill compatibility scores.</p>
        </div>
      )}
    </div>
  );
}
