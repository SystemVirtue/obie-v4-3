import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { render } from '@/test/utils/test-utils';
import { PlayerClosedNotification } from '../PlayerClosedNotification';

describe('PlayerClosedNotification', () => {
  let mockOnReopenPlayer: ReturnType<typeof vi.fn>;
  let mockPlayerWindow: Window | null;

  beforeEach(() => {
    mockOnReopenPlayer = vi.fn();
    mockPlayerWindow = null;
  });

  describe('Rendering', () => {
    it('renders when player window is null and isPlayerRunning is true', () => {
      render(
        <PlayerClosedNotification
          playerWindow={null}
          isPlayerRunning={true}
          onReopenPlayer={mockOnReopenPlayer}
        />
      );

      expect(screen.getByText(/Player Window Closed/i)).toBeInTheDocument();
    });

    it('renders when player window is closed and isPlayerRunning is true', () => {
      const closedWindow = { closed: true } as Window;
      
      render(
        <PlayerClosedNotification
          playerWindow={closedWindow}
          isPlayerRunning={true}
          onReopenPlayer={mockOnReopenPlayer}
        />
      );

      expect(screen.getByText(/Player Window Closed/i)).toBeInTheDocument();
    });

    it('does not render when player window is open', () => {
      const openWindow = { closed: false } as Window;
      
      render(
        <PlayerClosedNotification
          playerWindow={openWindow}
          isPlayerRunning={true}
          onReopenPlayer={mockOnReopenPlayer}
        />
      );

      expect(screen.queryByText(/Player Window Closed/i)).not.toBeInTheDocument();
    });

    it('does not render when isPlayerRunning is false', () => {
      render(
        <PlayerClosedNotification
          playerWindow={null}
          isPlayerRunning={false}
          onReopenPlayer={mockOnReopenPlayer}
        />
      );

      expect(screen.queryByText(/Player Window Closed/i)).not.toBeInTheDocument();
    });

    it('does not render when window is open and player is not running', () => {
      const openWindow = { closed: false } as Window;
      
      render(
        <PlayerClosedNotification
          playerWindow={openWindow}
          isPlayerRunning={false}
          onReopenPlayer={mockOnReopenPlayer}
        />
      );

      expect(screen.queryByText(/Player Window Closed/i)).not.toBeInTheDocument();
    });

    it('returns null when not shown', () => {
      const openWindow = { closed: false } as Window;
      const { container } = render(
        <PlayerClosedNotification
          playerWindow={openWindow}
          isPlayerRunning={true}
          onReopenPlayer={mockOnReopenPlayer}
        />
      );

      expect(container.firstChild).toBeNull();
    });

    it('displays warning emoji', () => {
      render(
        <PlayerClosedNotification
          playerWindow={null}
          isPlayerRunning={true}
          onReopenPlayer={mockOnReopenPlayer}
        />
      );

      expect(screen.getByText(/⚠️/)).toBeInTheDocument();
    });

    it('displays "Reopen Player" button', () => {
      render(
        <PlayerClosedNotification
          playerWindow={null}
          isPlayerRunning={true}
          onReopenPlayer={mockOnReopenPlayer}
        />
      );

      expect(screen.getByRole('button', { name: /Reopen Player/i })).toBeInTheDocument();
    });
  });

  describe('Interactions', () => {
    it('calls onReopenPlayer when button is clicked', async () => {
      const user = userEvent.setup();
      
      render(
        <PlayerClosedNotification
          playerWindow={null}
          isPlayerRunning={true}
          onReopenPlayer={mockOnReopenPlayer}
        />
      );

      const button = screen.getByRole('button', { name: /Reopen Player/i });
      await user.click(button);

      expect(mockOnReopenPlayer).toHaveBeenCalledTimes(1);
    });

    it('calls onReopenPlayer multiple times if clicked multiple times', async () => {
      const user = userEvent.setup();
      
      render(
        <PlayerClosedNotification
          playerWindow={null}
          isPlayerRunning={true}
          onReopenPlayer={mockOnReopenPlayer}
        />
      );

      const button = screen.getByRole('button', { name: /Reopen Player/i });
      await user.click(button);
      await user.click(button);
      await user.click(button);

      expect(mockOnReopenPlayer).toHaveBeenCalledTimes(3);
    });

    it('logs to console when button is clicked', async () => {
      const consoleSpy = vi.spyOn(console, 'log');
      const user = userEvent.setup();
      
      render(
        <PlayerClosedNotification
          playerWindow={null}
          isPlayerRunning={true}
          onReopenPlayer={mockOnReopenPlayer}
        />
      );

      const button = screen.getByRole('button', { name: /Reopen Player/i });
      await user.click(button);

      expect(consoleSpy).toHaveBeenCalledWith('Reopening player window from notification');
      consoleSpy.mockRestore();
    });

    it('handles async onReopenPlayer callbacks', async () => {
      const asyncCallback = vi.fn(async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
      });
      const user = userEvent.setup();
      
      render(
        <PlayerClosedNotification
          playerWindow={null}
          isPlayerRunning={true}
          onReopenPlayer={asyncCallback}
        />
      );

      const button = screen.getByRole('button', { name: /Reopen Player/i });
      await user.click(button);

      expect(asyncCallback).toHaveBeenCalledTimes(1);
    });
  });

  describe('Styling', () => {
    it('has absolute positioning', () => {
      const { container } = render(
        <PlayerClosedNotification
          playerWindow={null}
          isPlayerRunning={true}
          onReopenPlayer={mockOnReopenPlayer}
        />
      );

      const wrapper = container.querySelector('.absolute');
      expect(wrapper).toBeInTheDocument();
    });

    it('has top-right position', () => {
      const { container } = render(
        <PlayerClosedNotification
          playerWindow={null}
          isPlayerRunning={true}
          onReopenPlayer={mockOnReopenPlayer}
        />
      );

      const wrapper = container.querySelector('.top-2.right-2');
      expect(wrapper).toBeInTheDocument();
    });

    it('has high z-index', () => {
      const { container } = render(
        <PlayerClosedNotification
          playerWindow={null}
          isPlayerRunning={true}
          onReopenPlayer={mockOnReopenPlayer}
        />
      );

      const wrapper = container.querySelector('.z-20');
      expect(wrapper).toBeInTheDocument();
    });

    it('has red warning theme', () => {
      const { container } = render(
        <PlayerClosedNotification
          playerWindow={null}
          isPlayerRunning={true}
          onReopenPlayer={mockOnReopenPlayer}
        />
      );

      const card = container.querySelector('.bg-red-900\\/80');
      expect(card).toBeInTheDocument();
    });

    it('has red border', () => {
      const { container } = render(
        <PlayerClosedNotification
          playerWindow={null}
          isPlayerRunning={true}
          onReopenPlayer={mockOnReopenPlayer}
        />
      );

      const card = container.querySelector('.border-red-400');
      expect(card).toBeInTheDocument();
    });

    it('has backdrop blur effect', () => {
      const { container } = render(
        <PlayerClosedNotification
          playerWindow={null}
          isPlayerRunning={true}
          onReopenPlayer={mockOnReopenPlayer}
        />
      );

      const card = container.querySelector('.backdrop-blur-sm');
      expect(card).toBeInTheDocument();
    });

    it('has shadow effect', () => {
      const { container } = render(
        <PlayerClosedNotification
          playerWindow={null}
          isPlayerRunning={true}
          onReopenPlayer={mockOnReopenPlayer}
        />
      );

      const card = container.querySelector('.shadow-lg');
      expect(card).toBeInTheDocument();
    });

    it('has red button background', () => {
      const { container } = render(
        <PlayerClosedNotification
          playerWindow={null}
          isPlayerRunning={true}
          onReopenPlayer={mockOnReopenPlayer}
        />
      );

      const button = container.querySelector('.bg-red-600');
      expect(button).toBeInTheDocument();
    });

    it('has red button hover state', () => {
      const { container } = render(
        <PlayerClosedNotification
          playerWindow={null}
          isPlayerRunning={true}
          onReopenPlayer={mockOnReopenPlayer}
        />
      );

      const button = container.querySelector('.hover\\:bg-red-700');
      expect(button).toBeInTheDocument();
    });

    it('text has red theme', () => {
      const { container } = render(
        <PlayerClosedNotification
          playerWindow={null}
          isPlayerRunning={true}
          onReopenPlayer={mockOnReopenPlayer}
        />
      );

      const text = container.querySelector('.text-red-100');
      expect(text).toBeInTheDocument();
    });

    it('text has medium font weight', () => {
      const { container } = render(
        <PlayerClosedNotification
          playerWindow={null}
          isPlayerRunning={true}
          onReopenPlayer={mockOnReopenPlayer}
        />
      );

      const text = container.querySelector('.font-medium');
      expect(text).toBeInTheDocument();
    });
  });

  describe('Responsive Design', () => {
    it('has responsive top-right positioning', () => {
      const { container } = render(
        <PlayerClosedNotification
          playerWindow={null}
          isPlayerRunning={true}
          onReopenPlayer={mockOnReopenPlayer}
        />
      );

      const wrapper = container.querySelector('.sm\\:top-4');
      expect(wrapper).toBeInTheDocument();
      const rightWrapper = container.querySelector('.sm\\:right-4');
      expect(rightWrapper).toBeInTheDocument();
    });

    it('has responsive max width', () => {
      const { container } = render(
        <PlayerClosedNotification
          playerWindow={null}
          isPlayerRunning={true}
          onReopenPlayer={mockOnReopenPlayer}
        />
      );

      const wrapper = container.querySelector('.max-w-\\[calc\\(100vw-1rem\\)\\]');
      expect(wrapper).toBeInTheDocument();
      const smWrapper = container.querySelector('.sm\\:max-w-none');
      expect(smWrapper).toBeInTheDocument();
    });

    it('has responsive padding', () => {
      const { container } = render(
        <PlayerClosedNotification
          playerWindow={null}
          isPlayerRunning={true}
          onReopenPlayer={mockOnReopenPlayer}
        />
      );

      const content = container.querySelector('.p-2');
      expect(content).toHaveClass('sm:p-3');
    });

    it('has responsive gap', () => {
      const { container } = render(
        <PlayerClosedNotification
          playerWindow={null}
          isPlayerRunning={true}
          onReopenPlayer={mockOnReopenPlayer}
        />
      );

      const flex = container.querySelector('.gap-2');
      expect(flex).toHaveClass('sm:gap-3');
    });

    it('has responsive layout direction', () => {
      const { container } = render(
        <PlayerClosedNotification
          playerWindow={null}
          isPlayerRunning={true}
          onReopenPlayer={mockOnReopenPlayer}
        />
      );

      const flex = container.querySelector('.flex-col');
      expect(flex).toHaveClass('sm:flex-row');
    });

    it('has responsive text size', () => {
      const { container } = render(
        <PlayerClosedNotification
          playerWindow={null}
          isPlayerRunning={true}
          onReopenPlayer={mockOnReopenPlayer}
        />
      );

      const text = container.querySelector('.text-xs');
      expect(text).toHaveClass('sm:text-sm');
    });

    it('has responsive text alignment', () => {
      const { container } = render(
        <PlayerClosedNotification
          playerWindow={null}
          isPlayerRunning={true}
          onReopenPlayer={mockOnReopenPlayer}
        />
      );

      const text = container.querySelector('.text-center');
      expect(text).toHaveClass('sm:text-left');
    });

    it('has responsive button padding', () => {
      const { container } = render(
        <PlayerClosedNotification
          playerWindow={null}
          isPlayerRunning={true}
          onReopenPlayer={mockOnReopenPlayer}
        />
      );

      const button = container.querySelector('.px-2');
      expect(button).toHaveClass('sm:px-3');
      const pyButton = container.querySelector('.py-1');
      expect(pyButton).toHaveClass('sm:py-1');
    });

    it('has responsive button width', () => {
      const { container } = render(
        <PlayerClosedNotification
          playerWindow={null}
          isPlayerRunning={true}
          onReopenPlayer={mockOnReopenPlayer}
        />
      );

      const button = container.querySelector('.w-full');
      expect(button).toHaveClass('sm:w-auto');
    });
  });

  describe('Accessibility', () => {
    it('button is keyboard accessible', async () => {
      const user = userEvent.setup();
      
      render(
        <PlayerClosedNotification
          playerWindow={null}
          isPlayerRunning={true}
          onReopenPlayer={mockOnReopenPlayer}
        />
      );

      const button = screen.getByRole('button', { name: /Reopen Player/i });
      await user.tab();
      
      expect(button).toHaveFocus();
    });

    it('button can be activated with Enter key', async () => {
      const user = userEvent.setup();
      
      render(
        <PlayerClosedNotification
          playerWindow={null}
          isPlayerRunning={true}
          onReopenPlayer={mockOnReopenPlayer}
        />
      );

      const button = screen.getByRole('button', { name: /Reopen Player/i });
      button.focus();
      await user.keyboard('{Enter}');

      expect(mockOnReopenPlayer).toHaveBeenCalledTimes(1);
    });

    it('button can be activated with Space key', async () => {
      const user = userEvent.setup();
      
      render(
        <PlayerClosedNotification
          playerWindow={null}
          isPlayerRunning={true}
          onReopenPlayer={mockOnReopenPlayer}
        />
      );

      const button = screen.getByRole('button', { name: /Reopen Player/i });
      button.focus();
      await user.keyboard(' ');

      expect(mockOnReopenPlayer).toHaveBeenCalledTimes(1);
    });

    it('has proper button role', () => {
      render(
        <PlayerClosedNotification
          playerWindow={null}
          isPlayerRunning={true}
          onReopenPlayer={mockOnReopenPlayer}
        />
      );

      const button = screen.getByRole('button', { name: /Reopen Player/i });
      expect(button).toBeInTheDocument();
    });

    it('warning text is visible and readable', () => {
      render(
        <PlayerClosedNotification
          playerWindow={null}
          isPlayerRunning={true}
          onReopenPlayer={mockOnReopenPlayer}
        />
      );

      const warningText = screen.getByText(/Player Window Closed/i);
      expect(warningText).toBeVisible();
    });
  });
});
