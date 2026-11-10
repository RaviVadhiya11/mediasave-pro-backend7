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

  const themeToggle = $('theme-toggle');
  const historyList = $('history-list');
  const clearHistoryButton = $('clear-history');
  const HISTORY_KEY = 'mediasave-pro-history-v1';

  function applyTheme(theme) {
    document.body.classList.toggle('light-theme', theme === 'light');
    if (themeToggle) themeToggle.textContent = theme === 'light' ? 'Dark mode' : 'Light mode';
  }

  function readHistory() {
    try {
      const value = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
      return Array.isArray(value) ? value : [];
    } catch (_error) {
      return [];
    }
  }

  function renderHistory() {
    if (!historyList) return;
    const entries = readHistory();
    historyList.replaceChildren();
    if (!entries.length) {
      addText(historyList, 'p', 'history-empty', 'No recent activity yet.');
      return;
    }
    entries.forEach(item => {
      const row = document.createElement('div');
      row.className = 'history-row';
      const details = document.createElement('div');
      addText(details, 'strong', 'history-title', item.title || 'Media tool action');
      addText(details, 'span', 'history-time', new Date(item.time).toLocaleString());
      row.appendChild(details);
      addText(row, 'span', 'history-kind', item.kind || 'Activity');
      historyList.appendChild(row);
    });
  }

  function recordHistory(kind, title) {
    try {
      const entries = readHistory();
      entries.unshift({ kind, title, time: Date.now() });
      localStorage.setItem(HISTORY_KEY, JSON.stringify(entries.slice(0, 30)));
      renderHistory();
    } catch (_error) {
      // Local history is optional; tool actions still work when storage is unavailable.
    }
  }

  if (themeToggle) {
    let savedTheme = 'dark';
    try { savedTheme = localStorage.getItem('mediasave-pro-theme') || 'dark'; } catch (_error) {}
    applyTheme(savedTheme);
    themeToggle.addEventListener('click', () => {
      const nextTheme = document.body.classList.contains('light-theme') ? 'dark' : 'light';
      applyTheme(nextTheme);
      try { localStorage.setItem('mediasave-pro-theme', nextTheme); } catch (_error) {}
    });
  }

  if (clearHistoryButton) {
    clearHistoryButton.addEventListener('click', () => {
      try { localStorage.removeItem(HISTORY_KEY); } catch (_error) {}
      renderHistory();
    });
  }
  renderHistory();

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
        const downloadForm = document.createElement('form');
        downloadForm.method = 'POST';
        downloadForm.action = base + '/api/download';
        downloadForm.target = '_blank';
        downloadForm.className = 'ig-download-form';

        const mediaField = document.createElement('input');
        mediaField.type = 'hidden';
        mediaField.name = 'url';
        mediaField.value = mediaUrl;
        downloadForm.appendChild(mediaField);

        const download = document.createElement('button');
        download.type = 'submit';
        download.textContent = 'Download file ↓';
        download.className = 'ig-download-button';
        downloadForm.appendChild(download);
        downloadForm.addEventListener('submit', () => {
          recordHistory('Instagram download started', item.media_type || 'Authorized media file');
        });
        links.appendChild(downloadForm);
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
    recordHistory('Instagram', 'Loaded ' + items.length + ' authorized media items');
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
      output.textContent = 'Checking link…';

      const previousAction = document.getElementById('direct-link-action');
      if (previousAction) previousAction.remove();

      try {
        const response = await api('/api/resolve', {
          method: 'POST',
          body: JSON.stringify({ url: value })
        });

        if (!response.ok) {
          output.textContent = (response.data.error || 'The link could not be processed.') +
            (response.data.guidance ? '\\n' + response.data.guidance : '') +
            '\\nHTTP status: ' + response.status;
        } else if (response.data.status === 'validated' && response.data.url) {
          output.textContent = 'DIRECT MEDIA FILE VERIFIED\\n' +
            (response.data.filename || 'Media file') +
            '\\nTap “Download file” below to save it to your device.';

          const actionBox = document.createElement('div');
          actionBox.id = 'direct-link-action';
          actionBox.className = 'direct-link-action';

          const downloadForm = document.createElement('form');
          downloadForm.method = 'POST';
          downloadForm.action = base + '/api/download';
          downloadForm.target = '_blank';
          downloadForm.className = 'download-proxy-form';

          const urlField = document.createElement('input');
          urlField.type = 'hidden';
          urlField.name = 'url';
          urlField.value = response.data.url;
          downloadForm.appendChild(urlField);

          const downloadButton = document.createElement('button');
          downloadButton.type = 'submit';
          downloadButton.className = 'submit direct-download-button';
          downloadButton.textContent = 'Download file ↓';
          downloadForm.appendChild(downloadButton);
          downloadForm.addEventListener('submit', () => {
            recordHistory('Download started', response.data.filename || 'Direct media file');
          });
          actionBox.appendChild(downloadForm);

          const openLink = document.createElement('a');
          openLink.href = response.data.url;
          openLink.target = '_blank';
          openLink.rel = 'noopener noreferrer';
          openLink.textContent = 'Open original source';
          openLink.className = 'direct-source-link';
          actionBox.appendChild(openLink);

          const note = document.createElement('p');
          note.textContent = 'Downloads direct HTTPS media files up to 100 MB. The source must permit access and return the file without redirects. Social-media post pages are not downloadable through this tool.';
          actionBox.appendChild(note);
          result.appendChild(actionBox);
        } else if (response.data.status === 'platform-guide') {
          output.textContent = (response.data.platformName || 'Social platform') +
            ' LINK DETECTED\\nThis is a post page, not a direct media file. Follow the official save instructions below.';

          const guideBox = document.createElement('div');
          guideBox.id = 'direct-link-action';
          guideBox.className = 'platform-result-guide';

          addText(guideBox, 'div', 'platform-result-kicker', response.data.platformName || 'Platform');
          addText(guideBox, 'h3', 'platform-result-title', response.data.title || 'Official save options');

          const list = document.createElement('ol');
          list.className = 'platform-result-steps';
          (Array.isArray(response.data.instructions) ? response.data.instructions : []).forEach(step => {
            addText(list, 'li', '', step);
          });
          guideBox.appendChild(list);

          const links = document.createElement('div');
          links.className = 'ig-item-links';
          const originalUrl = safeHttpUrl(response.data.originalUrl);
          const helpUrl = safeHttpUrl(response.data.helpUrl);
          if (originalUrl) {
            const original = document.createElement('a');
            original.href = originalUrl;
            original.target = '_blank';
            original.rel = 'noopener noreferrer';
            original.textContent = 'Open original post';
            links.appendChild(original);
          }
          if (helpUrl) {
            const help = document.createElement('a');
            help.href = helpUrl;
            help.target = '_blank';
            help.rel = 'noopener noreferrer';
            help.textContent = 'Official help';
            links.appendChild(help);
          }
          guideBox.appendChild(links);
          addText(guideBox, 'p', 'platform-result-note', response.data.note || 'Only save content you own or have permission to use.');
          result.appendChild(guideBox);
          recordHistory('Platform guide', response.data.platformName || response.data.platform || 'Social link checked');
        } else {
          output.textContent = response.data.message || 'Link checked.';
        }
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


  // All video processing stays in this browser; files are never uploaded to the backend.
  const videoInput = $('video-file');
  const videoPreview = $('video-preview');
  const videoQuality = $('video-quality');
  const compressButton = $('compress-video');
  const thumbnailButton = $('make-thumbnail');
  const videoStatus = $('video-status');
  const videoOutput = $('video-output');
  let selectedVideoUrl = '';
  let currentOutputUrl = '';

  function showVideoStatus(message, kind = '') {
    if (!videoStatus) return;
    videoStatus.textContent = message;
    videoStatus.className = 'video-status' + (kind ? ' ' + kind : '');
  }

  function addVideoDownload(blob, filename, label) {
    if (currentOutputUrl) URL.revokeObjectURL(currentOutputUrl);
    currentOutputUrl = URL.createObjectURL(blob);
    videoOutput.replaceChildren();
    const link = document.createElement('a');
    link.href = currentOutputUrl;
    link.download = filename;
    link.className = 'submit';
    link.textContent = label;
    videoOutput.appendChild(link);
    videoOutput.hidden = false;
  }

  function waitForVideoEvent(element, eventName) {
    return new Promise((resolve, reject) => {
      const onSuccess = () => {
        cleanup();
        resolve();
      };
      const onError = () => {
        cleanup();
        reject(new Error('The selected video could not be read by this browser.'));
      };
      const cleanup = () => {
        element.removeEventListener(eventName, onSuccess);
        element.removeEventListener('error', onError);
      };
      element.addEventListener(eventName, onSuccess, { once: true });
      element.addEventListener('error', onError, { once: true });
    });
  }

  if (videoInput && videoPreview && compressButton && thumbnailButton) {
    compressButton.disabled = true;
    thumbnailButton.disabled = true;

    videoInput.addEventListener('change', () => {
      const file = videoInput.files && videoInput.files[0];
      videoOutput.hidden = true;
      if (currentOutputUrl) {
        URL.revokeObjectURL(currentOutputUrl);
        currentOutputUrl = '';
      }
      if (!file) {
        compressButton.disabled = true;
        thumbnailButton.disabled = true;
        videoPreview.hidden = true;
        showVideoStatus('Choose a video file to begin.');
        return;
      }
      if (!file.type.startsWith('video/')) {
        showVideoStatus('Please choose a supported video file.', 'video-error');
        videoInput.value = '';
        return;
      }
      if (file.size > 200 * 1024 * 1024) {
        showVideoStatus('This browser tool supports files up to 200 MB. Choose a smaller file.', 'video-error');
        videoInput.value = '';
        return;
      }
      if (selectedVideoUrl) URL.revokeObjectURL(selectedVideoUrl);
      selectedVideoUrl = URL.createObjectURL(file);
      videoPreview.src = selectedVideoUrl;
      videoPreview.hidden = false;
      videoPreview.load();
      showVideoStatus('Loading video preview…');
      videoPreview.onloadedmetadata = () => {
        compressButton.disabled = false;
        thumbnailButton.disabled = false;
        const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
        showVideoStatus(
          'Ready: ' + file.name + ' · ' + sizeMb + ' MB · ' +
          videoPreview.videoWidth + '×' + videoPreview.videoHeight,
          'video-success'
        );
      };
    });

    compressButton.addEventListener('click', async () => {
      if (!videoPreview.src || !videoPreview.videoWidth) {
        showVideoStatus('Choose a video first.', 'video-error');
        return;
      }
      if (!window.MediaRecorder || !HTMLCanvasElement.prototype.captureStream) {
        showVideoStatus('This browser does not support in-browser video conversion. Try the latest Chrome on Android.', 'video-error');
        return;
      }

      compressButton.disabled = true;
      thumbnailButton.disabled = true;
      videoOutput.hidden = true;
      showVideoStatus('Processing on this device. Keep this tab open until it finishes…');

      let canvasStream;
      let sourceStream;
      let frameId = 0;
      try {
        const maxDimension = Number(videoQuality.value || 720);
        const scale = Math.min(1, maxDimension / Math.max(videoPreview.videoWidth, videoPreview.videoHeight));
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(2, Math.round(videoPreview.videoWidth * scale / 2) * 2);
        canvas.height = Math.max(2, Math.round(videoPreview.videoHeight * scale / 2) * 2);
        const context = canvas.getContext('2d', { alpha: false });
        canvasStream = canvas.captureStream(24);

        const capture = videoPreview.captureStream || videoPreview.mozCaptureStream;
        if (capture) {
          sourceStream = capture.call(videoPreview);
          sourceStream.getAudioTracks().forEach(track => canvasStream.addTrack(track));
        }

        const candidates = [
          'video/webm;codecs=vp9,opus',
          'video/webm;codecs=vp8,opus',
          'video/webm'
        ];
        const mimeType = candidates.find(type => MediaRecorder.isTypeSupported(type));
        if (!mimeType) throw new Error('This browser cannot encode WebM video.');

        const bitrate = maxDimension >= 2160 ? 18000000 : maxDimension >= 1440 ? 10000000 : maxDimension >= 1080 ? 6000000 : maxDimension >= 720 ? 3500000 : 1800000;
        const recorder = new MediaRecorder(canvasStream, { mimeType, videoBitsPerSecond: bitrate });
        const chunks = [];
        recorder.ondataavailable = event => {
          if (event.data && event.data.size) chunks.push(event.data);
        };

        const stopped = new Promise((resolve, reject) => {
          recorder.onerror = () => reject(new Error('Video conversion failed in this browser.'));
          recorder.onstop = resolve;
        });

        const drawFrame = () => {
          if (videoPreview.ended || videoPreview.paused) return;
          context.drawImage(videoPreview, 0, 0, canvas.width, canvas.height);
          frameId = requestAnimationFrame(drawFrame);
        };

        videoPreview.pause();
        if (videoPreview.currentTime > 0.05) {
          const seeked = waitForVideoEvent(videoPreview, 'seeked');
          videoPreview.currentTime = 0;
          await seeked;
        } else {
          videoPreview.currentTime = 0;
        }
        context.drawImage(videoPreview, 0, 0, canvas.width, canvas.height);
        recorder.start(1000);
        videoPreview.addEventListener('ended', () => {
          if (recorder.state !== 'inactive') recorder.stop();
        }, { once: true });
        await videoPreview.play();
        drawFrame();

        const durationMs = Number.isFinite(videoPreview.duration) ? videoPreview.duration * 1000 : 0;
        if (durationMs > 0) {
          const timeoutId = setTimeout(() => {
            if (recorder.state !== 'inactive') recorder.stop();
          }, durationMs + 15000);
          await stopped.finally(() => clearTimeout(timeoutId));
        } else {
          await stopped;
        }

        cancelAnimationFrame(frameId);
        const blob = new Blob(chunks, { type: 'video/webm' });
        if (!blob.size) throw new Error('No output was created. Try another video file.');
        const originalName = (videoInput.files[0].name || 'video').replace(/\.[^.]+$/, '');
        const outputName = originalName + '-mediasave-' + maxDimension + 'p.webm';
        addVideoDownload(blob, outputName, 'Download converted WebM · ' + (blob.size / (1024 * 1024)).toFixed(1) + ' MB');
        showVideoStatus('Finished. Output is capped at ' + maxDimension + 'p and never upscales beyond the source resolution. It was created on this device, not uploaded.', 'video-success');
        recordHistory('Video tool', outputName);
      } catch (error) {
        showVideoStatus(error.message || 'Video conversion failed.', 'video-error');
      } finally {
        if (frameId) cancelAnimationFrame(frameId);
        if (canvasStream) canvasStream.getTracks().forEach(track => track.stop());
        if (sourceStream) sourceStream.getTracks().forEach(track => track.stop());
        videoPreview.pause();
        compressButton.disabled = false;
        thumbnailButton.disabled = false;
      }
    });

    thumbnailButton.addEventListener('click', async () => {
      if (!videoPreview.src || !videoPreview.videoWidth) {
        showVideoStatus('Choose a video first.', 'video-error');
        return;
      }
      try {
        const targetTime = Math.min(1.5, Math.max(0, videoPreview.duration / 2));
        if (Math.abs(videoPreview.currentTime - targetTime) > 0.1) {
          const seeked = waitForVideoEvent(videoPreview, 'seeked');
          videoPreview.currentTime = targetTime;
          await seeked;
        }
        const canvas = document.createElement('canvas');
        const scale = Math.min(1, 1280 / videoPreview.videoWidth);
        canvas.width = Math.round(videoPreview.videoWidth * scale);
        canvas.height = Math.round(videoPreview.videoHeight * scale);
        canvas.getContext('2d').drawImage(videoPreview, 0, 0, canvas.width, canvas.height);
        const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
        if (!blob) throw new Error('Could not create the thumbnail.');
        const name = (videoInput.files[0].name || 'video').replace(/\.[^.]+$/, '') + '-thumbnail.png';
        addVideoDownload(blob, name, 'Download thumbnail PNG');
        showVideoStatus('Thumbnail created on this device.', 'video-success');
        recordHistory('Thumbnail', name);
      } catch (error) {
        showVideoStatus(error.message || 'Thumbnail creation failed.', 'video-error');
      }
    });
  }

  checkHealth();
})();
