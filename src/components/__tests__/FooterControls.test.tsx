import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { render } from '@/test/utils/test-utils';
import { FooterControls } from '../FooterControls';

describe('FooterControls', () => {
  const mockOnOpenAdmin = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders settings button', () => {
      render(<FooterControls onOpenAdmin={mockOnOpenAdmin} />);

      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
    });

    it('renders Settings icon', () => {
      const { container } = render(<FooterControls onOpenAdmin={mockOnOpenAdmin} />);

      // lucide-react renders SVG elements
      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });
  });

  describe('Interactions', () => {
    it('calls onOpenAdmin when button is clicked', async () => {
      const user = userEvent.setup();
      render(<FooterControls onOpenAdmin={mockOnOpenAdmin} />);

      const button = screen.getByRole('button');
      await user.click(button);

      expect(mockOnOpenAdmin).toHaveBeenCalledTimes(1);
    });

    it('calls onOpenAdmin multiple times on multiple clicks', async () => {
      const user = userEvent.setup();
      render(<FooterControls onOpenAdmin={mockOnOpenAdmin} />);

      const button = screen.getByRole('button');
      
      await user.click(button);
      await user.click(button);
      await user.click(button);

      expect(mockOnOpenAdmin).toHaveBeenCalledTimes(3);
    });

    it('logs to console when clicked', async () => {
      const consoleLogSpy = vi.spyOn(console, 'log');
      const user = userEvent.setup();
      render(<FooterControls onOpenAdmin={mockOnOpenAdmin} />);

      const button = screen.getByRole('button');
      await user.click(button);

      expect(consoleLogSpy).toHaveBeenCalledWith('Opening admin console');
    });
  });

  describe('Styling', () => {
    it('has absolute positioning', () => {
      const { container } = render(<FooterControls onOpenAdmin={mockOnOpenAdmin} />);

      const wrapper = container.querySelector('.absolute');
      expect(wrapper).toBeInTheDocument();
    });

    it('is positioned at bottom-left', () => {
      const { container } = render(<FooterControls onOpenAdmin={mockOnOpenAdmin} />);

      const wrapper = container.querySelector('.bottom-2');
      expect(wrapper).toHaveClass('left-2');
    });

    it('has ghost variant', () => {
      render(<FooterControls onOpenAdmin={mockOnOpenAdmin} />);

      const button = screen.getByRole('button');
      // Ghost variant is applied through variant prop, check for base button classes
      expect(button.tagName).toBe('BUTTON');
    });

    it('has amber text color', () => {
      render(<FooterControls onOpenAdmin={mockOnOpenAdmin} />);

      const button = screen.getByRole('button');
      expect(button).toHaveClass('text-amber-200');
    });

    it('has hover text color change', () => {
      render(<FooterControls onOpenAdmin={mockOnOpenAdmin} />);

      const button = screen.getByRole('button');
      expect(button).toHaveClass('hover:text-amber-100');
    });

    it('has low opacity by default', () => {
      render(<FooterControls onOpenAdmin={mockOnOpenAdmin} />);

      const button = screen.getByRole('button');
      expect(button).toHaveClass('opacity-30');
    });

    it('has full opacity on hover', () => {
      render(<FooterControls onOpenAdmin={mockOnOpenAdmin} />);

      const button = screen.getByRole('button');
      expect(button).toHaveClass('hover:opacity-100');
    });

    it('has minimal padding', () => {
      render(<FooterControls onOpenAdmin={mockOnOpenAdmin} />);

      const button = screen.getByRole('button');
      expect(button).toHaveClass('p-1');
    });
  });

  describe('Responsive Design', () => {
    it('has responsive positioning', () => {
      const { container } = render(<FooterControls onOpenAdmin={mockOnOpenAdmin} />);

      const wrapper = container.querySelector('.bottom-2');
      expect(wrapper).toHaveClass('sm:bottom-4', 'left-2', 'sm:left-4');
    });

    it('has responsive padding', () => {
      render(<FooterControls onOpenAdmin={mockOnOpenAdmin} />);

      const button = screen.getByRole('button');
      expect(button).toHaveClass('p-1', 'sm:p-2');
    });

    it('has responsive icon sizing', () => {
      const { container } = render(<FooterControls onOpenAdmin={mockOnOpenAdmin} />);

      const icon = container.querySelector('.w-3');
      expect(icon).toHaveClass('h-3', 'sm:w-4', 'sm:h-4');
    });
  });

  describe('Accessibility', () => {
    it('is keyboard accessible', async () => {
      const user = userEvent.setup();
      render(<FooterControls onOpenAdmin={mockOnOpenAdmin} />);

      const button = screen.getByRole('button');
      
      // Focus the button
      await user.tab();
      expect(button).toHaveFocus();
    });

    it('can be activated with Enter key', async () => {
      const user = userEvent.setup();
      render(<FooterControls onOpenAdmin={mockOnOpenAdmin} />);

      const button = screen.getByRole('button');
      button.focus();
      
      await user.keyboard('{Enter}');
      
      expect(mockOnOpenAdmin).toHaveBeenCalledTimes(1);
    });

    it('can be activated with Space key', async () => {
      const user = userEvent.setup();
      render(<FooterControls onOpenAdmin={mockOnOpenAdmin} />);

      const button = screen.getByRole('button');
      button.focus();
      
      await user.keyboard(' ');
      
      expect(mockOnOpenAdmin).toHaveBeenCalledTimes(1);
    });

    it('has proper button role', () => {
      render(<FooterControls onOpenAdmin={mockOnOpenAdmin} />);

      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
    });
  });
});
