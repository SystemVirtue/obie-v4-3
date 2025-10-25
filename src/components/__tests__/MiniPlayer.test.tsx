import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import { render } from '@/test/utils/test-utils';
import { MiniPlayer } from '../MiniPlayer';

describe('MiniPlayer', () => {
  const mockVideoId = 'dQw4w9WgXcQ';

  describe('Rendering', () => {
    it('renders when showMiniPlayer is true and videoId is provided', () => {
      render(<MiniPlayer videoId={mockVideoId} showMiniPlayer={true} />);

      const iframe = screen.getByTitle('Mini Player');
      expect(iframe).toBeInTheDocument();
    });

    it('does not render when showMiniPlayer is false', () => {
      render(<MiniPlayer videoId={mockVideoId} showMiniPlayer={false} />);

      const iframe = screen.queryByTitle('Mini Player');
      expect(iframe).not.toBeInTheDocument();
    });

    it('does not render when videoId is empty', () => {
      render(<MiniPlayer videoId="" showMiniPlayer={true} />);

      const iframe = screen.queryByTitle('Mini Player');
      expect(iframe).not.toBeInTheDocument();
    });

    it('does not render when both showMiniPlayer is false and videoId is empty', () => {
      render(<MiniPlayer videoId="" showMiniPlayer={false} />);

      const iframe = screen.queryByTitle('Mini Player');
      expect(iframe).not.toBeInTheDocument();
    });

    it('returns null when not shown', () => {
      const { container } = render(<MiniPlayer videoId={mockVideoId} showMiniPlayer={false} />);

      expect(container.firstChild).toBeNull();
    });
  });

  describe('YouTube Embed', () => {
    it('embeds correct YouTube video URL', () => {
      render(<MiniPlayer videoId={mockVideoId} showMiniPlayer={true} />);

      const iframe = screen.getByTitle('Mini Player') as HTMLIFrameElement;
      expect(iframe.src).toContain(`https://www.youtube.com/embed/${mockVideoId}`);
    });

    it('includes autoplay parameter', () => {
      render(<MiniPlayer videoId={mockVideoId} showMiniPlayer={true} />);

      const iframe = screen.getByTitle('Mini Player') as HTMLIFrameElement;
      expect(iframe.src).toContain('autoplay=1');
    });

    it('includes mute parameter', () => {
      render(<MiniPlayer videoId={mockVideoId} showMiniPlayer={true} />);

      const iframe = screen.getByTitle('Mini Player') as HTMLIFrameElement;
      expect(iframe.src).toContain('mute=1');
    });

    it('disables controls', () => {
      render(<MiniPlayer videoId={mockVideoId} showMiniPlayer={true} />);

      const iframe = screen.getByTitle('Mini Player') as HTMLIFrameElement;
      expect(iframe.src).toContain('controls=0');
    });

    it('hides video info', () => {
      render(<MiniPlayer videoId={mockVideoId} showMiniPlayer={true} />);

      const iframe = screen.getByTitle('Mini Player') as HTMLIFrameElement;
      expect(iframe.src).toContain('showinfo=0');
    });

    it('disables related videos', () => {
      render(<MiniPlayer videoId={mockVideoId} showMiniPlayer={true} />);

      const iframe = screen.getByTitle('Mini Player') as HTMLIFrameElement;
      expect(iframe.src).toContain('rel=0');
    });

    it('enables modest branding', () => {
      render(<MiniPlayer videoId={mockVideoId} showMiniPlayer={true} />);

      const iframe = screen.getByTitle('Mini Player') as HTMLIFrameElement;
      expect(iframe.src).toContain('modestbranding=1');
    });

    it('disables keyboard controls', () => {
      render(<MiniPlayer videoId={mockVideoId} showMiniPlayer={true} />);

      const iframe = screen.getByTitle('Mini Player') as HTMLIFrameElement;
      expect(iframe.src).toContain('disablekb=1');
    });

    it('disables fullscreen', () => {
      render(<MiniPlayer videoId={mockVideoId} showMiniPlayer={true} />);

      const iframe = screen.getByTitle('Mini Player') as HTMLIFrameElement;
      expect(iframe.allowFullscreen).toBe(false);
    });
  });

  describe('Styling', () => {
    it('has centered container', () => {
      const { container } = render(<MiniPlayer videoId={mockVideoId} showMiniPlayer={true} />);

      const wrapper = container.querySelector('.flex.justify-center');
      expect(wrapper).toBeInTheDocument();
    });

    it('has rounded corners', () => {
      const { container } = render(<MiniPlayer videoId={mockVideoId} showMiniPlayer={true} />);

      const playerContainer = container.querySelector('.rounded-lg');
      expect(playerContainer).toBeInTheDocument();
    });

    it('has shadow effect', () => {
      const { container } = render(<MiniPlayer videoId={mockVideoId} showMiniPlayer={true} />);

      const playerContainer = container.querySelector('.shadow-2xl');
      expect(playerContainer).toBeInTheDocument();
    });

    it('has overflow hidden', () => {
      const { container } = render(<MiniPlayer videoId={mockVideoId} showMiniPlayer={true} />);

      const playerContainer = container.querySelector('.overflow-hidden');
      expect(playerContainer).toBeInTheDocument();
    });

    it('has vignette overlay', () => {
      const { container } = render(<MiniPlayer videoId={mockVideoId} showMiniPlayer={true} />);

      const vignette = container.querySelector('.shadow-\\[inset_0_0_30px_10px_rgba\\(0\\,0\\,0\\,0\\.6\\)\\]');
      expect(vignette).toBeInTheDocument();
    });

    it('vignette is non-interactive', () => {
      const { container } = render(<MiniPlayer videoId={mockVideoId} showMiniPlayer={true} />);

      const vignette = container.querySelector('.pointer-events-none');
      expect(vignette).toBeInTheDocument();
    });

    it('iframe is non-interactive', () => {
      render(<MiniPlayer videoId={mockVideoId} showMiniPlayer={true} />);

      const iframe = screen.getByTitle('Mini Player') as HTMLIFrameElement;
      expect(iframe.style.pointerEvents).toBe('none');
    });

    it('iframe has no border', () => {
      render(<MiniPlayer videoId={mockVideoId} showMiniPlayer={true} />);

      const iframe = screen.getByTitle('Mini Player');
      expect(iframe).toHaveClass('border-0');
    });
  });

  describe('Responsive Design', () => {
    it('has responsive bottom margin', () => {
      const { container } = render(<MiniPlayer videoId={mockVideoId} showMiniPlayer={true} />);

      const wrapper = container.querySelector('.mb-4');
      expect(wrapper).toHaveClass('sm:mb-8');
    });

    it('has responsive horizontal padding', () => {
      const { container } = render(<MiniPlayer videoId={mockVideoId} showMiniPlayer={true} />);

      const wrapper = container.querySelector('.px-4');
      expect(wrapper).toBeInTheDocument();
    });

    it('has responsive width', () => {
      const { container } = render(<MiniPlayer videoId={mockVideoId} showMiniPlayer={true} />);

      const playerContainer = container.querySelector('.w-40');
      expect(playerContainer).toHaveClass('sm:w-48');
    });

    it('has responsive height', () => {
      const { container } = render(<MiniPlayer videoId={mockVideoId} showMiniPlayer={true} />);

      const playerContainer = container.querySelector('.h-24');
      expect(playerContainer).toHaveClass('sm:h-27');
    });
  });

  describe('Iframe Attributes', () => {
    it('has correct allow attribute', () => {
      render(<MiniPlayer videoId={mockVideoId} showMiniPlayer={true} />);

      const iframe = screen.getByTitle('Mini Player') as HTMLIFrameElement;
      const allowAttr = iframe.getAttribute('allow') || '';
      expect(allowAttr).toContain('autoplay');
      expect(allowAttr).toContain('encrypted-media');
    });

    it('has proper title for accessibility', () => {
      render(<MiniPlayer videoId={mockVideoId} showMiniPlayer={true} />);

      const iframe = screen.getByTitle('Mini Player');
      expect(iframe).toBeInTheDocument();
    });

    it('spans full width and height of container', () => {
      render(<MiniPlayer videoId={mockVideoId} showMiniPlayer={true} />);

      const iframe = screen.getByTitle('Mini Player');
      expect(iframe).toHaveClass('w-full', 'h-full');
    });
  });
});
