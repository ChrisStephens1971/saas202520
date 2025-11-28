/**
 * QuickActions Component
 * Sprint 2 - TD Console Room View
 *
 * Provides quick action buttons for common TD operations:
 * - Start next match
 * - Complete match
 * - Assign match to table
 * - View match details
 */

'use client';

import { useState } from 'react';
import type { QuickAction, QuickActionType } from '@/types/room-view';

interface QuickActionsProps {
  actions: QuickAction[];
  onAction?: (action: QuickAction) => void;
  loading?: boolean;
  className?: string;
}

export function QuickActions({
  actions,
  onAction,
  loading = false,
  className = '',
}: QuickActionsProps) {
  const [processingAction, setProcessingAction] = useState<string | null>(null);

  const handleAction = async (action: QuickAction) => {
    if (action.disabled || !onAction) return;

    setProcessingAction(action.matchId);
    try {
      await onAction(action);
    } finally {
      setProcessingAction(null);
    }
  };

  if (loading) {
    return (
      <div className={`grid grid-cols-2 md:grid-cols-4 gap-3 ${className}`}>
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-20 bg-white/10 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  if (actions.length === 0) {
    return null;
  }

  return (
    <div className={className}>
      <h3 className="text-lg font-semibold text-white mb-4">Quick Actions</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {actions.map((action) => (
          <ActionButton
            key={`${action.matchId}-${action.type}`}
            action={action}
            onClick={() => handleAction(action)}
            processing={processingAction === action.matchId}
          />
        ))}
      </div>
    </div>
  );
}

/**
 * Individual Action Button
 */
interface ActionButtonProps {
  action: QuickAction;
  onClick: () => void;
  processing: boolean;
}

function ActionButton({ action, onClick, processing }: ActionButtonProps) {
  const config = getActionConfig(action.type);

  return (
    <button
      onClick={onClick}
      disabled={action.disabled || processing}
      className={`
        relative group overflow-hidden
        backdrop-blur-lg rounded-lg border
        p-4 transition-all duration-200
        ${
          action.disabled
            ? 'bg-gray-500/20 border-gray-500/30 cursor-not-allowed opacity-50'
            : `${config.bg} ${config.border} hover:scale-105 active:scale-95 cursor-pointer`
        }
      `}
      title={action.disabled ? action.disabledReason : action.label}
    >
      {/* Background Gradient Effect */}
      {!action.disabled && (
        <div
          className={`absolute inset-0 ${config.gradient} opacity-0 group-hover:opacity-100 transition-opacity`}
        />
      )}

      {/* Content */}
      <div className="relative flex flex-col items-center gap-2">
        {/* Icon */}
        <div className={`text-3xl ${processing ? 'animate-bounce' : ''}`}>
          {processing ? '⏳' : action.icon}
        </div>

        {/* Label */}
        <div className={`text-sm font-semibold text-center leading-tight ${config.text}`}>
          {processing ? 'Processing...' : action.label}
        </div>

        {/* Disabled Reason */}
        {action.disabled && action.disabledReason && (
          <div className="text-xs text-gray-400 text-center leading-tight">
            {action.disabledReason}
          </div>
        )}
      </div>

      {/* Processing Overlay */}
      {processing && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
        </div>
      )}
    </button>
  );
}

/**
 * Action configuration by type
 */
function getActionConfig(type: QuickActionType) {
  switch (type) {
    case 'assign_to_table':
      return {
        bg: 'bg-blue-500/20',
        border: 'border-blue-500/50',
        gradient: 'bg-gradient-to-br from-blue-500/30 to-blue-600/30',
        text: 'text-blue-300',
      };
    case 'start_match':
      return {
        bg: 'bg-green-500/20',
        border: 'border-green-500/50',
        gradient: 'bg-gradient-to-br from-green-500/30 to-green-600/30',
        text: 'text-green-300',
      };
    case 'complete_match':
      return {
        bg: 'bg-purple-500/20',
        border: 'border-purple-500/50',
        gradient: 'bg-gradient-to-br from-purple-500/30 to-purple-600/30',
        text: 'text-purple-300',
      };
    case 'update_score':
      return {
        bg: 'bg-yellow-500/20',
        border: 'border-yellow-500/50',
        gradient: 'bg-gradient-to-br from-yellow-500/30 to-yellow-600/30',
        text: 'text-yellow-300',
      };
    case 'cancel_match':
      return {
        bg: 'bg-red-500/20',
        border: 'border-red-500/50',
        gradient: 'bg-gradient-to-br from-red-500/30 to-red-600/30',
        text: 'text-red-300',
      };
    case 'unassign':
      return {
        bg: 'bg-orange-500/20',
        border: 'border-orange-500/50',
        gradient: 'bg-gradient-to-br from-orange-500/30 to-orange-600/30',
        text: 'text-orange-300',
      };
    default:
      return {
        bg: 'bg-gray-500/20',
        border: 'border-gray-500/50',
        gradient: 'bg-gradient-to-br from-gray-500/30 to-gray-600/30',
        text: 'text-gray-300',
      };
  }
}

/**
 * Floating Action Button - for mobile
 */
interface FABProps {
  icon: string;
  label: string;
  onClick: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  className?: string;
}

export function FloatingActionButton({
  icon,
  label,
  onClick,
  variant = 'primary',
  className = '',
}: FABProps) {
  const variants = {
    primary: 'bg-blue-500 hover:bg-blue-600',
    secondary: 'bg-purple-500 hover:bg-purple-600',
    danger: 'bg-red-500 hover:bg-red-600',
  };

  return (
    <button
      onClick={onClick}
      className={`
        fixed bottom-6 right-6 z-50
        w-14 h-14 md:w-auto md:h-auto md:px-6 md:py-3
        rounded-full shadow-lg
        flex items-center justify-center gap-2
        ${variants[variant]}
        text-white font-semibold
        transition-all duration-200
        hover:scale-110 active:scale-95
        ${className}
      `}
      aria-label={label}
    >
      <span className="text-2xl md:text-xl">{icon}</span>
      <span className="hidden md:inline">{label}</span>
    </button>
  );
}
