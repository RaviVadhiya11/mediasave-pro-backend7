const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

const app = express();
const PORT = process.env.PORT || 3000;

// GitHub Pages origin is the domain origin (not the repository path).
const configuredOrigins = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map(value => value.trim())
  .filter(Boolean)
  .map(value => {
    try { return new URL(value).origin; } catch { return value.replace(/\/$/, ''); }
  });

const allowedOrigins = new Set([
  'https://vivadhiya11.github.io',
  'http://localhost:3000',
  ...configuredOrigins
]);

app.disable('x-powered-by');
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.has(origin)) return callback(null, true);
    return callback(new Error('Origin not allowed by CORS'));
  },
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.options('*', cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.has(origin)) return callback(null, true);
    return callback(new Error('Origin not allowed by CORS'));
  },
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '20kb' }));
app.use('/api/', rateLimit({
  windowMs: 60 * 1000,
  limit: 60,
  standardHeaders: 'draft-7',
  legacyHeaders: false
}));

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', service: 'MediaSave Pro API', version: '3.1.0' });
});

app.get('/api/providers', (_req, res) => {
  res.json({
    providers: [
      {
        id: 'instagram',
        status: process.env.INSTAGRAM_ACCESS_TOKEN ? 'configured' : 'not-configured',
        method: 'official-instagram-login',
        endpoint: '/api/instagram/media'
      },
      { id: 'youtube', status: 'not-configured', method: 'official-authorized-integration-only' },
      { id: 'facebook', status: 'not-configured', method: 'official-authorized-integration-only' }
    ],
    note: 'Instagram endpoint lists media for the authorized professional account only. No public-account scraping, DRM bypass, login-wall bypass or unauthorized extraction is provided.'
  });
});

// Lists media belonging to the Instagram Professional account that authorized this app.
// The token is read only from Render environment variables and is never returned to the browser.
app.get('/api/instagram/media', async (req, res) => {
  const token = process.env.INSTAGRAM_ACCESS_TOKEN;
  if (!token) {
    return res.status(503).json({
      error: 'Instagram is not configured on the server.',
      requiredEnvironmentVariable: 'INSTAGRAM_ACCESS_TOKEN'
    });
  }

  const requestedLimit = Number.parseInt(req.query.limit, 10);
  const limit = Number.isFinite(requestedLimit)
    ? Math.min(Math.max(requestedLimit, 1), 25)
    : 15;
  const version = process.env.INSTAGRAM_GRAPH_VERSION || 'v27.0';

  try {
    const url = new URL(`https://graph.instagram.com/${version}/me/media`);
    url.searchParams.set(
      'fields',
      'id,caption,media_type,media_url,permalink,timestamp,thumbnail_url'
    );
    url.searchParams.set('limit', String(limit));

    const upstream = await fetch(url, {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` }
    });
    const payload = await upstream.json().catch(() => ({}));

    if (!upstream.ok) {
      // Do not forward token, request URL, or raw upstream diagnostics to the client.
      return res.status(502).json({
        error: 'Instagram rejected the authorized media request.',
        upstreamStatus: upstream.status,
        details: payload.error?.message || 'Check token validity, Instagram account role, API version and instagram_business_basic permission.'
      });
    }

    const media = Array.isArray(payload.data) ? payload.data.map(item => ({
      id: item.id,
      caption: item.caption || '',
      media_type: item.media_type || 'UNKNOWN',
      media_url: item.media_url || null,
      thumbnail_url: item.thumbnail_url || null,
      permalink: item.permalink || null,
      timestamp: item.timestamp || null
    })) : [];

    return res.json({
      status: 'ok',
      provider: 'instagram',
      count: media.length,
      media,
      paging: payload.paging || null
    });
  } catch (_error) {
    return res.status(502).json({
      error: 'Could not contact Instagram. Please retry later.'
    });
  }
});

app.post('/api/resolve', (req, res) => {
  const raw = String(req.body?.url || '');
  let url;
  try {
    url = new URL(raw);
  } catch {
    return res.status(400).json({ error: 'A valid URL is required.' });
  }

  if (!['http:', 'https:'].includes(url.protocol)) {
    return res.status(400).json({ error: 'Only HTTP and HTTPS URLs are accepted.' });
  }

  const host = url.hostname.toLowerCase();
  const social = /(^|\\.)(instagram\\.com|youtube\\.com|youtu\\.be|facebook\\.com|fb\\.watch)$/i.test(host);
  if (social) {
    return res.status(422).json({
      error: 'This is a social-media post URL, not a direct media file.',
      guidance: 'Use the authorized Instagram account media list or the platform’s official download/export options.'
    });
  }

  return res.status(501).json({
    error: 'No generic remote-file resolver is enabled.',
    guidance: 'Use a direct media URL from a source that permits browser access, or load your own Instagram media through /api/instagram/media.'
  });
});

app.use((err, _req, res, _next) => {
  if (err.message === 'Origin not allowed by CORS') {
    return res.status(403).json({ error: 'Website origin is not allowed. Check ALLOWED_ORIGINS in Render.' });
  }
  return res.status(500).json({ error: 'Internal server error.' });
});

app.listen(PORT, () => console.log(`MediaSave Pro API listening on ${PORT}`));
