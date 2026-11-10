# MediaSave Pro API — v3.2

Node.js API backend for the MediaSave Pro GitHub Pages frontend.

## Deploy on Render

- Runtime: Node
- Build command: `npm install`
- Start command: `npm start`
- Set `ALLOWED_ORIGINS=https://ravivadhiya11.github.io` in Render Environment.

### Instagram Unified Login setup

The current Meta app setup shown in the dashboard says **Unified Login** and creates a **System-user access token (SUAT)**. For this mode, the server uses `graph.facebook.com` and the Instagram professional account ID.

Set these variables in Render → your service → Environment:

- `INSTAGRAM_API_MODE=unified`
- `INSTAGRAM_ACCESS_TOKEN` = your Meta-generated SUAT (secret; do not put in GitHub)
- `INSTAGRAM_USER_ID=17841430415668153` = the Instagram account ID shown beside your connected account in Meta
- `INSTAGRAM_GRAPH_VERSION=v27.0`

If Meta's current dashboard instead gives you a direct Instagram Login user token, set `INSTAGRAM_API_MODE=instagram_login`; that mode uses `graph.instagram.com/me/media`. Do not mix the two token types or API hosts.

**Never put a real access token, App Secret, or password in GitHub files, screenshots, or chat.** The token value appeared partly visible in a previous Render screenshot. Treat it as exposed: revoke/regenerate it in Meta, then replace the Render `INSTAGRAM_ACCESS_TOKEN` value with the new token.

## API endpoints

- `GET /api/health` — health check.
- `GET /api/providers` — reports configured provider status.
- `GET /api/instagram/media?limit=15` — lists media for the authorized Instagram Professional account. The token remains on the server.
- `POST /api/resolve` — validates a URL and rejects unsupported social post URLs.

The media endpoint returns fields Meta makes available, which may include `media_url` and `thumbnail_url`. Media URLs can expire or be unavailable depending on Meta's response and access permissions.

This is not a downloader for arbitrary public Instagram accounts or other people's Reels. Only use your own content or media you have permission to save. It does not bypass private-account restrictions, login walls, DRM, or platform controls. Public/production access may require Meta App Review and additional permissions.

## Frontend

The frontend files (`index.html`, `style.css`, `script.js`, `app-config.js`) are in the repository root for GitHub Pages. `app-config.js` points to the Render API.

If the browser reports `Failed to fetch`, check:
1. Render service is Live and has deployed the latest commit.
2. `ALLOWED_ORIGINS` contains exactly `https://ravivadhiya11.github.io` (origin only, no repository path).
3. The site is opened over HTTPS.
4. The browser can open `/api/health` and the page is not showing a stale cached script.
