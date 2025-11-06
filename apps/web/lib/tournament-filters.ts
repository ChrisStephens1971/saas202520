/**
 * Tournament Filtering and Search Utility
 * Sprint 8 - Advanced Features
 *
 * Provides filtering, sorting, and search functionality for tournaments
 */

export interface Tournament {
  id: string;
  name: string;
  format: string;
  status: 'draft' | 'active' | 'completed' | 'cancelled';
  startDate: string;
  endDate?: string;
  location?: string;
  description?: string;
  playerCount?: number;
  createdAt: string;
}

export interface TournamentFilters {
  searchQuery: string;
  status: string[];
  format: string[];
  dateRange: {
    start?: string;
    end?: string;
  };
  sortBy: 'name' | 'startDate' | 'createdAt' | 'playerCount';
  sortOrder: 'asc' | 'desc';
}

export const DEFAULT_FILTERS: TournamentFilters = {
  searchQuery: '',
  status: [],
  format: [],
  dateRange: {},
  sortBy: 'createdAt',
  sortOrder: 'desc',
};

/**
 * Filter tournaments based on search query
 */
function filterBySearch(tournaments: Tournament[], query: string): Tournament[] {
  if (!query.trim()) return tournaments;

  const lowerQuery = query.toLowerCase();
  return tournaments.filter(
    tournament =>
      tournament.name.toLowerCase().includes(lowerQuery) ||
      tournament.format.toLowerCase().includes(lowerQuery) ||
      tournament.location?.toLowerCase().includes(lowerQuery) ||
      tournament.description?.toLowerCase().includes(lowerQuery)
  );
}

/**
 * Filter tournaments by status
 */
function filterByStatus(tournaments: Tournament[], statuses: string[]): Tournament[] {
  if (statuses.length === 0) return tournaments;
  return tournaments.filter(tournament => statuses.includes(tournament.status));
}

/**
 * Filter tournaments by format
 */
function filterByFormat(tournaments: Tournament[], formats: string[]): Tournament[] {
  if (formats.length === 0) return tournaments;
  return tournaments.filter(tournament => formats.includes(tournament.format));
}

/**
 * Filter tournaments by date range
 */
function filterByDateRange(
  tournaments: Tournament[],
  dateRange: { start?: string; end?: string }
): Tournament[] {
  let filtered = tournaments;

  if (dateRange.start) {
    const startDate = new Date(dateRange.start);
    filtered = filtered.filter(tournament => new Date(tournament.startDate) >= startDate);
  }

  if (dateRange.end) {
    const endDate = new Date(dateRange.end);
    filtered = filtered.filter(tournament => new Date(tournament.startDate) <= endDate);
  }

  return filtered;
}

/**
 * Sort tournaments by specified field and order
 */
function sortTournaments(
  tournaments: Tournament[],
  sortBy: TournamentFilters['sortBy'],
  sortOrder: TournamentFilters['sortOrder']
): Tournament[] {
  const sorted = [...tournaments];

  sorted.sort((a, b) => {
    let compareValue = 0;

    switch (sortBy) {
      case 'name':
        compareValue = a.name.localeCompare(b.name);
        break;
      case 'startDate':
        compareValue = new Date(a.startDate).getTime() - new Date(b.startDate).getTime();
        break;
      case 'createdAt':
        compareValue = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        break;
      case 'playerCount':
        compareValue = (a.playerCount || 0) - (b.playerCount || 0);
        break;
    }

    return sortOrder === 'asc' ? compareValue : -compareValue;
  });

  return sorted;
}

/**
 * Apply all filters to tournaments
 */
export function applyFilters(
  tournaments: Tournament[],
  filters: TournamentFilters
): Tournament[] {
  let filtered = tournaments;

  // Apply search
  filtered = filterBySearch(filtered, filters.searchQuery);

  // Apply status filter
  filtered = filterByStatus(filtered, filters.status);

  // Apply format filter
  filtered = filterByFormat(filtered, filters.format);

  // Apply date range filter
  filtered = filterByDateRange(filtered, filters.dateRange);

  // Apply sorting
  filtered = sortTournaments(filtered, filters.sortBy, filters.sortOrder);

  return filtered;
}

/**
 * Get unique formats from tournaments
 */
export function getUniqueFormats(tournaments: Tournament[]): string[] {
  const formats = new Set(tournaments.map(t => t.format));
  return Array.from(formats).sort();
}

/**
 * Get tournament statistics
 */
export function getTournamentStats(tournaments: Tournament[]) {
  return {
    total: tournaments.length,
    active: tournaments.filter(t => t.status === 'active').length,
    completed: tournaments.filter(t => t.status === 'completed').length,
    draft: tournaments.filter(t => t.status === 'draft').length,
    cancelled: tournaments.filter(t => t.status === 'cancelled').length,
  };
}

/**
 * Paginate tournaments
 */
export function paginateTournaments(
  tournaments: Tournament[],
  page: number,
  pageSize: number
): {
  data: Tournament[];
  totalPages: number;
  currentPage: number;
  totalItems: number;
  hasNext: boolean;
  hasPrevious: boolean;
} {
  const totalItems = tournaments.length;
  const totalPages = Math.ceil(totalItems / pageSize);
  const currentPage = Math.max(1, Math.min(page, totalPages));
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;

  return {
    data: tournaments.slice(startIndex, endIndex),
    totalPages,
    currentPage,
    totalItems,
    hasNext: currentPage < totalPages,
    hasPrevious: currentPage > 1,
  };
}
