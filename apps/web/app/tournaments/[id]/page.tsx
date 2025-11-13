// Tournament Detail Page - Redirects to chip-format view
// This page provides a landing page for tournament detail URLs

import { redirect } from 'next/navigation';

interface TournamentDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function TournamentDetailPage({ params }: TournamentDetailPageProps) {
  const { id } = await params;

  // Redirect to chip-format view (main tournament interface)
  redirect(`/tournaments/${id}/chip-format`);
}
