'use client';

import { useState, useRef, useCallback } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export function useConfirm() {
  const [open, setOpen] = useState(false);
  const [config, setConfig] = useState({
    title: '',
    description: '',
    actionLabel: 'Confirm',
    cancelLabel: 'Cancel',
  });

  const resolver = useRef<((value: boolean) => void) | null>(null);

  const confirm = useCallback(
    (options: {
      title: string;
      description: string;
      actionLabel?: string;
      cancelLabel?: string;
    }) => {
      setConfig({
        title: options.title,
        description: options.description,
        actionLabel: options.actionLabel || 'Confirm',
        cancelLabel: options.cancelLabel || 'Cancel',
      });
      setOpen(true);

      return new Promise<boolean>((resolve) => {
        resolver.current = resolve;
      });
    },
    []
  );

  const handleConfirm = useCallback(() => {
    setOpen(false);
    resolver.current?.(true);
  }, []);

  const handleCancel = useCallback(() => {
    setOpen(false);
    resolver.current?.(false);
  }, []);

  const ConfirmDialog = (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{config.title}</AlertDialogTitle>
          <AlertDialogDescription>{config.description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleCancel}>{config.cancelLabel}</AlertDialogCancel>
          <AlertDialogAction onClick={handleConfirm}>{config.actionLabel}</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  return { confirm, ConfirmDialog };
}
