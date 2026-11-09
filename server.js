const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const app = express();
const PORT = process.env.PORT || 3000;
const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:3000,https://vivadhiya11.github.io')
  .split(',').map(x => x.trim()).filter(Boolean);
app.disable('x-powered-by');
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({ origin(origin, cb) {
  if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
  return cb(new Error('Origin not allowed by CORS'));
}}));
app.use(express.json({ limit: '20kb' }));
app.use('/api/', rateLimit({ windowMs: 60 * 1000, limit: 60, standardHeaders: 'draft-7', legacyHeaders: false }));
app.get('/api/health', (_req, res) => res.json({ status: 'ok', service: 'MediaSave Pro API', version: '3.0.0' }));
app.get('/api/providers', (_req, res) => res.json({
  providers: [
    { id: 'instagram', status: 'not-configured', method: 'official-authorized-integration-only' },
    { id: 'youtube', status: 'not-configured', method: 'official-authorized-integration-only' },
    { id: 'facebook', status: 'not-configured', method: 'official-authorized-integration-only' }
  ],
  note: 'No social-media scraping, DRM bypass, login-wall bypass or unauthorized stream extraction is provided.'
}));
app.post('/api/resolve', (req, res) => {
  const raw = String(req.body?.url || '');
  let u;
  try { u = new URL(raw); } catch { return res.status(400).json({ error: 'A valid URL is required.' }); }
  if (!['http:', 'https:'].includes(u.protocol)) return res.status(400).json({ error: 'Only HTTP and HTTPS URLs are accepted.' });
  const host = u.hostname.toLowerCase();
  const social = /(^|\\.)(instagram\\.com|youtube\\.com|youtu\\.be|facebook\\.com|fb\\.watch)$/i.test(host);
  if (social) return res.status(422).json({
    error: 'This is a social-media post URL, not a direct media file.',
    guidance: 'Use the platform’s official download/export options or an authorized provider integration.'
  });
  return res.status(501).json({
    error: 'No remote-file resolver is enabled in this starter backend.',
    guidance: 'Use a direct media URL in the frontend if the file host allows CORS. Configure only authorized provider APIs.'
  });
});
app.use((err, _req, res, _next) => {
  if (err.message === 'Origin not allowed by CORS') return res.status(403).json({ error: err.message });
  res.status(500).json({ error: 'Internal server error.' });
});
app.listen(PORT, () => console.log(`MediaSave Pro API listening on ${PORT}`));
