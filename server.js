const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const dns = require('node:dns').promises;
const https = require('node:https');
const net = require('node:net');

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
  'https://vivadhiya11.github.io',
  'http://localhost:3000',
  ...configuredOrigins
]);

app.disable('x-powered-by');
app.set('trust proxy', 1); // Render sits behind one trusted reverse proxy.
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
app.use(express.urlencoded({ extended: false, limit: '10kb' }));
const downloadLimiter = rateLimit({ windowMs: 60 * 1000, limit: 5, standardHeaders: 'draft-7', legacyHeaders: false, message: { error: 'Download limit reached. Please wait one minute and try again.' } });
app.use('/api/', rateLimit({
  windowMs: 60 * 1000,
  limit: 60,
  standardHeaders: 'draft-7',
  legacyHeaders: false
}));

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', service: 'MediaSave Pro API', version: '3.5.0' });
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


const MEDIA_MAX_BYTES = 100 * 1024 * 1024; // 100 MB per request
const MEDIA_EXTENSIONS = new Set([
  'mp4','m4v','webm','mov','avi','mkv',
  'mp3','m4a','wav','ogg','opus',
  'jpg','jpeg','png','gif','webp','avif'
]);

function isPublicIPv4(address) {
  if (net.isIP(address) !== 4) return false;
  const parts = address.split('.').map(Number);
  if (parts.length !== 4 || parts.some(n => !Number.isInteger(n) || n < 0 || n > 255)) return false;
  const [a,b,c] = parts;
  if (a === 0 || a === 10 || a === 127 || a >= 224) return false;
  if (a === 100 && b >= 64 && b <= 127) return false;
  if (a === 169 && b === 254) return false;
  if (a === 172 && b >= 16 && b <= 31) return false;
  if (a === 192 && (b === 168 || (b === 0 && c === 0) || (b === 0 && c === 2))) return false;
  if (a === 198 && (b === 18 || b === 19 || (b === 51 && c === 100))) return false;
  if (a === 203 && b === 0 && c === 113) return false;
  if (a === 255 && b === 255 && c === 255) return false;
  return true;
}

