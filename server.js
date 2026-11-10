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
  'https://ravivadhiya11.github.io',
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
        status: !process.env.INSTAGRAM_ACCESS_TOKEN
          ? 'not-configured'
          : !process.env.MEDIA_ACCESS_KEY
            ? 'needs-private-access-key'
            : ((process.env.INSTAGRAM_API_MODE || 'unified') === 'unified' && !process.env.INSTAGRAM_USER_ID)
              ? 'needs-account-id'
              : 'configured',
        method: (process.env.INSTAGRAM_API_MODE || 'unified') === 'unified'
          ? 'meta-unified-login-system-user-token'
          : 'instagram-login-user-token',
        endpoint: '/api/instagram/media'
      },
      { id: 'youtube', status: 'not-configured', method: 'official-authorized-integration-only' },
      { id: 'facebook', status: 'not-configured', method: 'official-authorized-integration-only' }
    ],
    note: 'Instagram endpoint lists media for the authorized professional account only. No public-account scraping, DRM bypass, login-wall bypass or unauthorized extraction is provided.'
  });
});

// Private endpoint: requires an owner-held key in addition to the server-side Meta token.
app.get('/api/instagram/media', async (req, res) => {
  const accessKey = process.env.MEDIA_ACCESS_KEY;
  const suppliedKey = String(req.get('Authorization') || '').replace(/^Bearer\s+/i, '');
  if (!accessKey) {
    return res.status(503).json({
      error: 'Private media access is not configured on the server.',
      requiredEnvironmentVariable: 'MEDIA_ACCESS_KEY'
    });
  }
  const crypto = require('crypto');
  const expected = Buffer.from(accessKey);
  const supplied = Buffer.from(suppliedKey);
  const keyMatches = expected.length === supplied.length &&
    crypto.timingSafeEqual(expected, supplied);
  if (!keyMatches) {
    return res.status(401).json({ error: 'Private access key is missing or incorrect.' });
  }

  const token = process.env.INSTAGRAM_ACCESS_TOKEN;
  const mode = (process.env.INSTAGRAM_API_MODE || 'unified').toLowerCase();
  const version = process.env.INSTAGRAM_GRAPH_VERSION || 'v27.0';
  const instagramUserId = process.env.INSTAGRAM_USER_ID;

  if (!token) {
    return res.status(503).json({
      error: 'Instagram token is missing on the server.',
      requiredEnvironmentVariable: 'INSTAGRAM_ACCESS_TOKEN'
    });
  }
  if (mode === 'unified' && !instagramUserId) {
    return res.status(503).json({
      error: 'Unified Login requires the Instagram account ID.',
      requiredEnvironmentVariable: 'INSTAGRAM_USER_ID'
    });
  }
  if (!['unified', 'instagram_login'].includes(mode)) {
    return res.status(500).json({ error: 'Unsupported Instagram API mode.' });
  }

  const requestedLimit = Number.parseInt(req.query.limit, 10);
  const limit = Number.isFinite(requestedLimit)
    ? Math.min(Math.max(requestedLimit, 1), 25)
    : 15;

  const graphHost = mode === 'unified' ? 'graph.facebook.com' : 'graph.instagram.com';
  const edge = mode === 'unified'
    ? '/' + encodeURIComponent(instagramUserId) + '/media'
    : '/me/media';

  try {
    const url = new URL(`https://${graphHost}/${version}${edge}`);
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
      return res.status(502).json({
        error: 'Meta rejected the Instagram media request.',
        upstreamStatus: upstream.status,
        metaCode: payload.error?.code || null,
        details: payload.error?.message || 'Check token permissions, assigned Instagram asset, account ID and API version.'
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
      authMode: mode,
      count: media.length,
      media,
      paging: payload.paging || null
    });
  } catch (_error) {
    return res.status(502).json({
      error: 'Could not contact the Meta Graph API. Please retry later.'
    });
  }
});

app.post('/api/resolve', (req, res) => {
  const raw = String(req.body?.url || '').trim();
  let url;
  try {
    url = new URL(raw);
  } catch {
    return res.status(400).json({ error: 'A valid direct file URL is required.' });
  }

  if (!['http:', 'https:'].includes(url.protocol)) {
    return res.status(400).json({ error: 'Only HTTP and HTTPS URLs are accepted.' });
  }
  if (url.username || url.password) {
    return res.status(400).json({ error: 'URLs containing embedded usernames or passwords are not accepted.' });
  }

  const host = url.hostname.toLowerCase();
  const social = /(^|\\.)(instagram\\.com|youtube\\.com|youtu\\.be|facebook\\.com|fb\\.watch|tiktok\\.com|x\\.com|twitter\\.com)$/i.test(host);
  if (social) {
    return res.status(422).json({
      error: 'This is a social-media post URL, not a direct media-file URL.',
      guidance: 'Use the platform’s own download/export options, or use a direct file URL you own or have permission to save.'
    });
  }

  const allowedExtensions = new Set([
    'mp4', 'm4v', 'webm', 'mov', 'avi', 'mkv',
    'mp3', 'm4a', 'wav', 'ogg', 'opus',
    'jpg', 'jpeg', 'png', 'gif', 'webp', 'avif'
  ]);
  const pathPart = decodeURIComponent(url.pathname);
  const match = pathPart.match(/\\.([a-z0-9]{2,5})$/i);
  const extension = match ? match[1].toLowerCase() : '';
  if (!extension || !allowedExtensions.has(extension)) {
    return res.status(422).json({
      error: 'The URL does not look like a direct supported media file.',
      supportedTypes: ['MP4', 'M4V', 'WebM', 'MOV', 'AVI', 'MKV', 'MP3', 'M4A', 'WAV', 'OGG', 'JPG', 'PNG', 'GIF', 'WebP', 'AVIF'],
      guidance: 'Paste a direct file URL ending in a supported media extension. A social post page or a normal webpage is not a direct file.'
    });
  }

  const filename = pathPart.split('/').pop() || ('media.' + extension);
  return res.json({
    status: 'validated',
    type: 'direct-media-link',
    host,
    filename,
    url: url.toString(),
    note: 'The browser will open the source file. Whether it downloads or previews depends on the source host and your browser. MediaSave Pro does not proxy or rehost remote files.'
  });
});

app.use((err, _req, res, _next) => {
  if (err.message === 'Origin not allowed by CORS') {
    return res.status(403).json({ error: 'Website origin is not allowed. Check ALLOWED_ORIGINS in Render.' });
  }
  return res.status(500).json({ error: 'Internal server error.' });
});

app.listen(PORT, () => console.log(`MediaSave Pro API listening on ${PORT}`));
