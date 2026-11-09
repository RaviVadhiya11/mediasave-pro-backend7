# MediaSave Pro API — v3

This is a small Node.js API starter, separate from GitHub Pages.

## Run locally
1. Install Node.js 18 or newer.
2. In this folder run `npm install`.
3. Copy `.env.example` to `.env` and adjust `ALLOWED_ORIGINS`.
4. Run `npm start`.
5. Test `http://localhost:3000/api/health`.

## Deploy
Deploy this folder as a Node web service on a Node-compatible host. Set:
- Build command: `npm install`
- Start command: `npm start`
- `ALLOWED_ORIGINS=https://vivadhiya11.github.io`

After deployment, edit `frontend/app-config.js`:
`API_BASE_URL: "https://YOUR-BACKEND-HOST"`

## API endpoints
- `GET /api/health` — health check
- `GET /api/providers` — reports integration status
- `POST /api/resolve` — validates URL type and intentionally rejects social post URLs

## Important limitations
The backend is not a downloader or social-media extractor. Instagram, YouTube and Facebook integrations are not configured. Add only official/authorized APIs and follow each platform's terms, copyright rules and developer policies. Do not use this service to bypass DRM, private accounts, login walls or access controls.
