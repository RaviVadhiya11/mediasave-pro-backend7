# MediaSave Pro — Hybrid Media Tools

Static public website plus a small Node.js API backend.

## Public features

- Direct media-link checker: accepts direct media-file URLs with supported extensions. It validates the URL and opens the original host. It does not fetch, proxy, scrape, or re-host remote files; the source host and browser control whether a file is downloaded or previewed.
- Browser video tools: compress/re-encode a user-selected local video to WebM (720p or 480p target) and create a PNG thumbnail. Processing runs in the browser; the selected video is not uploaded to this API. Browser codec support, device memory and file size affect availability.
- Private owner Instagram area: lists media belonging to the Professional Instagram account authorized by the site owner. It is not a public Instagram downloader.

## Render deployment

- Runtime: Node
- Build command: `npm install`
- Start command: `npm start`
- Set `ALLOWED_ORIGINS` in Render to the actual GitHub Pages origin(s), comma-separated. Current known values are:
  `https://vivadhiya11.github.io,https://ravivadhiya11.github.io`

### Private Instagram configuration

The Meta app dashboard used in setup showed **Unified Login** and a System-user access token (SUAT). This backend uses `graph.facebook.com` and the Instagram Professional account ID in this mode.

Set these variables in Render → Environment:

- `INSTAGRAM_API_MODE=unified`
- `INSTAGRAM_ACCESS_TOKEN` = a valid Meta-generated system-user access token (secret)
- `INSTAGRAM_USER_ID=17841430415668153`
- `INSTAGRAM_GRAPH_VERSION=v27.0`
- `MEDIA_ACCESS_KEY` = a long, unique private key used only by the site owner to open the private Instagram section

For an Instagram Login user token instead, set `INSTAGRAM_API_MODE=instagram_login` and use the corresponding Instagram Login token. Do not mix token types and API hosts.

Never put a real access token, App Secret, password, or `MEDIA_ACCESS_KEY` in GitHub files, screenshots, or chat. A previous screenshot showed part of a token; revoke it in Meta and use a fresh one in Render.

## API endpoints

- `GET /api/health` — health check.
- `GET /api/providers` — reports configured provider status.
- `GET /api/instagram/media?limit=15` — private owner endpoint; requires `Authorization: Bearer <MEDIA_ACCESS_KEY>`. The Meta token remains on the server.
- `POST /api/resolve` — checks that a URL is HTTP(S), rejects social post pages, and validates a supported media-file extension. It does not download the URL or guarantee that the remote file exists.

## Platform and rights limitations

Instagram's official API is for authorized Professional accounts; it does not provide a general-purpose download API for arbitrary public Reels. Meta may omit media URLs for restricted media. YouTube and Facebook post URLs are not direct media-file URLs. Use platform-provided download/export options and save only files you own or have permission to use. This project does not scrape public accounts, bypass logins, DRM, or platform restrictions.

## GitHub Pages

Publish the static site from the branch/folder containing `index.html`. The root files include `index.html`, `style.css`, `script.js`, and `app-config.js`. The front end calls the Render API configured in `app-config.js`.

## Public launch and advertising

Before applying for an ad network, ensure the site has useful original content, clear Privacy/Terms/Contact pages, working tools, and no infringing download functionality. Do not place ads near controls in a way that may cause accidental clicks. Ad approval and earnings are not guaranteed.
