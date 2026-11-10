(() => {
  const $ = id => document.getElementById(id);
  const config = window.MEDIASAVE_CONFIG || {};
  const API = String(config.API_BASE_URL || '').replace(/\/$/, '');
  const form = $('download-form');
  const input = $('media-url');
  const checkButton = $('check-btn');
  const resultPanel = $('result-panel');
  const resultContent = $('result-content');
  const resultTitle = $('result-title');
  const resultSubtitle = $('result-subtitle');
  const resultIcon = $('result-icon');
  const inputHelp = $('input-help');
  const HISTORY_KEY = 'mediasave-pro-simple-history-v1';

  const platformHints = {
    instagram: 'Paste a direct media file URL, or an Instagram post link to see official save options.',
    youtube: 'Paste a direct media file URL, or a YouTube video/Short link to see official save options.',
    facebook: 'Paste a direct media file URL, or a Facebook video/Reel link to see official save options.',
    snapchat: 'Paste a direct media file URL, or a Snapchat Spotlight link to see official save options.'
  };

  function setStatus(ok, text) {
    const dot = $('api-dot');
    const label = $('api-status');
    if (dot) dot.style.background = ok ? '#69c99c' : '#e5b65d';
    if (label) label.textContent = text;
  }

  async function api(path, options = {}) {
    if (!API) throw new Error('The API address is not configured.');
    let response;
    try {
      response = await fetch(API + path, {
        ...options,
        headers: { ...(options.headers || {}), ...(options.body ? { 'Content-Type': 'application/json' } : {}) }
      });
    } catch (error) {
      throw new Error('Could not contact the download service. Please try again in a moment.');
    }
    const raw = await response.text();
    let data = {};
    try { data = raw ? JSON.parse(raw) : {}; } catch { data = { message: raw || 'Empty response' }; }
    return { ok: response.ok, status: response.status, data };
  }

  function safeUrl(value) {
    try {
      const u = new URL(value);
      return u.protocol === 'https:' ? u.href : '';
    } catch { return ''; }
  }

  function showResult(title, subtitle, type = 'ok') {
    resultPanel.hidden = false;
    resultTitle.textContent = title;
    resultSubtitle.textContent = subtitle || '';
    resultIcon.textContent = type === 'error' ? '!' : type === 'guide' ? 'i' : '✓';
    resultIcon.style.background = type === 'error' ? '#fff0e8' : type === 'guide' ? '#eaf2ff' : '#dff4e9';
    resultIcon.style.color = type === 'error' ? '#bd5b2d' : type === 'guide' ? '#3564a5' : '#13856e';
    resultContent.replaceChildren();
  }

  function addHistory(kind, title) {
    try {
      const list = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
      list.unshift({ kind, title, time: Date.now() });
      localStorage.setItem(HISTORY_KEY, JSON.stringify(list.slice(0, 15)));
      renderHistory();
    } catch {}
  }

  function renderHistory() {
    const host = $('history-list');
    if (!host) return;
    host.replaceChildren();
    let items = [];
    try { items = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]'); } catch {}
    if (!Array.isArray(items) || !items.length) {
      const p = document.createElement('p'); p.className = 'empty-history';
      p.textContent = 'Your recent link checks and downloads will appear here on this device.';
      host.appendChild(p); return;
    }
    items.forEach(item => {
      const row = document.createElement('div'); row.className = 'history-entry';
      const left = document.createElement('div');
      const title = document.createElement('b'); title.textContent = item.title || 'Media activity';
      const time = document.createElement('small'); time.textContent = new Date(item.time).toLocaleString();
      left.append(title, time);
      const kind = document.createElement('span'); kind.className = 'history-kind'; kind.textContent = item.kind || 'CHECKED';
      row.append(left, kind); host.appendChild(row);
    });
  }

  function addDownloadForm(parent, url, filename) {
    const form = document.createElement('form');
    form.method = 'POST';
    form.action = API + '/api/download';
    form.target = '_blank';
    const field = document.createElement('input');
    field.type = 'hidden'; field.name = 'url'; field.value = url;
    const button = document.createElement('button');
    button.type = 'submit'; button.className = 'download-file-btn'; button.textContent = 'Download file ↓';
    form.append(field, button);
    form.addEventListener('submit', () => addHistory('DOWNLOAD', filename || 'Direct media file'));
    parent.appendChild(form);
  }

  function renderDirectFile(data) {
    showResult('Direct media file verified', data.filename || 'Media file link is ready', 'ok');
    const intro = document.createElement('p'); intro.className = 'result-message';
    intro.textContent = 'This looks like a direct media-file URL. Use the download button below. The source host must allow access.';
    resultContent.appendChild(intro);
    const url = safeUrl(data.url);
    if (!url) { intro.textContent = 'The source URL is not a secure HTTPS link.'; return; }

    const extension = String(data.filename || url.split('?')[0].split('/').pop()).split('.').pop().toLowerCase();
    if (['mp4','m4v','webm','mov'].includes(extension)) {
      const box = document.createElement('div'); box.className = 'preview-box';
      const video = document.createElement('video'); video.controls = true; video.playsInline = true; video.preload = 'metadata';
      video.src = API + '/api/preview?url=' + encodeURIComponent(url);
      video.addEventListener('error', () => {
        box.querySelector('.preview-caption').textContent = 'Preview is unavailable from this host. You can still try the download button.';
        video.removeAttribute('src'); video.src = url; video.load();
      }, { once: true });
      const caption = document.createElement('p'); caption.className = 'preview-caption'; caption.textContent = 'Preview of the original file (when the host permits playback).';
      box.append(video, caption); resultContent.appendChild(box);
    } else if (['jpg','jpeg','png','gif','webp','avif'].includes(extension)) {
      const box = document.createElement('div'); box.className = 'preview-box';
      const img = document.createElement('img'); img.src = url; img.alt = data.filename || 'Media preview'; img.loading = 'lazy';
      box.appendChild(img); resultContent.appendChild(box);
    }

    const actions = document.createElement('div'); actions.className = 'result-actions';
    addDownloadForm(actions, url, data.filename);
    const open = document.createElement('a'); open.className = 'open-source-btn'; open.href = url; open.target = '_blank'; open.rel = 'noopener noreferrer'; open.textContent = 'Open original file';
    actions.appendChild(open); resultContent.appendChild(actions);
    const note = document.createElement('p'); note.className = 'result-message'; note.textContent = 'Files are streamed from the source and are not kept in a permanent MediaSave Pro archive. Limit: 100 MB per file.';
    resultContent.appendChild(note);
    addHistory('CHECKED', data.filename || 'Direct media link');
  }

  function renderPlatformGuide(data) {
    showResult((data.platformName || 'Social platform') + ' link detected', 'This is a social post page, not a direct media-file URL.', 'guide');
    const title = document.createElement('h3'); title.className = 'guide-title'; title.textContent = data.title || 'Official save options';
    resultContent.appendChild(title);
    const message = document.createElement('p'); message.className = 'result-message';
    message.textContent = 'Follow the platform’s permitted download or export option. MediaSave Pro does not extract restricted streams.';
    resultContent.appendChild(message);
    const list = document.createElement('ol'); list.className = 'guide-list';
    (Array.isArray(data.instructions) ? data.instructions : []).forEach(step => {
      const li = document.createElement('li'); li.textContent = step; list.appendChild(li);
    });
    resultContent.appendChild(list);
    const actions = document.createElement('div'); actions.className = 'result-actions';
    const post = safeUrl(data.originalUrl);
    const help = safeUrl(data.helpUrl);
    if (post) { const a = document.createElement('a'); a.className = 'open-source-btn'; a.href = post; a.target = '_blank'; a.rel = 'noopener noreferrer'; a.textContent = 'Open original post'; actions.appendChild(a); }
    if (help) { const a = document.createElement('a'); a.className = 'open-source-btn'; a.href = help; a.target = '_blank'; a.rel = 'noopener noreferrer'; a.textContent = 'Official help'; actions.appendChild(a); }
    resultContent.appendChild(actions);
    const note = document.createElement('p'); note.className = 'result-message'; note.textContent = 'Only save videos you own or have permission to use.'; resultContent.appendChild(note);
    addHistory('GUIDE', data.platformName || data.platform || 'Social media link');
  }

  if (form) {
    form.addEventListener('submit', async event => {
      event.preventDefault();
      const value = (input.value || '').trim();
      if (!value) { input.focus(); return; }
      checkButton.disabled = true; checkButton.textContent = 'Checking…';
      showResult('Checking your link', 'Connecting securely to the media service.');
      try {
        const response = await api('/api/resolve', { method: 'POST', body: JSON.stringify({ url: value }) });
        if (!response.ok) {
          showResult('Link could not be used', 'Please check the URL and use a direct HTTPS media-file link.', 'error');
          const p = document.createElement('p'); p.className = 'result-message'; p.textContent = response.data.error || 'The media source rejected this link.';
          resultContent.appendChild(p);
          if (response.data.guidance) { const g = document.createElement('p'); g.className = 'result-message'; g.textContent = response.data.guidance; resultContent.appendChild(g); }
        } else if (response.data.status === 'validated') {
          renderDirectFile(response.data);
        } else if (response.data.status === 'platform-guide') {
          renderPlatformGuide(response.data);
        } else {
          showResult('Link checked', response.data.message || 'The link was checked.');
        }
      } catch (error) {
        showResult('Service unavailable', error.message, 'error');
      } finally {
        checkButton.disabled = false; checkButton.innerHTML = 'Check link <span>→</span>';
      }
    });
  }

  $('clear-input')?.addEventListener('click', () => { input.value = ''; resultPanel.hidden = true; input.focus(); });
  $('paste-btn')?.addEventListener('click', async () => {
    try { input.value = await navigator.clipboard.readText(); input.focus(); }
    catch { input.focus(); input.placeholder = 'Long press here and choose Paste'; }
  });
  $('sample-btn')?.addEventListener('click', () => {
    input.value = 'https://www.samplefiles.online/files/sample.mp4';
    input.focus(); resultPanel.hidden = true;
  });

  document.querySelectorAll('[data-platform]').forEach(button => {
    button.addEventListener('click', () => {
      document.querySelectorAll('[data-platform]').forEach(x => x.classList.toggle('active', x === button));
      inputHelp.textContent = platformHints[button.dataset.platform];
      input.focus();
    });
  });

  $('clear-history')?.addEventListener('click', () => {
    try { localStorage.removeItem(HISTORY_KEY); } catch {}
    renderHistory();
  });

  $('theme-toggle')?.addEventListener('click', () => {
    document.body.classList.toggle('dark');
    try { localStorage.setItem('mediasave-simple-theme', document.body.classList.contains('dark') ? 'dark' : 'light'); } catch {}
  });
  try { if (localStorage.getItem('mediasave-simple-theme') === 'dark') document.body.classList.add('dark'); } catch {}
  renderHistory();
  $('year').textContent = new Date().getFullYear();

  api('/api/health').then(r => setStatus(r.ok && r.data.status === 'ok', r.ok ? 'MediaSave Pro is online' : 'Service needs attention')).catch(() => setStatus(false, 'Service temporarily unavailable'));

  // Private owner-only Instagram feed and Reel library. The key is never persisted.
  const ownerButton = $('load-owner-media');
  if (ownerButton) {
    const keyInput = $('owner-access-key');
    const message = $('owner-message');
    const grid = $('owner-grid');
    ownerButton.addEventListener('click', async () => {
      const key = (keyInput.value || '').trim();
      if (!key) { message.textContent = 'Enter your private owner access key.'; return; }
      ownerButton.disabled = true; ownerButton.textContent = 'Loading your media…'; message.textContent = 'Connecting to your authorised Instagram account…';
      grid.replaceChildren(); grid.hidden = true;
      try {
        const r = await api('/api/instagram/media?limit=25', { headers: { Authorization: 'Bearer ' + key } });
        if (!r.ok) throw new Error(r.data.error || 'Instagram media could not be loaded.');
        const items = Array.isArray(r.data.media) ? r.data.media : [];
        if (!items.length) { message.textContent = 'No media was returned. Check the Professional account, token and permissions.'; return; }
        items.forEach(item => {
          const card = document.createElement('article'); card.className = 'owner-media-card';
          const type = String(item.media_type || 'MEDIA').toUpperCase();
          const url = safeUrl(item.media_url);
          const poster = safeUrl(item.thumbnail_url);
          if (type === 'VIDEO' && url) {
            const video = document.createElement('video'); video.controls = true; video.playsInline = true; video.preload = 'metadata'; if (poster) video.poster = poster; video.src = url; card.appendChild(video);
          } else if (poster || url) {
            const img = document.createElement('img'); img.src = poster || url; img.alt = 'Your Instagram media'; img.loading = 'lazy'; card.appendChild(img);
          } else {
            const placeholder = document.createElement('div'); placeholder.className = 'owner-placeholder'; placeholder.textContent = 'Preview unavailable'; card.appendChild(placeholder);
          }
          const body = document.createElement('div'); body.className = 'owner-media-body';
          const label = document.createElement('b'); label.textContent = type === 'VIDEO' ? 'VIDEO / REEL' : type; body.appendChild(label);
          const caption = document.createElement('p'); caption.textContent = item.caption || 'No caption'; body.appendChild(caption);
          if (Array.isArray(item.children) && item.children.length) {
            const hint = document.createElement('small'); hint.textContent = 'Carousel items'; body.appendChild(hint);
            item.children.forEach((child, i) => {
              if (!safeUrl(child.media_url)) return;
              const childForm = document.createElement('form'); childForm.method = 'POST'; childForm.action = API + '/api/download'; childForm.target = '_blank';
              const field = document.createElement('input'); field.type = 'hidden'; field.name = 'url'; field.value = child.media_url;
              const btn = document.createElement('button'); btn.type = 'submit'; btn.className = 'owner-download'; btn.textContent = 'Download item ' + (i + 1);
              childForm.append(field, btn); body.appendChild(childForm);
            });
          }
          if (url) {
            const dl = document.createElement('form'); dl.method = 'POST'; dl.action = API + '/api/download'; dl.target = '_blank';
            const field = document.createElement('input'); field.type = 'hidden'; field.name = 'url'; field.value = url;
            const btn = document.createElement('button'); btn.type = 'submit'; btn.className = 'download-file-btn'; btn.textContent = 'Download file ↓';
            dl.append(field, btn); body.appendChild(dl);
          } else {
            const unavailable = document.createElement('small'); unavailable.textContent = 'Meta did not provide a direct media URL for this item.'; body.appendChild(unavailable);
          }
          if (safeUrl(item.permalink)) { const post = document.createElement('a'); post.href = item.permalink; post.target = '_blank'; post.rel = 'noopener noreferrer'; post.textContent = 'View original post'; post.className = 'owner-post-link'; body.appendChild(post); }
          card.appendChild(body); grid.appendChild(card);
        });
        grid.hidden = false; message.textContent = 'Loaded ' + items.length + ' items from your authorised Instagram Professional account. Only items with a direct media URL have a download button.';
      } catch (error) { message.textContent = error.message; }
      finally { ownerButton.disabled = false; ownerButton.textContent = 'Load my Instagram media'; }
    });
  }
})();