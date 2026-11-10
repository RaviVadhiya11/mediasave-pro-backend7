# MediaSave Pro — v3.5

A public hybrid media-tools website with a Node.js API backend.

## Public features

- **Direct media-file download:** validates direct HTTPS URLs and streams supported MP4, M4V, WebM, MOV, AVI, MKV, MP3, M4A, WAV, OGG, Opus, JPG, PNG, GIF, WebP or AVIF files from the original host to the visitor as an attachment.
- **Download constraints:** public DNS-resolvable IPv4 host only, HTTPS port 443, no redirects, supported media extension and media MIME type required, 100 MB per file, and a per-IP request limit. This is not a general URL proxy. Some hosts may block server requests.
- **Platform link guide:** identifies Instagram, YouTube, Facebook and Snapchat post links, then shows official save/export steps and an Open Original option. It does not extract arbitrary social posts.
- **Browser video tools:** selects a local video and creates a WebM output capped at 480p, 720p, 1080p, 1440p (2K) or 2160p (4K), where the browser/device supports it. Output never upscales beyond the source dimensions and cannot create missing detail. 2K/4K processing can be too demanding for some phones.
- **PNG thumbnail:** creates a PNG thumbnail locally from a selected video.
- **Dark/light theme and recent activity:** preferences and action labels/timestamps are stored in local browser storage.
- **Private owner Instagram page:** lists media from the site owner's authorized Instagram Professional account at `owner.html`. Available media URLs have a Download file action using the same direct-file endpoint when eligible.

## Important platform limitations

A public post URL is not automatically a direct media file. Instagram, YouTube, Facebook and Snapchat do not provide one common official API that lets a third-party site download arbitrary public videos from every account. Availability of native save options depends on the platform, creator settings, account and content rights.

Use the platform's native download/export features or only files you own or have permission to save. This project does not scrape public accounts, bypass private-account access, logins, DRM, creator download settings or platform restrictions. 1080p/2K/4K output is possible only up to the source resolution and browser/device capabilities.

## Render deployment

- Runtime: Node
- Build command: `npm install`
- Start command: `npm start`
- Set `ALLOWED_ORIGINS` in Render to the actual GitHub Pages origins you use, comma-separated.
- Required secrets for the private Instagram owner feature:
  - `INSTAGRAM_API_MODE=unified`
  - `INSTAGRAM_ACCESS_TOKEN` (fresh Meta system-user access token; secret)
  - `INSTAGRAM_USER_ID`
  - `INSTAGRAM_GRAPH_VERSION=v27.0`
  - `MEDIA_ACCESS_KEY` (long unique owner-only secret)

Never put a real access token, App Secret, password or `MEDIA_ACCESS_KEY` in GitHub files or chat. If a token was shown in a screenshot, revoke it and replace it in Render.

## API endpoints

- `GET /api/health`
- `GET /api/providers`
- `POST /api/resolve` — identifies supported social-platform URLs and returns official save/export instructions, or validates a direct media-file URL.
- `POST /api/download` — streams a permitted direct media file as an attachment. Requires form field `url`; 100 MB maximum; HTTPS only; no redirects; public IPv4 DNS only; limited to five requests per minute per IP.
- `GET /api/instagram/media?limit=15` — private owner endpoint requiring `Authorization: Bearer <MEDIA_ACCESS_KEY>`.

## GitHub Pages

Publish the static site from `main` and `/(root)`. Main files include `index.html`, `owner.html`, `privacy.html`, `terms.html`, `contact.html`, `style.css`, `script.js`, and `app-config.js`.

## Monetization readiness

No advertising script is included. Before applying to an ad network, review its current policies, add real support and takedown contact processes, and publish original useful content. Approval and earnings are not guaranteed.
