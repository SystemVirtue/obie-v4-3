import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { render } from '@/test/utils/test-utils';
import { SearchButton } from '../SearchButton';

describe('SearchButton', () => {
  const mockOnClick = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders button with text and emojis', () => {
      render(<SearchButton onClick={mockOnClick} />);

      expect(screen.getByText(/🎵 Search for Music 🎵/)).toBeInTheDocument();
    });

    it('renders button with proper role', () => {
      render(<SearchButton onClick={mockOnClick} />);

      const button = screen.getByRole('button', { name: /Search for Music/ });
      expect(button).toBeInTheDocument();
    });
  });

  describe('Interactions', () => {
    it('calls onClick when button is clicked', async () => {
      const user = userEvent.setup();
      render(<SearchButton onClick={mockOnClick} />);

      const button = screen.getByRole('button', { name: /Search for Music/ });
      await user.click(button);

      expect(mockOnClick).toHaveBeenCalledTimes(1);
    });

    it('calls onClick multiple times on multiple clicks', async () => {
      const user = userEvent.setup();
      render(<SearchButton onClick={mockOnClick} />);

      const button = screen.getByRole('button', { name: /Search for Music/ });
      
      await user.click(button);
      await user.click(button);
      await user.click(button);

      expect(mockOnClick).toHaveBeenCalledTimes(3);
    });

    it('logs to console when clicked', async () => {
      const consoleLogSpy = vi.spyOn(console, 'log');
      const user = userEvent.setup();
      render(<SearchButton onClick={mockOnClick} />);

      const button = screen.getByRole('button', { name: /Search for Music/ });
      await user.click(button);

      expect(consoleLogSpy).toHaveBeenCalledWith(
        'Search button clicked - opening search interface'
      );
    });
  });

  describe('Styling', () => {
    it('has fixed positioning', () => {
      const { container } = render(<SearchButton onClick={mockOnClick} />);

      const wrapper = container.querySelector('.fixed');
      expect(wrapper).toBeInTheDocument();
      expect(wrapper?.className).toContain('bottom-[calc(2rem+50px)]');
    });

    it('has high z-index for visibility', () => {
      const { container } = render(<SearchButton onClick={mockOnClick} />);

      const wrapper = container.querySelector('.z-20');
      expect(wrapper).toBeInTheDocument();
    });

    it('has yellow border', () => {
      render(<SearchButton onClick={mockOnClick} />);

      const button = screen.getByRole('button', { name: /Search for Music/ });
      expect(button).toHaveClass('border-yellow-400');
    });

    it('has semi-transparent black background', () => {
      render(<SearchButton onClick={mockOnClick} />);

      const button = screen.getByRole('button', { name: /Search for Music/ });
      expect(button).toHaveClass('bg-black/60');
    });

    it('has hover scale effect', () => {
      render(<SearchButton onClick={mockOnClick} />);

      const button = screen.getByRole('button', { name: /Search for Music/ });
      expect(button).toHaveClass('hover:scale-105');
    });

    it('has transition animation', () => {
      render(<SearchButton onClick={mockOnClick} />);

      const button = screen.getByRole('button', { name: /Search for Music/ });
      expect(button).toHaveClass('transition-all', 'duration-200');
    });

    it('has drop-shadow filter style', () => {
      render(<SearchButton onClick={mockOnClick} />);

      const button = screen.getByRole('button', { name: /Search for Music/ });
      expect(button).toHaveStyle({
        filter: 'drop-shadow(-5px -5px 10px rgba(0,0,0,0.8))',
      });
    });

    it('has bold font weight', () => {
      render(<SearchButton onClick={mockOnClick} />);

      const button = screen.getByRole('button', { name: /Search for Music/ });
      expect(button).toHaveClass('font-bold');
    });

    it('has white text color', () => {
      render(<SearchButton onClick={mockOnClick} />);

      const button = screen.getByRole('button', { name: /Search for Music/ });
      expect(button).toHaveClass('text-white');
    });
  });

  describe('Responsive Design', () => {
    it('has responsive height', () => {
      render(<SearchButton onClick={mockOnClick} />);

      const button = screen.getByRole('button', { name: /Search for Music/ });
      expect(button).toHaveClass('h-16', 'sm:h-24');
    });

    it('has responsive text size', () => {
      render(<SearchButton onClick={mockOnClick} />);

      const button = screen.getByRole('button', { name: /Search for Music/ });
      expect(button).toHaveClass('text-xl', 'sm:text-3xl');
    });

    it('has responsive border width', () => {
      render(<SearchButton onClick={mockOnClick} />);

      const button = screen.getByRole('button', { name: /Search for Music/ });
      expect(button).toHaveClass('border-2', 'sm:border-4');
    });

    it('has responsive positioning', () => {
      const { container } = render(<SearchButton onClick={mockOnClick} />);

      const wrapper = container.querySelector('.fixed');
      expect(wrapper).toHaveClass('left-4', 'right-4', 'sm:left-0', 'sm:right-0');
    });

    it('has max-width constraint', () => {
      render(<SearchButton onClick={mockOnClick} />);

      const button = screen.getByRole('button', { name: /Search for Music/ });
      expect(button).toHaveClass('max-w-96');
    });
  });

  describe('Accessibility', () => {
    it('is keyboard accessible', async () => {
      const user = userEvent.setup();
      render(<SearchButton onClick={mockOnClick} />);

      const button = screen.getByRole('button', { name: /Search for Music/ });
      
      // Focus the button with tab
      await user.tab();
      expect(button).toHaveFocus();
    });

    it('can be activated with Enter key', async () => {
      const user = userEvent.setup();
      render(<SearchButton onClick={mockOnClick} />);

      const button = screen.getByRole('button', { name: /Search for Music/ });
      button.focus();
      
      await user.keyboard('{Enter}');
      
      expect(mockOnClick).toHaveBeenCalledTimes(1);
    });

    it('can be activated with Space key', async () => {
      const user = userEvent.setup();
      render(<SearchButton onClick={mockOnClick} />);

      const button = screen.getByRole('button', { name: /Search for Music/ });
      button.focus();
      
      await user.keyboard(' ');
      
      expect(mockOnClick).toHaveBeenCalledTimes(1);
    });
  });
});