function safeDownloadName(value, extension) {
  const cleaned = String(value || 'media')
    .replace(/[\\/\\r\\n\\0<>:"|?*]/g, '_')
    .replace(/[. ]+$/g, '')
    .trim()
    .slice(0, 120) || 'media';
  const ext = String(extension || 'bin').toLowerCase();
  return cleaned.toLowerCase().endsWith('.' + ext) ? cleaned : cleaned + '.' + ext;
}

app.post('/api/download', downloadLimiter, async (req, res) => {
  const raw = String(req.body?.url || '').trim();
  let target;
  try {
    target = new URL(raw);
  } catch {
    return res.status(400).json({ error: 'Enter a valid direct media-file URL.' });
  }

  if (target.protocol !== 'https:' || target.username || target.password) {
    return res.status(400).json({ error: 'Only public HTTPS media-file URLs without embedded credentials are accepted.' });
  }
  if (target.port && target.port !== '443') {
    return res.status(400).json({ error: 'Only standard HTTPS port 443 is supported.' });
  }
  if (net.isIP(target.hostname)) {
    return res.status(400).json({ error: 'IP-address URLs are not accepted. Use the original public HTTPS media hostname.' });
  }

  const hostname = target.hostname.toLowerCase().replace(/\.$/, '');
  const isPlatformHost = hostname === 'instagram.com' || hostname.endsWith('.instagram.com') ||
    hostname === 'youtube.com' || hostname.endsWith('.youtube.com') || hostname === 'youtu.be' ||
    hostname === 'facebook.com' || hostname.endsWith('.facebook.com') || hostname === 'fb.watch' ||
    hostname === 'snapchat.com' || hostname.endsWith('.snapchat.com');
  if (isPlatformHost) {
    return res.status(422).json({
      error: 'Social-media post pages cannot be downloaded by this direct-file tool.',
      guidance: 'Use the platform’s authorized download/export option or supply a direct media-file URL that you own or have permission to save.'
    });
  }

  let pathname;
  try {
    pathname = decodeURIComponent(target.pathname);
  } catch {
    return res.status(400).json({ error: 'The media URL path is malformed.' });
  }
  const match = pathname.match(/\.([a-z0-9]{2,5})$/i);
  const extension = match ? match[1].toLowerCase() : '';
  if (!MEDIA_EXTENSIONS.has(extension)) {
    return res.status(422).json({
      error: 'The URL must point directly to a supported media file.',
      supportedTypes: Array.from(MEDIA_EXTENSIONS)
    });
  }

  let addresses;
  try {
    addresses = await dns.lookup(hostname, { all: true, verbatim: true, family: 4 });
  } catch (_error) {
    return res.status(502).json({ error: 'The media host could not be resolved.' });
  }
  const publicAddresses = addresses.filter(item => isPublicIPv4(item.address));
  if (!publicAddresses.length || publicAddresses.length !== addresses.length) {
    return res.status(400).json({ error: 'This media host does not resolve exclusively to public IPv4 addresses.' });
  }

  // Pin the connection to the verified DNS result to reduce DNS-rebinding/SSRF risk.
  const pinnedAddress = publicAddresses[0].address;
  const requestOptions = {
    protocol: 'https:',
    hostname,
    port: 443,
    method: 'GET',
    path: target.pathname + target.search,
    servername: hostname,
    timeout: 30000,
    lookup: (_host, _options, callback) => callback(null, pinnedAddress, 4),
    headers: {
      'User-Agent': 'MediaSavePro/3.5 (+direct-media-download)',
      'Accept': 'video/*,audio/*,image/*,application/octet-stream;q=0.9,*/*;q=0.1'
    }
  };

  const upstreamRequest = https.request(requestOptions, upstream => {
    if (upstream.statusCode >= 300 && upstream.statusCode < 400) {
      upstream.resume();
      return res.status(422).json({
        error: 'The source redirected this request. Redirected media URLs are not supported for safety.',
        guidance: 'Use the final direct HTTPS media-file URL from a source that permits downloads.'
      });
    }
    if (upstream.statusCode < 200 || upstream.statusCode >= 300) {
      upstream.resume();
      return res.status(502).json({
        error: 'The source host did not provide the media file.',
        sourceStatus: upstream.statusCode
      });
    }

    const contentType = String(upstream.headers['content-type'] || '').split(';')[0].trim().toLowerCase();
    const allowedMime = contentType.startsWith('video/') ||
      contentType.startsWith('audio/') ||
      contentType.startsWith('image/') ||
      contentType === 'application/octet-stream' ||
      contentType === 'binary/octet-stream' ||
      contentType === 'application/mp4';
    if (!allowedMime) {
      upstream.resume();
      return res.status(415).json({
        error: 'The source did not return a recognized media file.',
        receivedContentType: contentType || 'unknown'
      });
    }

    const declaredLength = Number(upstream.headers['content-length'] || 0);
    if (declaredLength > MEDIA_MAX_BYTES) {
      upstream.resume();
      return res.status(413).json({ error: 'This file exceeds the 100 MB download limit.' });
    }

    const sourceName = pathname.split('/').pop() || 'media';
    const filename = safeDownloadName(sourceName, extension);
    const asciiFallback = filename.replace(/[^\x20-\x7E]/g, '_').replace(/["\\]/g, '_');
    res.status(200);
    res.setHeader('Content-Type', contentType || 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${asciiFallback}"; filename*=UTF-8''${encodeURIComponent(filename)}`);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Accept-Ranges', 'none');
    if (declaredLength > 0) res.setHeader('Content-Length', String(declaredLength));

    let total = 0;
    upstream.on('data', chunk => {
      total += chunk.length;
      if (total > MEDIA_MAX_BYTES) {
        upstream.destroy();
        if (!res.destroyed) res.destroy(new Error('Download exceeded 100 MB limit.'));
      }
    });
    upstream.on('error', () => {
      if (!res.headersSent) res.status(502).json({ error: 'The source media stream failed.' });
      else if (!res.destroyed) res.destroy();
    });
    res.on('close', () => {
      if (!res.writableEnded) upstream.destroy();
    });
    upstream.pipe(res);
  });

  upstreamRequest.on('timeout', () => upstreamRequest.destroy(new Error('Source request timed out.')));
  upstreamRequest.on('error', error => {
    if (!res.headersSent && !res.destroyed) {
      res.status(502).json({
        error: 'Could not download the file from the source host.',
        details: error.code === 'ETIMEDOUT' ? 'Source request timed out.' : 'The source host rejected or closed the connection.'
      });
    } else if (!res.destroyed) {
      res.destroy();
    }
  });
  upstreamRequest.end();
});

app.post('/api/resolve', (req, res) => {
  const raw = String(req.body?.url || '').trim();
  let url;
  try {
    url = new URL(raw);
  } catch {
    return res.status(400).json({ error: 'Enter a valid URL.' });
  }

  if (!['http:', 'https:'].includes(url.protocol)) {
    return res.status(400).json({ error: 'Only HTTP and HTTPS URLs are accepted.' });
  }
  if (url.username || url.password) {
    return res.status(400).json({ error: 'URLs containing embedded usernames or passwords are not accepted.' });
  }

  const host = url.hostname.toLowerCase();
  const isHost = domain => host === domain || host.endsWith('.' + domain);
  let platform = null;

  if (isHost('instagram.com')) platform = 'instagram';
  else if (isHost('youtube.com') || host === 'youtu.be') platform = 'youtube';
  else if (isHost('facebook.com') || host === 'fb.watch') platform = 'facebook';
  else if (isHost('snapchat.com') || isHost('t.snapchat.com')) platform = 'snapchat';

  if (platform) {
    const guides = {
      instagram: {
        platformName: 'Instagram',
        title: 'Save Instagram Reels and posts',
        instructions: [
          'Open the Reel or post in the Instagram app.',
          'Use Instagram’s own Download option when it is shown by the creator.',
          'For your own uploads, use Instagram’s account export or save the original from your device.',
          'If no Download option or authorized file URL is provided, MediaSave Pro cannot extract it.'
        ],
        helpUrl: 'https://help.instagram.com/'
      },
      youtube: {
        platformName: 'YouTube',
        title: 'Save YouTube videos and Shorts',
        instructions: [
          'For a video you uploaded, open YouTube Studio → Content → menu → Download.',
          'For other videos, use YouTube’s official offline-viewing features where available; they do not provide a general MP4 file.',
          'A third-party downloader must not bypass YouTube’s download restrictions.'
        ],
        helpUrl: 'https://support.google.com/youtube/answer/56100'
      },
      facebook: {
        platformName: 'Facebook',
        title: 'Save Facebook videos and Reels',
        instructions: [
          'Open the video in Facebook and check whether the post provides an official Save or Download option.',
          'For your own uploads, use Facebook’s available download or account-information export tools.',
          'If the owner or Facebook does not provide a permitted file link, ask the owner for the original.'
        ],
        helpUrl: 'https://www.facebook.com/help/'
      },
      snapchat: {
        platformName: 'Snapchat',
        title: 'Save Snapchat Spotlight and Stories',
        instructions: [
          'For your own Snaps, Spotlight posts and Stories, use Snapchat’s Save or Memories controls before or after publishing where available.',
          'You can also use Snapchat’s account-data download tools for your own account information.',
          'Do not save or redistribute another creator’s content without permission.'
        ],
        helpUrl: 'https://help.snapchat.com/'
      }
    };

    const guide = guides[platform];
    return res.json({
      status: 'platform-guide',
      platform,
      platformName: guide.platformName,
      title: guide.title,
      instructions: guide.instructions,
      helpUrl: guide.helpUrl,
      originalUrl: url.toString(),
      note: 'A public post link is not a direct media file. MediaSave Pro does not scrape social platforms, bypass logins, DRM, or creator download settings.'
    });
  }

  const allowedExtensions = new Set([
    'mp4', 'm4v', 'webm', 'mov', 'avi', 'mkv',
    'mp3', 'm4a', 'wav', 'ogg', 'opus',
    'jpg', 'jpeg', 'png', 'gif', 'webp', 'avif'
  ]);

  let pathPart;
  try {
    pathPart = decodeURIComponent(url.pathname);
  } catch {
    return res.status(400).json({ error: 'The URL path is malformed.' });
  }
  const match = pathPart.match(/\.([a-z0-9]{2,5})$/i);
  const extension = match ? match[1].toLowerCase() : '';
  if (!extension || !allowedExtensions.has(extension)) {
    return res.status(422).json({
      error: 'The URL does not look like a direct supported media file.',
      supportedTypes: ['MP4', 'M4V', 'WebM', 'MOV', 'AVI', 'MKV', 'MP3', 'M4A', 'WAV', 'OGG', 'JPG', 'PNG', 'GIF', 'WebP', 'AVIF'],
      guidance: 'Paste a direct file URL ending in a supported media extension. A social post page or normal webpage is not a direct file.'
    });
  }

  const filename = pathPart.split('/').pop() || ('media.' + extension);
  return res.json({
    status: 'validated',
    type: 'direct-media-link',
    host,
    filename,
    url: url.toString(),
    note: 'The Download file action streams the original media from its host through this API as an attachment; files are not persistently stored. The API does not alter or increase the source resolution.'
  });
});

app.use((err, _req, res, _next) => {
  if (err.message === 'Origin not allowed by CORS') {
    return res.status(403).json({ error: 'Website origin is not allowed. Check ALLOWED_ORIGINS in Render.' });
  }
  return res.status(500).json({ error: 'Internal server error.' });
});

app.listen(PORT, () => console.log(`MediaSave Pro API listening on ${PORT}`));
