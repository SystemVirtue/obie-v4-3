import { supabase } from "@/integrations/supabase/client";

export interface SearchResult {
  id: string;
  title: string;
  channelTitle: string;
  thumbnailUrl: string;
  videoUrl: string;
  officialScore?: number;
  duration?: string;
  durationMinutes?: number;
}

export type SearchMethod = "scraper" | "iframe_search";

class MusicSearchService {
  private lastSearchTimes: { [key: string]: number } = {};
  private readonly MIN_SEARCH_INTERVAL = 1000;

  constructor() {
    console.log("MusicSearchService initialized - Using keyless scraper");
  }

  async searchWithScraper(
    query: string,
    maxResults: number = 48,
  ): Promise<SearchResult[]> {
    try {
      const searchKey = `scraper-${query}`;
      const now = Date.now();
      const lastSearch = this.lastSearchTimes[searchKey] || 0;

      if (now - lastSearch < this.MIN_SEARCH_INTERVAL) {
        console.log(`[MusicSearch] Rate limited search for query: ${query}`);
        throw new Error("Search rate limited. Please wait.");
      }

      this.lastSearchTimes[searchKey] = now;

      console.log(`[MusicSearch] Calling Supabase scraper for: ${query}`);
      
      const { data, error } = await supabase.functions.invoke('youtube-scraper', {
        body: JSON.stringify({
          action: 'search',
          query,
          limit: maxResults,
        }),
      });

      if (error) {
        console.error('[MusicSearch] Scraper error:', error);
        throw new Error(`Scraper failed: ${error.message}`);
      }

      if (!data?.videos || !Array.isArray(data.videos)) {
        console.error('[MusicSearch] Invalid scraper response:', data);
        return [];
      }

      const results: SearchResult[] = data.videos.map((video: any) => ({
        id: video.id,
        title: video.title,
        channelTitle: video.channelTitle,
        thumbnailUrl: video.thumbnailUrl,
        videoUrl: video.videoUrl,
        duration: video.duration,
        durationMinutes: video.durationMinutes,
        officialScore: 0,
      }));

      console.log(`[MusicSearch] Scraper returned ${results.length} results`);
      return this.filterForOfficial(results, query);
    } catch (error) {
      console.error("Scraper search error:", error);
      throw error;
    }
  }

  async search(
    query: string,
    method: SearchMethod,
    apiKey?: string,
    maxResults: number = 48,
  ): Promise<SearchResult[]> {
    switch (method) {
      case "scraper":
        return this.searchWithScraper(query, maxResults);

      case "iframe_search":
        console.log(`[MusicSearch] Using iframe proxy fallback: ${query}`);
        try {
          const searchUrl = `http://localhost:4321/api/search?query=${encodeURIComponent(query)}&maxResults=${maxResults}`;
          const response = await fetch(searchUrl);
          if (!response.ok) {
            throw new Error(`Proxy search failed: ${response.status}`);
          }
          const data = await response.json();
          if (!data.results || !Array.isArray(data.results)) {
            throw new Error("Malformed search response from proxy");
          }
          return data.results.map((video: any) => ({
            id: video.id,
            title: video.title,
            channelTitle: video.channelTitle,
            thumbnailUrl: video.thumbnailUrl,
            videoUrl: video.videoUrl,
            duration: video.duration,
            officialScore: 0,
          }));
        } catch (err) {
          console.error("Proxy search error:", err);
          throw new Error("Unable to fetch search results from proxy backend.");
        }

      default:
        throw new Error(`Unsupported search method: ${method}`);
    }
  }


  private filterForOfficial(
    videos: SearchResult[],
    originalQuery: string,
  ): SearchResult[] {
    const officialKeywords = [
      "official video",
      "official music video",
      "official audio",
      "official lyric video",
      "vevo",
      "official channel",
    ];

    return videos
      .map((video) => {
        let score = 0;
        const titleLower = video.title.toLowerCase();
        const channelTitleLower = video.channelTitle.toLowerCase();

        if (channelTitleLower.includes("vevo")) score += 10;

        for (const keyword of officialKeywords) {
          if (titleLower.includes(keyword)) {
            score += 3;
            break;
          }
        }

        if (channelTitleLower.includes("official")) score += 3;
        if (titleLower.includes("cover") || titleLower.includes("remix"))
          score -= 5;
        if (titleLower.includes("karaoke")) score += 3;

        return {
          ...video,
          officialScore: score,
        };
      })
      .filter((video) => (video.officialScore || 0) >= 0)
      .sort((a, b) => (b.officialScore || 0) - (a.officialScore || 0));
  }
}

export const musicSearchService = new MusicSearchService();
