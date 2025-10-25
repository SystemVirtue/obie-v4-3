import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { render } from '@/test/utils/test-utils';
import { VideoResultCard } from '../VideoResultCard';
import { createMockSearchResult } from '@/test/fixtures/searchFixtures';

describe('VideoResultCard', () => {
  const mockVideo = createMockSearchResult({
    id: 'test-video-123',
    title: 'Test Song - Official Music Video',
    channelTitle: 'Test Artist',
    thumbnailUrl: 'https://example.com/thumb.jpg',
    duration: '3:45',
  });

  const mockOnClick = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Grid Variant', () => {
    it('renders video information in grid layout', () => {
      render(<VideoResultCard video={mockVideo} onClick={mockOnClick} variant="grid" />);

      expect(screen.getByText('Test Song - Official Music Video')).toBeInTheDocument();
      expect(screen.getByText('Test Artist')).toBeInTheDocument();
      expect(screen.getByText('3:45')).toBeInTheDocument();
    });

    it('renders thumbnail image with correct attributes', () => {
      render(<VideoResultCard video={mockVideo} onClick={mockOnClick} variant="grid" />);

      const img = screen.getByAltText('Test Song - Official Music Video');
      expect(img).toHaveAttribute('src', 'https://example.com/thumb.jpg');
      expect(img).toHaveClass('w-full', 'h-32', 'object-cover');
    });

    it('calls onClick with video data when clicked', async () => {
      const user = userEvent.setup();
      render(<VideoResultCard video={mockVideo} onClick={mockOnClick} variant="grid" />);

      const card = screen.getByText('Test Song - Official Music Video').closest('div');
      if (card?.parentElement) {
        await user.click(card.parentElement);
      }

      expect(mockOnClick).toHaveBeenCalledWith(mockVideo);
      expect(mockOnClick).toHaveBeenCalledTimes(1);
    });

    it('renders without duration when not provided', () => {
      const videoWithoutDuration = createMockSearchResult({
        title: 'No Duration Video',
        channelTitle: 'Test Artist',
        duration: undefined,
      });

      render(
        <VideoResultCard video={videoWithoutDuration} onClick={mockOnClick} variant="grid" />
      );

      expect(screen.getByText('No Duration Video')).toBeInTheDocument();
      expect(screen.getByText('Test Artist')).toBeInTheDocument();
      expect(screen.queryByText(/\d:\d{2}/)).not.toBeInTheDocument();
    });

    it('uses grid variant as default when variant is not specified', () => {
      const { container } = render(
        <VideoResultCard video={mockVideo} onClick={mockOnClick} />
      );

      // Grid variant has specific classes
      const gridCard = container.querySelector('.backdrop-blur');
      expect(gridCard).toBeInTheDocument();
    });
  });

  describe('List Variant', () => {
    it('renders video information in list layout', () => {
      render(<VideoResultCard video={mockVideo} onClick={mockOnClick} variant="list" />);

      expect(screen.getByText('Test Song - Official Music Video')).toBeInTheDocument();
      expect(screen.getByText('Test Artist')).toBeInTheDocument();
      expect(screen.getByText('3:45')).toBeInTheDocument();
    });

    it('renders compact thumbnail in list layout', () => {
      render(<VideoResultCard video={mockVideo} onClick={mockOnClick} variant="list" />);

      const img = screen.getByAltText('Test Song - Official Music Video');
      expect(img).toHaveAttribute('src', 'https://example.com/thumb.jpg');
      expect(img).toHaveClass('w-16', 'h-12', 'object-cover', 'rounded');
    });

    it('calls onClick with video data when clicked', async () => {
      const user = userEvent.setup();
      render(<VideoResultCard video={mockVideo} onClick={mockOnClick} variant="list" />);

      const card = screen.getByText('Test Song - Official Music Video').closest('div');
      if (card?.parentElement) {
        await user.click(card.parentElement);
      }

      expect(mockOnClick).toHaveBeenCalledWith(mockVideo);
      expect(mockOnClick).toHaveBeenCalledTimes(1);
    });

    it('renders without duration when not provided', () => {
      const videoWithoutDuration = createMockSearchResult({
        title: 'List Item Without Duration',
        channelTitle: 'List Artist',
        duration: undefined,
      });

      render(
        <VideoResultCard
          video={videoWithoutDuration}
          onClick={mockOnClick}
          variant="list"
        />
      );

      expect(screen.getByText('List Item Without Duration')).toBeInTheDocument();
      expect(screen.getByText('List Artist')).toBeInTheDocument();
      expect(screen.queryByText(/\d:\d{2}/)).not.toBeInTheDocument();
    });

    it('uses flexbox layout for list items', () => {
      const { container } = render(
        <VideoResultCard video={mockVideo} onClick={mockOnClick} variant="list" />
      );

      const flexContainer = container.querySelector('.flex.gap-3');
      expect(flexContainer).toBeInTheDocument();
    });
  });

  describe('Styling and Interactivity', () => {
    it('applies hover styles for grid variant', () => {
      const { container } = render(
        <VideoResultCard video={mockVideo} onClick={mockOnClick} variant="grid" />
      );

      const card = container.querySelector('.hover\\:bg-slate-700\\/80');
      expect(card).toBeInTheDocument();
    });

    it('applies hover styles for list variant', () => {
      const { container } = render(
        <VideoResultCard video={mockVideo} onClick={mockOnClick} variant="list" />
      );

      const card = container.querySelector('.hover\\:bg-slate-600\\/60');
      expect(card).toBeInTheDocument();
    });

    it('has cursor-pointer class for both variants', () => {
      const { container: gridContainer } = render(
        <VideoResultCard video={mockVideo} onClick={mockOnClick} variant="grid" />
      );

      const { container: listContainer } = render(
        <VideoResultCard video={mockVideo} onClick={mockOnClick} variant="list" />
      );

      expect(gridContainer.querySelector('.cursor-pointer')).toBeInTheDocument();
      expect(listContainer.querySelector('.cursor-pointer')).toBeInTheDocument();
    });

    it('truncates long titles with line-clamp', () => {
      const longTitleVideo = createMockSearchResult({
        title:
          'This is a very long video title that should be truncated to fit within the card and not overflow',
        channelTitle: 'Test Artist',
      });

      const { container: gridContainer } = render(
        <VideoResultCard video={longTitleVideo} onClick={mockOnClick} variant="grid" />
      );

      const { container: listContainer } = render(
        <VideoResultCard video={longTitleVideo} onClick={mockOnClick} variant="list" />
      );

      expect(gridContainer.querySelector('.line-clamp-2')).toBeInTheDocument();
      expect(listContainer.querySelector('.line-clamp-2')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has alt text for images in grid variant', () => {
      render(<VideoResultCard video={mockVideo} onClick={mockOnClick} variant="grid" />);

      const img = screen.getByAltText('Test Song - Official Music Video');
      expect(img).toBeInTheDocument();
    });

    it('has alt text for images in list variant', () => {
      render(<VideoResultCard video={mockVideo} onClick={mockOnClick} variant="list" />);

      const img = screen.getByAltText('Test Song - Official Music Video');
      expect(img).toBeInTheDocument();
    });

    it('card is clickable for keyboard navigation', () => {
      render(<VideoResultCard video={mockVideo} onClick={mockOnClick} variant="grid" />);

      const title = screen.getByText('Test Song - Official Music Video');
      const card = title.closest('div')?.parentElement;
      
      expect(card).toHaveClass('cursor-pointer');
    });
  });
});
