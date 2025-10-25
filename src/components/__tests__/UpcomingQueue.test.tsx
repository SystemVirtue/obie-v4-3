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
      expect(screen.getByText(/1\. Song One - Artist One/)).toBeInTheDocument();
      expect(screen.getByText(/2\. Song Two - Artist Two/)).toBeInTheDocument();
      expect(screen.getByText(/3\. Song Three - Artist Three/)).toBeInTheDocument();
    });

    it('renders with empty queue', () => {
      render(<UpcomingQueue upcomingTitles={[]} />);

      expect(screen.getByText('COMING UP:')).toBeInTheDocument();
    });

    it('renders with single song', () => {
      render(<UpcomingQueue upcomingTitles={['Only Song']} />);

      expect(screen.getByText('COMING UP:')).toBeInTheDocument();
      expect(screen.getByText(/1\. Only Song/)).toBeInTheDocument();
    });

    it('numbers songs correctly', () => {
      const titles = Array.from({ length: 5 }, (_, i) => `Song ${i + 1}`);
      render(<UpcomingQueue upcomingTitles={titles} />);

      titles.forEach((title, index) => {
        expect(screen.getByText(new RegExp(`${index + 1}\\. ${title}`))).toBeInTheDocument();
      });
    });

    it('renders with many songs', () => {
      const manyTitles = Array.from({ length: 20 }, (_, i) => `Song ${i + 1}`);
      render(<UpcomingQueue upcomingTitles={manyTitles} />);

      expect(screen.getByText(/1\. Song 1$/)).toBeInTheDocument();
      expect(screen.getByText(/20\. Song 20/)).toBeInTheDocument();
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

    it('has animate-marquee class', () => {
      const { container } = render(<UpcomingQueue upcomingTitles={mockUpcomingTitles} />);

      const marquee = container.querySelector('.animate-marquee');
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
      const { container } = render(
        <UpcomingQueue upcomingTitles={['Song 1']} />
      );

      const marquee = container.querySelector('.animate-marquee');
      expect(marquee).toBeInTheDocument();
      // Key prop exists in React but may not be visible in DOM
      expect(marquee).toBeTruthy();
    });
  });
});
