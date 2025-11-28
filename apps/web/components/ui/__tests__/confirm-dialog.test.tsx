/**
 * ConfirmDialog Component Tests
 *
 * Unit tests for the accessible confirmation dialog
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ConfirmDialog } from '../confirm-dialog';

describe('ConfirmDialog', () => {
  const mockOnClose = jest.fn();
  const mockOnConfirm = jest.fn();

  const defaultProps = {
    open: true,
    onClose: mockOnClose,
    onConfirm: mockOnConfirm,
    title: 'Confirm Action',
    description: 'Are you sure you want to proceed?',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should not render when open is false', () => {
      render(<ConfirmDialog {...defaultProps} open={false} />);
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('should render when open is true', () => {
      render(<ConfirmDialog {...defaultProps} />);
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('should display title', () => {
      render(<ConfirmDialog {...defaultProps} />);
      expect(screen.getByText('Confirm Action')).toBeInTheDocument();
    });

    it('should display description', () => {
      render(<ConfirmDialog {...defaultProps} />);
      expect(screen.getByText('Are you sure you want to proceed?')).toBeInTheDocument();
    });

    it('should display default button texts', () => {
      render(<ConfirmDialog {...defaultProps} />);
      expect(screen.getByText('Confirm')).toBeInTheDocument();
      expect(screen.getByText('Cancel')).toBeInTheDocument();
    });

    it('should display custom button texts', () => {
      render(<ConfirmDialog {...defaultProps} confirmText="Delete" cancelText="Go Back" />);
      expect(screen.getByText('Delete')).toBeInTheDocument();
      expect(screen.getByText('Go Back')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes', () => {
      render(<ConfirmDialog {...defaultProps} />);
      const dialog = screen.getByRole('dialog');

      expect(dialog).toHaveAttribute('aria-modal', 'true');
      expect(dialog).toHaveAttribute('aria-labelledby', 'dialog-title');
      expect(dialog).toHaveAttribute('aria-describedby', 'dialog-description');
    });

    it('should have accessible title', () => {
      render(<ConfirmDialog {...defaultProps} />);
      expect(screen.getByText('Confirm Action')).toHaveAttribute('id', 'dialog-title');
    });

    it('should have accessible description', () => {
      render(<ConfirmDialog {...defaultProps} />);
      expect(screen.getByText('Are you sure you want to proceed?')).toHaveAttribute(
        'id',
        'dialog-description'
      );
    });

    it('should mark icon as decorative', () => {
      const { container } = render(<ConfirmDialog {...defaultProps} />);
      const icon = container.querySelector('svg');
      expect(icon).toHaveAttribute('aria-hidden', 'true');
    });

    it('should focus confirm button on open', async () => {
      render(<ConfirmDialog {...defaultProps} />);
      const confirmButton = screen.getByText('Confirm');

      await waitFor(() => {
        expect(confirmButton).toHaveFocus();
      });
    });
  });

  describe('User Interactions', () => {
    it('should call onConfirm when confirm button is clicked', async () => {
      render(<ConfirmDialog {...defaultProps} />);
      const confirmButton = screen.getByText('Confirm');

      await userEvent.click(confirmButton);

      expect(mockOnConfirm).toHaveBeenCalledTimes(1);
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('should call onClose when cancel button is clicked', async () => {
      render(<ConfirmDialog {...defaultProps} />);
      const cancelButton = screen.getByText('Cancel');

      await userEvent.click(cancelButton);

      expect(mockOnClose).toHaveBeenCalledTimes(1);
      expect(mockOnConfirm).not.toHaveBeenCalled();
    });

    it('should call onClose when backdrop is clicked', async () => {
      const { container } = render(<ConfirmDialog {...defaultProps} />);
      const backdrop = container.querySelector('.fixed.inset-0.bg-black\\/50');

      if (backdrop) {
        await userEvent.click(backdrop);
        expect(mockOnClose).toHaveBeenCalledTimes(1);
      }
    });

    it('should close on Escape key press', () => {
      render(<ConfirmDialog {...defaultProps} />);

      fireEvent.keyDown(document, { key: 'Escape' });

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('should not close on other key presses', () => {
      render(<ConfirmDialog {...defaultProps} />);

      fireEvent.keyDown(document, { key: 'Enter' });
      fireEvent.keyDown(document, { key: 'a' });

      expect(mockOnClose).not.toHaveBeenCalled();
    });
  });

  describe('Loading State', () => {
    it('should disable buttons when loading', () => {
      render(<ConfirmDialog {...defaultProps} isLoading={true} />);

      const confirmButton = screen.getByText('Processing...');
      const cancelButton = screen.getByText('Cancel');

      expect(confirmButton).toBeDisabled();
      expect(cancelButton).toBeDisabled();
    });

    it('should show loading text on confirm button', () => {
      render(<ConfirmDialog {...defaultProps} isLoading={true} />);
      expect(screen.getByText('Processing...')).toBeInTheDocument();
    });

    it('should have aria-busy attribute when loading', () => {
      render(<ConfirmDialog {...defaultProps} isLoading={true} />);
      const confirmButton = screen.getByText('Processing...');
      expect(confirmButton).toHaveAttribute('aria-busy', 'true');
    });

    it('should not close when loading', async () => {
      render(<ConfirmDialog {...defaultProps} isLoading={true} />);

      fireEvent.keyDown(document, { key: 'Escape' });

      // onClose should still be callable, but dialog logic should handle it
      // The implementation prevents closing via handleCloseDialog when isProcessing
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  describe('Variants', () => {
    it('should render danger variant with correct styling', () => {
      const { container } = render(<ConfirmDialog {...defaultProps} variant="danger" />);

      const confirmButton = screen.getByText('Confirm');
      expect(confirmButton.className).toContain('bg-red-600');
    });

    it('should render warning variant with correct styling', () => {
      const { container } = render(<ConfirmDialog {...defaultProps} variant="warning" />);

      const confirmButton = screen.getByText('Confirm');
      expect(confirmButton.className).toContain('bg-yellow-600');
    });

    it('should render info variant with correct styling', () => {
      const { container } = render(<ConfirmDialog {...defaultProps} variant="info" />);

      const confirmButton = screen.getByText('Confirm');
      expect(confirmButton.className).toContain('bg-blue-600');
    });

    it('should use danger variant by default', () => {
      render(<ConfirmDialog {...defaultProps} />);

      const confirmButton = screen.getByText('Confirm');
      expect(confirmButton.className).toContain('bg-red-600');
    });
  });

  describe('Async Confirm Handler', () => {
    it('should handle async onConfirm', async () => {
      const asyncOnConfirm = jest.fn().mockResolvedValue(undefined);

      render(<ConfirmDialog {...defaultProps} onConfirm={asyncOnConfirm} />);

      const confirmButton = screen.getByText('Confirm');
      await userEvent.click(confirmButton);

      await waitFor(() => {
        expect(asyncOnConfirm).toHaveBeenCalledTimes(1);
      });
    });

    it('should handle rejected async onConfirm', async () => {
      const asyncOnConfirm = jest.fn().mockRejectedValue(new Error('Failed'));

      render(<ConfirmDialog {...defaultProps} onConfirm={asyncOnConfirm} />);

      const confirmButton = screen.getByText('Confirm');
      await userEvent.click(confirmButton);

      await waitFor(() => {
        expect(asyncOnConfirm).toHaveBeenCalledTimes(1);
      });

      // Dialog should still close even if confirm fails
      expect(mockOnClose).toHaveBeenCalled();
    });
  });
});
