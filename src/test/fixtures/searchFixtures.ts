import { SearchResult } from '@/types/search';

export const createMockSearchResult = (
  overrides?: Partial<SearchResult>
): SearchResult => ({
  id: 'test-video-id',
  title: 'Test Song Title',
  channelTitle: 'Test Artist',
  thumbnailUrl: 'https://example.com/thumbnail.jpg',
  videoUrl: 'https://youtube.com/watch?v=test-video-id',
  duration: '3:45',
  officialScore: 0.9,
  ...overrides,
});

export const createMockSearchResults = (count: number): SearchResult[] =>
  Array.from({ length: count }, (_, i) =>
    createMockSearchResult({
      id: `test-video-${i}`,
      title: `Test Song ${i + 1}`,
    })
  );
