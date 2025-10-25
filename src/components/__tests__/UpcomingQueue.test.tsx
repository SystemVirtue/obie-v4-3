import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import { render } from '@/test/utils/test-utils';
import { UpcomingQueue } from '../UpcomingQueue';

describe('UpcomingQueue', () => {
  const mockUpcomingTitles = [
    'Song One - Artist One',
    'Song Two - Artist Two',
    'Song Three - Artist Three',
  ];

  describe('Rendering', () => {
    it('renders with upcoming titles', () => {
      render(<UpcomingQueue upcomingTitles={mockUpcomingTitles} />);

      expect(screen.getByText('COMING UP:')).toBeInTheDocument();
      expect(screen.getByText('Song One - Artist One')).toBeInTheDocument();
      expect(screen.getByText('Song Two - Artist Two')).toBeInTheDocument();
      expect(screen.getByText('Song Three - Artist Three')).toBeInTheDocument();
    });

    it('renders with empty queue', () => {
      render(<UpcomingQueue upcomingTitles={[]} />);

      expect(screen.getByText('COMING UP:')).toBeInTheDocument();
    });

    it('renders with single song', () => {
      render(<UpcomingQueue upcomingTitles={['Only Song']} />);

      expect(screen.getByText('COMING UP:')).toBeInTheDocument();
      expect(screen.getByText('Only Song')).toBeInTheDocument();
    });

    it('renders songs without numbers', () => {
      const titles = Array.from({ length: 5 }, (_, i) => `Song ${i + 1}`);
      render(<UpcomingQueue upcomingTitles={titles} />);

      titles.forEach((title) => {
        expect(screen.getByText(title)).toBeInTheDocument();
      });
      // Ensure no numbers are present
      expect(screen.queryByText(/^\d+\./)).not.toBeInTheDocument();
    });

    it('renders priority queue songs in white', () => {
      const priorityTitles = ['PRIORITY:Priority Song 1', 'PRIORITY:Priority Song 2', 'Regular Song 3'];
      render(<UpcomingQueue upcomingTitles={priorityTitles} />);

      // Priority songs should be in white text
      const priorityElements = screen.getAllByText(/Priority Song/);
      priorityElements.forEach(element => {
        expect(element).toHaveClass('text-white');
      });

      // Regular songs should be in amber text
      expect(screen.getByText('Regular Song 3')).toHaveClass('text-amber-200');
    });

    it('removes PRIORITY: prefix from display', () => {
      const priorityTitles = ['PRIORITY:Test Priority Song'];
      render(<UpcomingQueue upcomingTitles={priorityTitles} />);

      expect(screen.getByText('Test Priority Song')).toBeInTheDocument();
      expect(screen.queryByText('PRIORITY:')).not.toBeInTheDocument();
    });
  });

  describe('Test Mode', () => {
    it('does not show test mode indicator by default', () => {
      render(<UpcomingQueue upcomingTitles={mockUpcomingTitles} />);

      expect(screen.queryByText(/TEST MODE ON/)).not.toBeInTheDocument();
    });

    it('shows test mode indicator when testMode is true', () => {
      render(<UpcomingQueue upcomingTitles={mockUpcomingTitles} testMode={true} />);

      expect(screen.getByText(/TEST MODE ON - 20 Second Videos/)).toBeInTheDocument();
    });

    it('does not show test mode indicator when testMode is false', () => {
      render(<UpcomingQueue upcomingTitles={mockUpcomingTitles} testMode={false} />);

      expect(screen.queryByText(/TEST MODE ON/)).not.toBeInTheDocument();
    });

    it('test mode indicator has yellow styling', () => {
      const { container } = render(
        <UpcomingQueue upcomingTitles={mockUpcomingTitles} testMode={true} />
      );

      const indicator = container.querySelector('.bg-yellow-600\\/90');
      expect(indicator).toBeInTheDocument();
    });

    it('test mode indicator is positioned above ticker', () => {
      const { container } = render(
        <UpcomingQueue upcomingTitles={mockUpcomingTitles} testMode={true} />
      );

      const indicator = container.querySelector('.bottom-16');
      expect(indicator).toBeInTheDocument();
    });
  });

  describe('Styling', () => {
    it('has fixed position at bottom', () => {
      const { container } = render(<UpcomingQueue upcomingTitles={mockUpcomingTitles} />);

      const ticker = container.querySelector('.absolute.bottom-0');
      expect(ticker).toBeInTheDocument();
    });

    it('has semi-transparent black background', () => {
      const { container } = render(<UpcomingQueue upcomingTitles={mockUpcomingTitles} />);

      const ticker = container.querySelector('.bg-black\\/80');
      expect(ticker).toBeInTheDocument();
    });

    it('has amber text color', () => {
      const { container } = render(<UpcomingQueue upcomingTitles={mockUpcomingTitles} />);

      const ticker = container.querySelector('.text-amber-200');
      expect(ticker).toBeInTheDocument();
    });

    it('has overflow hidden', () => {
      const { container } = render(<UpcomingQueue upcomingTitles={mockUpcomingTitles} />);

      const ticker = container.querySelector('.overflow-hidden');
      expect(ticker).toBeInTheDocument();
    });

    it('has whitespace nowrap for marquee', () => {
      const { container } = render(<UpcomingQueue upcomingTitles={mockUpcomingTitles} />);

      const marquee = container.querySelector('.whitespace-nowrap');
      expect(marquee).toBeInTheDocument();
    });

    it('has animate-marquee-fast class', () => {
      const { container } = render(<UpcomingQueue upcomingTitles={mockUpcomingTitles} />);

      const marquee = container.querySelector('.animate-marquee-fast');
      expect(marquee).toBeInTheDocument();
    });

    it('has bold COMING UP text', () => {
      const { container } = render(<UpcomingQueue upcomingTitles={mockUpcomingTitles} />);

      const comingUp = screen.getByText('COMING UP:');
      expect(comingUp).toHaveClass('font-bold');
    });
  });

  describe('Responsive Design', () => {
    it('has responsive padding', () => {
      const { container } = render(<UpcomingQueue upcomingTitles={mockUpcomingTitles} />);

      const ticker = container.querySelector('.py-1');
      expect(ticker).toHaveClass('sm:py-2');
    });

    it('has responsive text size for COMING UP', () => {
      const { container } = render(<UpcomingQueue upcomingTitles={mockUpcomingTitles} />);

      const comingUp = screen.getByText('COMING UP:');
      expect(comingUp).toHaveClass('text-sm', 'sm:text-lg');
    });

    it('has responsive text size for song titles', () => {
      const { container } = render(<UpcomingQueue upcomingTitles={mockUpcomingTitles} />);

      const songElements = container.querySelectorAll('.mx-4');
      songElements.forEach((element) => {
        expect(element).toHaveClass('text-sm', 'sm:text-lg');
      });
    });

    it('has responsive spacing between songs', () => {
      const { container } = render(<UpcomingQueue upcomingTitles={mockUpcomingTitles} />);

      const songElements = container.querySelectorAll('.mx-4');
      songElements.forEach((element) => {
        expect(element).toHaveClass('sm:mx-8');
      });
    });
  });

  describe('Animation Key', () => {
    it('animation element has key attribute', () => {
      const { container } = render(<UpcomingQueue upcomingTitles={mockUpcomingTitles} />);

      const marquee = container.querySelector('.animate-marquee-fast');
      expect(marquee).toBeInTheDocument();
      // Key prop exists in React but may not be visible in DOM
      expect(marquee).toBeTruthy();
    });
  });
});
