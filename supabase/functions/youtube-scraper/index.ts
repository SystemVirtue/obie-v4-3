// Type definitions loaded automatically by Deno runtime

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ScraperRequest {
  action: 'search' | 'playlist';
  query?: string;
  url?: string;
  limit?: number;
}

interface VideoResult {
  id: string;
  title: string;
  channelTitle: string;
  thumbnailUrl: string;
  videoUrl: string;
  duration?: string;
  durationMinutes?: number;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, query, url, limit = 48 }: ScraperRequest = await req.json();
    console.log(`[YouTube Scraper] Action: ${action}, Query: ${query}, Limit: ${limit}`);

    let videos: VideoResult[] = [];

    if (action === 'search' && query) {
      videos = await scrapeYouTubeSearch(query, limit);
    } else if (action === 'playlist' && url) {
      videos = await scrapeYouTubePlaylist(url, limit);
    } else {
      throw new Error('Invalid action or missing parameters');
    }

    return new Response(
      JSON.stringify({ videos }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[YouTube Scraper] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

async function scrapeYouTubeSearch(query: string, limit: number): Promise<VideoResult[]> {
  const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}&sp=EgIQAQ%253D%253D`;
  
  console.log(`[Scraper] Fetching search results from: ${searchUrl}`);
  
  const response = await fetch(searchUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
      'Cookie': '',
    },
    redirect: 'follow', // Handle redirects automatically
  });

  if (!response.ok) {
    throw new Error(`YouTube search failed: ${response.status}`);
  }

  const html = await response.text();
  return parseSearchResults(html, limit);
}

async function scrapeYouTubePlaylist(playlistUrl: string, limit: number): Promise<VideoResult[]> {
  console.log(`[Scraper] Fetching playlist from: ${playlistUrl}`);
  
  const response = await fetch(playlistUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
      'Cookie': '',
    },
    redirect: 'follow', // Handle redirects automatically
  });

  if (!response.ok) {
    throw new Error(`YouTube playlist fetch failed: ${response.status}`);
  }

  const html = await response.text();
  return parsePlaylistResults(html, limit);
}

function parseSearchResults(html: string, limit: number): VideoResult[] {
  const videos: VideoResult[] = [];
  
  // Extract ytInitialData JSON from the page
  const ytInitialDataMatch = html.match(/var ytInitialData = ({.*?});/);
  if (!ytInitialDataMatch) {
    console.error('[Scraper] Could not find ytInitialData in HTML');
    return videos;
  }

  try {
    const data = JSON.parse(ytInitialDataMatch[1]);
    const contents = data?.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents;
    
    if (!contents) {
      console.error('[Scraper] Unexpected data structure');
      return videos;
    }

    for (const section of contents) {
      const items = section?.itemSectionRenderer?.contents || [];
      
      for (const item of items) {
        if (videos.length >= limit) break;
        
        const videoRenderer = item?.videoRenderer;
        if (!videoRenderer) continue;

        const videoId = videoRenderer.videoId;
        const title = videoRenderer.title?.runs?.[0]?.text || 'Unknown Title';
        const channelTitle = videoRenderer.ownerText?.runs?.[0]?.text || 'Unknown Channel';
        const thumbnail = videoRenderer.thumbnail?.thumbnails?.[0]?.url || '';
        const lengthText = videoRenderer.lengthText?.simpleText || '0:00';
        
        videos.push({
          id: videoId,
          title: cleanTitle(title),
          channelTitle,
          thumbnailUrl: thumbnail.startsWith('//') ? `https:${thumbnail}` : thumbnail,
          videoUrl: `https://www.youtube.com/watch?v=${videoId}`,
          duration: lengthText,
          durationMinutes: parseDurationToMinutes(lengthText),
        });
      }
      
      if (videos.length >= limit) break;
    }
  } catch (error) {
    console.error('[Scraper] Error parsing search results:', error);
  }

  console.log(`[Scraper] Parsed ${videos.length} videos from search`);
  return videos;
}

function parsePlaylistResults(html: string, limit: number): VideoResult[] {
  const videos: VideoResult[] = [];
  
  const ytInitialDataMatch = html.match(/var ytInitialData = ({.*?});/);
  if (!ytInitialDataMatch) {
    console.error('[Scraper] Could not find ytInitialData in playlist HTML');
    return videos;
  }

  try {
    const data = JSON.parse(ytInitialDataMatch[1]);
    const contents = data?.contents?.twoColumnBrowseResultsRenderer?.tabs?.[0]?.tabRenderer?.content?.sectionListRenderer?.contents?.[0]?.itemSectionRenderer?.contents?.[0]?.playlistVideoListRenderer?.contents;
    
    if (!contents) {
      console.error('[Scraper] Unexpected playlist data structure');
      return videos;
    }

    for (const item of contents) {
      if (videos.length >= limit) break;
      
      const videoRenderer = item?.playlistVideoRenderer;
      if (!videoRenderer) continue;

      const videoId = videoRenderer.videoId;
      const title = videoRenderer.title?.runs?.[0]?.text || 'Unknown Title';
      const channelTitle = videoRenderer.shortBylineText?.runs?.[0]?.text || 'Unknown Channel';
      const thumbnail = videoRenderer.thumbnail?.thumbnails?.[0]?.url || '';
      const lengthText = videoRenderer.lengthText?.simpleText || '0:00';
      
      videos.push({
        id: videoId,
        title: cleanTitle(title),
        channelTitle,
        thumbnailUrl: thumbnail.startsWith('//') ? `https:${thumbnail}` : thumbnail,
        videoUrl: `https://www.youtube.com/watch?v=${videoId}`,
        duration: lengthText,
        durationMinutes: parseDurationToMinutes(lengthText),
      });
    }
  } catch (error) {
    console.error('[Scraper] Error parsing playlist results:', error);
  }

  console.log(`[Scraper] Parsed ${videos.length} videos from playlist`);
  return videos;
}

function cleanTitle(title: string): string {
  return title.replace(/\([^)]*\)/g, '').trim();
}

function parseDurationToMinutes(duration: string): number {
  const parts = duration.split(':').map(Number);
  if (parts.length === 2) {
    return parts[0] + (parts[1] > 30 ? 1 : 0);
  } else if (parts.length === 3) {
    return parts[0] * 60 + parts[1] + (parts[2] > 30 ? 1 : 0);
  }
  return 0;
}
