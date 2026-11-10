(() => {
  'use strict';

  const config = window.MEDIASAVE_CONFIG || {};
  const base = String(config.API_BASE_URL || '').replace(/\/+$/, '');
  const $ = id => document.getElementById(id);

  const status = $('api-status');
  const dot = $('dot');
  const form = $('form');
  const urlInput = $('url');
  const clearButton = $('clear');
  const submitButton = $('submit');
  const result = $('result');
  const output = $('output');
  const instagramButton = $('load-instagram');
  const instagramAccessKey = $('ig-access-key');
  const instagramMessage = $('ig-message');
  const instagramGrid = $('ig-grid');

  async function api(path, options = {}) {
    let response;
    try {
      response = await fetch(base + path, {
        ...options,
        headers: {
          ...(options.headers || {}),
          ...(options.body ? { 'Content-Type': 'application/json' } : {})
        }
      });
    } catch (error) {
      const reason = error && error.message ? error.message : 'Network error';
      throw new Error(
        'Browser could not reach the API (' + reason + '). Check Render service status, CORS allowlist, and internet connection.'
      );
    }

    const raw = await response.text();
    let data;
    try { data = raw ? JSON.parse(raw) : {}; }
    catch { data = { message: raw || 'Empty response' }; }

    return { ok: response.ok, status: response.status, data };
  }

  function setApiStatus(isOnline, label) {
    if (status) status.textContent = label;
    if (dot) {
      dot.style.background = isOnline ? '#45d49a' : '#f0b54a';
      dot.style.boxShadow = isOnline ? '0 0 10px #45d49a' : '0 0 10px #f0b54a';
    }
  }

  async function checkHealth() {
    if (!base) {
      setApiStatus(false, 'API URL MISSING');
      return;
    }
    try {
      const result = await api('/api/health');
      if (!result.ok || result.data.status !== 'ok') {
        setApiStatus(false, 'API ERROR');
        return;
      }
      setApiStatus(true, 'ONLINE');
    } catch (_error) {
      setApiStatus(false, 'SLEEPING / CORS');
    }
  }

  function safeHttpUrl(value) {
    try {
      const parsed = new URL(value);
      return parsed.protocol === 'https:' || parsed.protocol === 'http:' ? parsed.href : '';
    } catch {
      return '';
    }
  }

  function addText(parent, tag, className, value) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    node.textContent = value || '';
    parent.appendChild(node);
    return node;
  }

  function renderInstagramMedia(items) {
    instagramGrid.replaceChildren();
    if (!Array.isArray(items) || items.length === 0) {
      instagramGrid.hidden = true;
      instagramMessage.textContent = 'No media items were returned for the connected account.';
      instagramMessage.className = 'ig-message';
      return;
    }

    for (const item of items) {
      const card = document.createElement('article');
      card.className = 'ig-item';

      const mediaUrl = safeHttpUrl(item.media_url);
      const thumbnailUrl = safeHttpUrl(item.thumbnail_url);
      const mediaType = String(item.media_type || 'MEDIA').toUpperCase();

      if (mediaType === 'VIDEO' && mediaUrl) {
        const video = document.createElement('video');
        video.className = 'ig-preview-video';
        video.controls = true;
        video.preload = 'metadata';
        video.playsInline = true;
        if (thumbnailUrl) video.poster = thumbnailUrl;
        video.src = mediaUrl;
        card.appendChild(video);
      } else {
        const previewUrl = mediaType === 'VIDEO' ? thumbnailUrl : (mediaUrl || thumbnailUrl);
        if (previewUrl) {
          const image = document.createElement('img');
          image.src = previewUrl;
          image.alt = mediaType + ' Instagram media';
          image.loading = 'lazy';
          image.referrerPolicy = 'no-referrer';
          card.appendChild(image);
        } else {
          const placeholder = document.createElement('div');
          placeholder.className = 'ig-no-preview';
          placeholder.textContent = mediaType === 'VIDEO'
            ? 'Video preview unavailable'
            : 'Preview unavailable';
          card.appendChild(placeholder);
        }
      }

      const body = document.createElement('div');
      body.className = 'ig-item-body';
      addText(body, 'div', 'ig-item-type', mediaType === 'VIDEO' ? 'VIDEO / REEL' : mediaType);
      addText(body, 'p', 'ig-item-caption', item.caption || 'No caption');

      const links = document.createElement('div');
      links.className = 'ig-item-links';

      if (mediaUrl) {
        const download = document.createElement('a');
        download.href = mediaUrl;
        download.target = '_blank';
        download.rel = 'noopener noreferrer';
        download.textContent = 'Download / Open file';
        download.title = 'Open the media file; if it plays in the browser, use the browser menu to download it.';
        links.appendChild(download);
      } else {
        addText(body, 'p', 'ig-item-unavailable',
          'Instagram did not provide a downloadable media URL for this item. Open the post in Instagram or export your original from Accounts Center.');
      }

      const permalink = safeHttpUrl(item.permalink);
      if (permalink) {
        const openPost = document.createElement('a');
        openPost.href = permalink;
        openPost.target = '_blank';
        openPost.rel = 'noopener noreferrer';
        openPost.textContent = 'View Instagram post';
        links.appendChild(openPost);
      }

      if (links.childElementCount) body.appendChild(links);
      card.appendChild(body);
      instagramGrid.appendChild(card);
    }

    instagramGrid.hidden = false;
    instagramMessage.textContent = 'Loaded ' + items.length + ' item(s). Media file links are shown only when Instagram provides them.';
    instagramMessage.className = 'ig-message ig-success';
  }

  if (clearButton) {
    clearButton.addEventListener('click', () => {
      urlInput.value = '';
      result.hidden = true;
      urlInput.focus();
    });
  }

  if (form) {
    form.addEventListener('submit', async event => {
      event.preventDefault();
      const value = urlInput.value.trim();
      if (!value) return;

      if (!base) {
        result.hidden = false;
        output.textContent = 'API_BASE_URL is missing in app-config.js.';
        return;
      }

      submitButton.disabled = true;
      submitButton.firstChild.textContent = ' Checking…';
      result.hidden = false;
      output.textContent = 'Contacting MediaSave Pro API…';

      try {
        const response = await api('/api/resolve', {
          method: 'POST',
          body: JSON.stringify({ url: value })
        });
        output.textContent = JSON.stringify(response.data, null, 2);
        if (!response.ok) output.textContent += '\\nHTTP status: ' + response.status;
      } catch (error) {
        output.textContent = error.message;
      } finally {
        submitButton.disabled = false;
        submitButton.firstChild.textContent = 'Check link ';
      }
    });
  }

  if (instagramButton) {
    instagramButton.addEventListener('click', async () => {
      instagramButton.disabled = true;
      instagramButton.firstChild.textContent = ' Loading…';
      instagramMessage.textContent = 'Contacting your authorized Instagram account…';
      instagramMessage.className = 'ig-message';
      instagramGrid.hidden = true;

      try {
        const privateKey = instagramAccessKey ? instagramAccessKey.value.trim() : '';
        if (!privateKey) {
          throw new Error('Enter your private MediaSave access key first.');
        }
        const response = await api('/api/instagram/media?limit=15', {
          headers: { Authorization: 'Bearer ' + privateKey }
        });
        if (!response.ok) {
          const message = response.data.details || response.data.error || 'Instagram request failed.';
          throw new Error(message + ' (HTTP ' + response.status + ')');
        }
        if (response.data.status !== 'ok') {
          throw new Error(response.data.error || 'Instagram media could not be loaded.');
        }
        renderInstagramMedia(response.data.media);
      } catch (error) {
        instagramMessage.textContent = error.message;
        instagramMessage.className = 'ig-message ig-error';
      } finally {
        instagramButton.disabled = false;
        instagramButton.firstChild.textContent = 'Load my Instagram media ';
      }
    });
  }

  checkHealth();
})();
