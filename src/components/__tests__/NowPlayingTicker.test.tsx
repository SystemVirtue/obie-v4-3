import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import { render } from '@/test/utils/test-utils';
import { NowPlayingTicker } from '../NowPlayingTicker';

describe('NowPlayingTicker', () => {
  describe('Rendering', () => {
    it('renders with currently playing text', () => {
      render(<NowPlayingTicker currentlyPlaying="Test Song - Test Artist" />);

      expect(screen.getByText(/Now Playing:/)).toBeInTheDocument();
      expect(screen.getByText(/Test Song - Test Artist/)).toBeInTheDocument();
    });

    it('renders with loading status', () => {
      render(<NowPlayingTicker currentlyPlaying="Loading..." />);

      expect(screen.getByText(/Now Playing:/)).toBeInTheDocument();
      expect(screen.getByText(/Loading\.\.\./)).toBeInTheDocument();
    });

    it('renders with empty string', () => {
      render(<NowPlayingTicker currentlyPlaying="" />);

      expect(screen.getByText('Now Playing:')).toBeInTheDocument();
    });

    it('renders with long song title', () => {
      const longTitle = 'This is a very long song title that should be truncated by the CSS truncate class to prevent overflow and maintain layout integrity';
      render(<NowPlayingTicker currentlyPlaying={longTitle} />);

      expect(screen.getByText(new RegExp(longTitle))).toBeInTheDocument();
    });
  });

  describe('Styling', () => {
    it('has fixed positioning', () => {
      const { container } = render(<NowPlayingTicker currentlyPlaying="Test Song" />);

      const ticker = container.querySelector('.absolute');
      expect(ticker).toBeInTheDocument();
      expect(ticker).toHaveClass('top-2', 'left-2');
    });

    it('has high z-index for visibility', () => {
      const { container } = render(<NowPlayingTicker currentlyPlaying="Test Song" />);

      const ticker = container.querySelector('.z-20');
      expect(ticker).toBeInTheDocument();
    });

    it('has yellow border on card', () => {
      const { container } = render(<NowPlayingTicker currentlyPlaying="Test Song" />);

      const card = container.querySelector('.border-yellow-400');
      expect(card).toBeInTheDocument();
    });

    it('has backdrop blur effect', () => {
      const { container } = render(<NowPlayingTicker currentlyPlaying="Test Song" />);

      const card = container.querySelector('.backdrop-blur-sm');
      expect(card).toBeInTheDocument();
    });

    it('has semi-transparent background', () => {
      const { container } = render(<NowPlayingTicker currentlyPlaying="Test Song" />);

      const card = container.querySelector('.bg-black\\/60');
      expect(card).toBeInTheDocument();
    });

    it('has truncate class on text', () => {
      const { container } = render(<NowPlayingTicker currentlyPlaying="Test Song" />);

      const text = container.querySelector('.truncate');
      expect(text).toBeInTheDocument();
    });

    it('has responsive text sizing', () => {
      const { container } = render(<NowPlayingTicker currentlyPlaying="Test Song" />);

      const text = container.querySelector('.text-sm');
      expect(text).toHaveClass('sm:text-lg');
    });

    it('has amber text color', () => {
      const { container } = render(<NowPlayingTicker currentlyPlaying="Test Song" />);

      const text = container.querySelector('.text-amber-100');
      expect(text).toBeInTheDocument();
    });
  });

  describe('Responsive Design', () => {
    it('has responsive positioning', () => {
      const { container } = render(<NowPlayingTicker currentlyPlaying="Test Song" />);

      const ticker = container.querySelector('.absolute');
      expect(ticker).toHaveClass('sm:top-4', 'sm:left-4');
    });

    it('has responsive padding', () => {
      const { container } = render(<NowPlayingTicker currentlyPlaying="Test Song" />);

      const content = container.querySelector('.p-2');
      expect(content).toHaveClass('sm:p-3');
    });

    it('has responsive max-width', () => {
      const { container } = render(<NowPlayingTicker currentlyPlaying="Test Song" />);

      const ticker = container.querySelector('.max-w-\\[calc\\(100vw-1rem\\)\\]');
      expect(ticker).toBeInTheDocument();
    });
  });
});
