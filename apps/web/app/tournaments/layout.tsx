/**
 * Tournaments Layout
 *
 * Forces dynamic rendering for all tournament pages since they use:
 * - useSession() for authentication
 * - Client-side data fetching
 * - Real-time updates
 */

export const dynamic = 'force-dynamic';

export default function TournamentsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
