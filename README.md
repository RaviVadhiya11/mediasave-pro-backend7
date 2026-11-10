# MediaSave Pro Ultra — v3.4

A public hybrid media-tools website with a Node.js API backend.

## Public features

- **Direct media links:** validates direct URLs with supported media extensions and opens the original source file. It does not proxy, scrape, or re-host files.
- **Platform link guide:** identifies Instagram, YouTube, Facebook and Snapchat links, then shows official save/export guidance and an Open Original link. It does not extract arbitrary social posts.
- **Browser video tools:** selects a local video and creates a WebM output capped at 480p, 720p, 1080p, 1440p (2K) or 2160p (4K), where the browser/device supports it. Output never upscales beyond the source dimensions and cannot create missing detail. 2K/4K processing can be too demanding for some phones.
- **PNG thumbnail:** creates a PNG thumbnail locally from a selected video.
- **Dark/light theme and recent activity:** preferences and action labels/timestamps are stored in local browser storage.
- **Private owner Instagram page:** lists media from the site owner's authorized Instagram Professional account at `owner.html`.

## Important platform limitations

A public post URL is not automatically a direct media file. Instagram, YouTube, Facebook and Snapchat do not provide one common official API that lets a third-party site download arbitrary public videos from every account. Availability of native save options depends on the platform, creator settings, account and content rights.

YouTube's developer policies prohibit downloading, importing, backing up, caching or storing copies of YouTube audiovisual content through YouTube API Services without prior written approval. Snapchat's Terms restrict copying or downloading content except where its terms, written permission, or intended functionality allow it. Meta's automated data collection terms should be reviewed before any automated collection; this project does not scrape social pages or bypass controls.

Only save or process media you own or have permission to use. This project does not bypass private-account access, logins, DRM, download settings, or geographic restrictions. 1080p/2K/4K output is possible only up to the source resolution and the browser/device capabilities.

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
- `GET /api/instagram/media?limit=15` — private owner endpoint requiring `Authorization: Bearer <MEDIA_ACCESS_KEY>`.

## GitHub Pages

Publish the static site from `main` and `/(root)`. Main files include `index.html`, `owner.html`, `privacy.html`, `terms.html`, `contact.html`, `style.css`, `script.js`, and `app-config.js`.

## Monetization readiness

No advertising script is included. Before applying to an ad network, review its current policies, add real support and takedown contact processes, and publish original useful content. Approval and earnings are not guaranteed.
