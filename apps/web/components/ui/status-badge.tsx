import { TOURNAMENT_STATUS_COLORS, type TournamentStatus } from '@tournament/ui-config';
import { cn } from '@/lib/utils';

interface StatusBadgeProps {
  status: TournamentStatus;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const colors = TOURNAMENT_STATUS_COLORS[status] || TOURNAMENT_STATUS_COLORS.draft;

  return (
    <span
      className={cn(
        'px-3 py-1 rounded-full text-xs font-semibold capitalize border',
        colors.bg,
        colors.text,
        colors.border,
        className
      )}
    >
      {status}
    </span>
  );
}
