import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface TeamsPaginationProps {
  page: number;
  totalPages: number;
  totalCount: number;
  onPageChange: (newPage: number) => void;
}

export function TeamsPagination({
  page,
  totalPages,
  totalCount,
  onPageChange,
}: TeamsPaginationProps) {
  if (totalPages <= 1) return null;

  return (
    <div className="pt-8 flex items-center justify-between border-t border-border-main mt-6">
      <span className="text-xs text-text-muted">
        Page {page} of {totalPages} ({totalCount} squads)
      </span>

      <div className="flex items-center gap-2">
        <button
          onClick={() => onPageChange(Math.max(1, page - 1))}
          disabled={page <= 1}
          className="p-2 rounded-xl border border-border-main bg-surface hover:bg-surface-dim disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
        >
          <ChevronLeft className="w-4 h-4 text-text-main" />
        </button>
        <span className="text-xs font-bold text-text-main px-2">
          {page} / {totalPages}
        </span>
        <button
          onClick={() => onPageChange(Math.min(totalPages, page + 1))}
          disabled={page >= totalPages}
          className="p-2 rounded-xl border border-border-main bg-surface hover:bg-surface-dim disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
        >
          <ChevronRight className="w-4 h-4 text-text-main" />
        </button>
      </div>
    </div>
  );
}
