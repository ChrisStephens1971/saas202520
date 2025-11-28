'use client';

import { useConfirm } from '@/hooks/use-confirm';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

interface DeleteTournamentButtonProps {
  tournamentId: string;
  tournamentName: string;
}

export function DeleteTournamentButton({
  tournamentId,
  tournamentName,
}: DeleteTournamentButtonProps) {
  const { confirm, ConfirmDialog } = useConfirm();
  const router = useRouter();

  const handleDelete = async () => {
    const ok = await confirm({
      title: 'Delete Tournament',
      description: `Are you sure you want to delete "${tournamentName}"? This action cannot be undone.`,
      actionLabel: 'Delete',
      cancelLabel: 'Cancel',
    });

    if (!ok) return;

    try {
      const response = await fetch(`/api/tournaments/${tournamentId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.error || 'Failed to delete tournament');
      }

      toast.success('Tournament deleted successfully');
      router.refresh();
    } catch (err) {
      console.error('Error deleting tournament:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to delete tournament');
    }
  };

  return (
    <>
      <button
        onClick={(e) => {
          e.stopPropagation();
          handleDelete();
        }}
        className="flex-1 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
      >
        Delete
      </button>
      {ConfirmDialog}
    </>
  );
}
