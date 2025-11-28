// Tournament Detail Page - Redirects to appropriate detail view
// This page provides a landing page for tournament detail URLs

import { redirect } from 'next/navigation';

interface TournamentDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function TournamentDetailPage({ params }: TournamentDetailPageProps) {
  const { id } = await params;

  // Redirect to detail view (will handle chip-format redirect if needed)
  redirect(`/tournaments/${id}/detail`);
}
