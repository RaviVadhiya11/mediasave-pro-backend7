# MediaSave Pro — Fresh FastVideoSave-inspired website

This branch contains the new mobile-first MediaSave Pro front end. It is a clean, original layout inspired by the simple paste-link flow used by media saver websites; it does not copy another site's logo or text.

## Publish this website with GitHub Pages

1. Open the repository Settings.
2. Open Pages.
3. Under Build and deployment, choose Deploy from a branch.
4. Select branch `main` (the new design is deployed from main).
5. Select folder `/(root)`.
6. Save. The new site will publish at:
   `https://ravivadhiya11.github.io/mediasave-pro-backend7/`

The previous frontend design is preserved in the `fastvideosave-inspired` branch. Render continues deploying its backend from `main`; the API server.js remains in place.

## Backend

The page calls the existing Render API at `https://mediasave-pro-backend7.onrender.com`.

- `GET /api/health`
- `POST /api/resolve` — validates direct media links or returns official platform save instructions.
- `POST /api/download` — streams supported direct HTTPS media files to the browser as attachments (100 MB limit, rate limited, public-host check, no redirects).
- `GET /api/preview?url=...` — previews permitted direct video files when the source allows it.
- `GET /api/instagram/media?limit=...` — owner-only authorised Instagram Professional account feed endpoint.

## Important limitations

This website does not scrape Instagram, YouTube, Facebook or Snapchat post pages, bypass logins, DRM, creator download settings, or extract arbitrary public posts. A social post URL receives official save/export guidance. The owner-only Instagram page can show only media URLs supplied by Meta for the connected Professional account; some posts may not provide downloadable URLs.

Only download media you own or have permission to use. Platform permissions, creator settings, file-host behaviour and browser/device support affect results.

## PixelNest Image Tools (GitHub Pages)\n\nOpen the independent image tools site at `https://ravivadhiya11.github.io/mediasave-pro-backend7/image-tools/`. It includes compression, resize, crop, format conversion, rotate/flip, watermark, meme captions, filters, pixelation, colour palette, metadata cleaning, AI portrait background removal and AI 4× image upscaling.\n\n### Image formats\n\nInput decoding: common browser-supported JPG/JPEG, PNG, WebP, GIF (first frame), BMP, SVG and AVIF; HEIC/HEIF is converted with an optional browser decoder and TIFF uses UTIF.js. Actual support depends on device/browser and file variant.\n\nOutput: JPG/JPEG, PNG, WebP, BMP and TIFF; AVIF output is offered but succeeds only when the browser's canvas encoder supports AVIF. TIFF output is uncompressed and may be large. Animated GIF is not preserved by the current still-image canvas tools. RAW camera sensor files are not fully developed into images.\n\n### AI tools\n\n- Background removal uses `Xenova/modnet` via Transformers.js; this model is for portrait/person matting, not guaranteed general object segmentation.\n- AI upscaling uses `onnx-community/swin2SR-realworld-sr-x4-64-bsrgan-psnr-ONNX` via Transformers.js (quantized `q4` weights). Input is downscaled to a 768 px maximum long edge before 4× inference to limit mobile memory use.\n- Model runtime and weights download on first use from jsDelivr/Hugging Face. Image inference runs in the visitor's browser; the photo is not uploaded to a PixelNest processing server.\n- A compatible browser, internet connection for first model load and sufficient device memory are required. Processing may be slow or fail on older phones.\n\n## Files

- `index.html` — new home page
- `style.css` — responsive light/dark theme
- `script.js` — link checker, direct-file download, preview and local history
- `app-config.js` — Render API URL
- `owner.html` — private owner-only Instagram media library
- `privacy.html`, `terms.html`, `contact.html`, `dmca.html` — support/legal pages
- `robots.txt`, `sitemap.xml`, `manifest.webmanifest`, `404.html` — SEO/PWA/site support
