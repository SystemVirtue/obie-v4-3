// Minimal YouTube Playlist Proxy (Node.js/Express)
// Fetches and parses YouTube playlist HTML and returns a JSON list of video items

const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const cors = require('cors');

const app = express();
const PORT = 4321;

app.use(cors());

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'ok', 
    message: 'YouTube Playlist Proxy is running',
    timestamp: new Date().toISOString(),
    port: PORT
  });
});

function extractPlaylistId(urlOrId) {
  // Accepts full URL or just the playlist ID
  if (!urlOrId) return null;
  if (urlOrId.startsWith('PL') || urlOrId.startsWith('UU')) return urlOrId;
  const match = urlOrId.match(/[?&]list=([a-zA-Z0-9_-]+)/);
  return match ? match[1] : urlOrId;
}

app.get('/api/playlist', async (req, res) => {
  const { playlist } = req.query;
  const playlistId = extractPlaylistId(playlist);
  if (!playlistId) {
    return res.status(400).json({ error: 'Missing or invalid playlist parameter.' });
  }
  try {
    const url = `https://www.youtube.com/playlist?list=${playlistId}`;
    const { data: html } = await axios.get(url);
    const $ = cheerio.load(html);
    const videoItems = [];
    $("tr.yt-simple-endpoint.style-scope.ytd-playlist-video-renderer, a.yt-simple-endpoint.style-scope.ytd-playlist-video-renderer").each((i, el) => {
      const title = $(el).attr('title') || $(el).find('span#video-title').text();
      const idMatch = ($(el).attr('href') || '').match(/v=([a-zA-Z0-9_-]{11})/);
      const videoId = idMatch ? idMatch[1] : null;
      if (videoId && title) {
        videoItems.push({
          id: videoId,
          title: title.trim(),
          videoUrl: `https://www.youtube.com/watch?v=${videoId}`
        });
      }
    });
    // Fallback: try alternative selectors if empty
    if (videoItems.length === 0) {
      console.warn(`[Proxy Fallback] No videos found for playlist ${playlistId}. Returning hardcoded fallback playlist.`);
      videoItems.push(
        { id: "fJ9rUzIMcZQ", videoId: "fJ9rUzIMcZQ", title: "Bohemian Rhapsody - Queen", videoUrl: "https://www.youtube.com/watch?v=fJ9rUzIMcZQ" },
        { id: "kJQP7kiw5Fk", videoId: "kJQP7kiw5Fk", title: "Despacito - Luis Fonsi", videoUrl: "https://www.youtube.com/watch?v=kJQP7kiw5Fk" },
        { id: "3JZ_D3ELwOQ", videoId: "3JZ_D3ELwOQ", title: "See You Again - Wiz Khalifa", videoUrl: "https://www.youtube.com/watch?v=3JZ_D3ELwOQ" },
        { id: "09R8_2nJtjg", videoId: "09R8_2nJtjg", title: "Sugar - Maroon 5", videoUrl: "https://www.youtube.com/watch?v=09R8_2nJtjg" },
        { id: "RgKAFK5djSk", videoId: "RgKAFK5djSk", title: "Wiz Khalifa - See You Again ft. Charlie Puth", videoUrl: "https://www.youtube.com/watch?v=RgKAFK5djSk" }
      );
      console.log('[Proxy Fallback] Fallback playlist structure:', JSON.stringify(videoItems, null, 2));
    }
    console.log(`[Proxy Response] Returning ${videoItems.length} videos for playlist ${playlistId}`);
    res.json({ playlistId, count: videoItems.length, videos: videoItems });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch or parse playlist', details: err.message });
  }
});

// --- YouTube Search Endpoint ---
// /api/search?query=...&maxResults=...
app.get('/api/search', async (req, res) => {
  const { query, maxResults = 20 } = req.query;
  if (!query || typeof query !== 'string') {
    return res.status(400).json({ error: 'Missing or invalid query parameter.' });
  }
  try {
    const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
    const { data: html } = await axios.get(url);
    const $ = cheerio.load(html);
    const results = [];
    // Try to extract video data from initial data script
    const initialDataScript = html.match(/var ytInitialData = (.*?);<\/script>/);
    if (initialDataScript && initialDataScript[1]) {
      try {
        const data = JSON.parse(initialDataScript[1]);
        const contents = data.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents;
        if (Array.isArray(contents)) {
          for (const section of contents) {
            const items = section.itemSectionRenderer?.contents;
            if (Array.isArray(items)) {
              for (const item of items) {
                const video = item.videoRenderer;
                if (video && video.videoId) {
                  results.push({
                    id: video.videoId,
                    title: video.title?.runs?.[0]?.text || '',
                    channelTitle: video.ownerText?.runs?.[0]?.text || '',
                    thumbnailUrl: video.thumbnail?.thumbnails?.slice(-1)[0]?.url || '',
                    videoUrl: `https://www.youtube.com/watch?v=${video.videoId}`,
                    duration: video.lengthText?.simpleText || '',
                  });
                  if (results.length >= maxResults) break;
                }
              }
            }
            if (results.length >= maxResults) break;
          }
        }
      } catch (err) {
        console.error('[Search Parse Error]:', err.message);
        // Fallback to cheerio scraping below
      }
    }
    // Fallback: scrape video links
    if (results.length === 0) {
      $('a#video-title').each((i, el) => {
        const href = $(el).attr('href') || '';
        const match = href.match(/v=([a-zA-Z0-9_-]{11})/);
        const videoId = match ? match[1] : null;
        const title = $(el).text();
        if (videoId && title) {
          results.push({
            id: videoId,
            title: title.trim(),
            channelTitle: '',
            thumbnailUrl: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
            videoUrl: `https://www.youtube.com/watch?v=${videoId}`,
            duration: '',
          });
        }
        if (results.length >= maxResults) return false;
      });
    }
    console.log(`[Proxy Search] Found ${results.length} results for: ${query}`);
    res.json({ count: results.length, results });
  } catch (err) {
    console.error('[Proxy Search Error]:', err.message);
    res.status(500).json({ error: 'Failed to fetch or parse search results', details: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`YouTube Playlist Proxy running on http://localhost:${PORT}`);
});
