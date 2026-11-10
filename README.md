# MediaSave Pro API — v3.1

Node.js API backend for the MediaSave Pro GitHub Pages frontend.

## Deploy on Render

- Runtime: Node
- Build command: `npm install`
- Start command: `npm start`
- Set `ALLOWED_ORIGINS=https://vivadhiya11.github.io` in Render Environment.
- For Instagram media listing, set `INSTAGRAM_ACCESS_TOKEN` in Render Environment.
- Optional: set `INSTAGRAM_GRAPH_VERSION=v27.0` (the server defaults to v27.0).

**Never put a real Instagram access token, App Secret, or password in GitHub files or chat.** If a token was exposed in a screenshot, revoke it in Meta and generate a new one before use.

## API endpoints

- `GET /api/health` — health check.
- `GET /api/providers` — reports configured provider status.
- `GET /api/instagram/media?limit=15` — lists media for the Instagram Professional account that authorized the app. The token remains on the server.
- `POST /api/resolve` — validates a URL and rejects unsupported social post URLs.

## Instagram requirements

This endpoint uses the Instagram API with Instagram Login and the `instagram_business_basic` permission. The account must be a Professional (Business or Creator) account and must have authorized the app. The endpoint returns the media fields that Meta makes available, which may include `media_url` and `thumbnail_url`; URLs can expire and availability depends on Meta's response and access level.

This is not a downloader for arbitrary public Instagram accounts or other people's Reels. Only use your own content or media for which you have permission. Do not bypass private-account restrictions, login walls, DRM, or platform controls. For public production access, complete Meta's review and follow the current platform terms.

## Frontend

The frontend files (`index.html`, `style.css`, `script.js`, `app-config.js`) are also in the repository root for GitHub Pages. The API origin is configured in `app-config.js`.

If the browser reports `Failed to fetch`, check:
1. Render service is Live.
2. `ALLOWED_ORIGINS` contains exactly `https://vivadhiya11.github.io` (origin only; no repository path).
3. The browser is opening the HTTPS GitHub Pages site.
4. Render has completed deployment of the latest commit.
