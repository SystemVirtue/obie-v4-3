import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { render } from '@/test/utils/test-utils';
import { BackToSearchButton } from '../BackToSearchButton';

describe('BackToSearchButton', () => {
  const mockOnClick = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders button with text', () => {
      render(<BackToSearchButton onClick={mockOnClick} />);

      expect(screen.getByRole('button', { name: /back to search/i })).toBeInTheDocument();
    });

    it('renders ArrowLeft icon', () => {
      const { container } = render(<BackToSearchButton onClick={mockOnClick} />);

      // lucide-react renders SVG elements
      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });

    it('has correct button text', () => {
      render(<BackToSearchButton onClick={mockOnClick} />);

      expect(screen.getByText('Back to Search')).toBeInTheDocument();
    });
  });

  describe('Interactions', () => {
    it('calls onClick when button is clicked', async () => {
      const user = userEvent.setup();
      render(<BackToSearchButton onClick={mockOnClick} />);

      const button = screen.getByRole('button', { name: /back to search/i });
      await user.click(button);

      expect(mockOnClick).toHaveBeenCalledTimes(1);
    });

    it('calls onClick multiple times on multiple clicks', async () => {
      const user = userEvent.setup();
      render(<BackToSearchButton onClick={mockOnClick} />);

      const button = screen.getByRole('button', { name: /back to search/i });
      
      await user.click(button);
      await user.click(button);
      await user.click(button);

      expect(mockOnClick).toHaveBeenCalledTimes(3);
    });
  });

  describe('Styling', () => {
    it('has amber background color class', () => {
      render(<BackToSearchButton onClick={mockOnClick} />);

      const button = screen.getByRole('button', { name: /back to search/i });
      expect(button).toHaveClass('bg-amber-600');
    });

    it('has hover effect class', () => {
      render(<BackToSearchButton onClick={mockOnClick} />);

      const button = screen.getByRole('button', { name: /back to search/i });
      expect(button).toHaveClass('hover:bg-amber-700');
    });

    it('has flex and gap classes for icon alignment', () => {
      render(<BackToSearchButton onClick={mockOnClick} />);

      const button = screen.getByRole('button', { name: /back to search/i });
      expect(button).toHaveClass('flex', 'items-center', 'gap-2');
    });

    it('has white text color', () => {
      render(<BackToSearchButton onClick={mockOnClick} />);

      const button = screen.getByRole('button', { name: /back to search/i });
      expect(button).toHaveClass('text-white');
    });

    it('has padding classes', () => {
      render(<BackToSearchButton onClick={mockOnClick} />);

      const button = screen.getByRole('button', { name: /back to search/i });
      expect(button).toHaveClass('px-6', 'py-3');
    });

    it('has large text size', () => {
      render(<BackToSearchButton onClick={mockOnClick} />);

      const button = screen.getByRole('button', { name: /back to search/i });
      expect(button).toHaveClass('text-lg');
    });

    it('has drop-shadow filter style', () => {
      render(<BackToSearchButton onClick={mockOnClick} />);

      const button = screen.getByRole('button', { name: /back to search/i });
      expect(button).toHaveStyle({
        filter: 'drop-shadow(-5px -5px 10px rgba(0,0,0,0.8))',
      });
    });
  });

  describe('Accessibility', () => {
    it('is keyboard accessible', async () => {
      const user = userEvent.setup();
      render(<BackToSearchButton onClick={mockOnClick} />);

      const button = screen.getByRole('button', { name: /back to search/i });
      
      // Focus the button
      await user.tab();
      expect(button).toHaveFocus();
    });

    it('can be activated with keyboard', async () => {
      const user = userEvent.setup();
      render(<BackToSearchButton onClick={mockOnClick} />);

      const button = screen.getByRole('button', { name: /back to search/i });
      button.focus();
      
      // Activate with Enter key
      await user.keyboard('{Enter}');
      
      expect(mockOnClick).toHaveBeenCalledTimes(1);
    });

    it('has proper button role', () => {
      render(<BackToSearchButton onClick={mockOnClick} />);

      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
    });
  });
});
