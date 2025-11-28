export type TournamentStatus =
  | 'draft'
  | 'registration'
  | 'active'
  | 'paused'
  | 'completed'
  | 'cancelled';

export const TOURNAMENT_STATUS_COLORS: Record<
  TournamentStatus,
  { bg: string; text: string; border: string }
> = {
  draft: { bg: 'bg-gray-100', text: 'text-gray-800', border: 'border-gray-200' },
  registration: { bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-200' },
  active: { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-200' },
  paused: { bg: 'bg-yellow-100', text: 'text-yellow-800', border: 'border-yellow-200' },
  completed: { bg: 'bg-purple-100', text: 'text-purple-800', border: 'border-purple-200' },
  cancelled: { bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-200' },
};

export type TournamentFormat =
  | 'single_elimination'
  | 'double_elimination'
  | 'round_robin'
  | 'modified_single'
  | 'chip_format';

export const FORMAT_BADGES: Record<TournamentFormat, string> = {
  single_elimination: 'Single Elim',
  double_elimination: 'Double Elim',
  round_robin: 'Round Robin',
  modified_single: 'Modified Single',
  chip_format: 'Chip Format',
};
