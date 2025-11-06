/**
 * useSocket Hook Tests
 * Sprint 6 - WebSocket Integration Testing
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useSocket } from '@/hooks/useSocket';
import type { Socket } from 'socket.io-client';

// Mock socket.io-client
vi.mock('socket.io-client', () => ({
  io: vi.fn(() => ({
    on: vi.fn(),
    emit: vi.fn(),
    off: vi.fn(),
    disconnect: vi.fn(),
  })),
}));

describe('useSocket', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should initialize with disconnected state', () => {
    const { result } = renderHook(() => useSocket('tournament-1'));

    expect(result.current.socket).toBeNull();
    expect(result.current.isConnected).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('should not create socket when disabled', () => {
    const { result } = renderHook(() => useSocket('tournament-1', false));

    expect(result.current.socket).toBeNull();
    expect(result.current.isConnected).toBe(false);
  });

  it('should handle connection state updates', async () => {
    const mockSocket = {
      on: vi.fn((event, callback) => {
        if (event === 'connect') {
          // Simulate connection
          setTimeout(() => callback(), 0);
        }
      }),
      emit: vi.fn(),
      off: vi.fn(),
      disconnect: vi.fn(),
    };

    const { io } = await import('socket.io-client');
    vi.mocked(io).mockReturnValue(mockSocket as unknown as Socket);

    const { result } = renderHook(() => useSocket('tournament-1'));

    await waitFor(() => {
      expect(result.current.isConnected).toBe(true);
    });
  });

  it('should join tournament room on connect', async () => {
    const mockSocket = {
      on: vi.fn((event, callback) => {
        if (event === 'connect') {
          setTimeout(() => callback(), 0);
        }
      }),
      emit: vi.fn(),
      off: vi.fn(),
      disconnect: vi.fn(),
    };

    const { io } = await import('socket.io-client');
    vi.mocked(io).mockReturnValue(mockSocket as unknown as Socket);

    renderHook(() => useSocket('tournament-123'));

    await waitFor(() => {
      expect(mockSocket.emit).toHaveBeenCalledWith('join:tournament', 'tournament-123');
    });
  });

  it('should cleanup on unmount', () => {
    const mockSocket = {
      on: vi.fn(),
      emit: vi.fn(),
      off: vi.fn(),
      disconnect: vi.fn(),
    };

    const { io } = await import('socket.io-client');
    vi.mocked(io).mockReturnValue(mockSocket as unknown as Socket);

    const { unmount } = renderHook(() => useSocket('tournament-1'));

    unmount();

    expect(mockSocket.emit).toHaveBeenCalledWith('leave:tournament', 'tournament-1');
    expect(mockSocket.disconnect).toHaveBeenCalled();
  });
});
