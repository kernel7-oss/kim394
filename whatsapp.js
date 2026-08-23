/**
 * WhatsApp Chat Viewer — Motor de Renderizado Interactivo
 * Expediente KIM394 — Ford Fiesta Ambiente 2011
 * 
 * Renderiza la conversación de WhatsApp con fidelidad cronológica,
 * reproductor de audios, visor de fotos, videos, documentos y búsqueda.
 */

(function() {
  'use strict';

  // ─── Rutas Base ───────────────────────────────────────────
  const MEDIA_BASE = 'media/whatsapp/originales/';
  const MEDIA_WEB  = 'media/whatsapp/web/';

  const MONTHS_ES = [
    'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
    'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
  ];

  // ─── Estado ───────────────────────────────────────────────
  let searchResults = [];
  let currentSearchIndex = -1;
  let activeAudio = null;
  let activePlayBtn = null;
  let activeProgressBar = null;
  let activeDurationEl = null;

  // ─── Inicialización ───────────────────────────────────────
  document.addEventListener('DOMContentLoaded', function() {
    if (typeof WHATSAPP_DATA === 'undefined') {
      console.error('WHATSAPP_DATA no está disponible');
      return;
    }
    renderChat();
    initSearch();
    initToolbar();
    initLightbox();
  });

  // ─── Renderizado del Chat ─────────────────────────────────
  function renderChat() {
    const container = document.getElementById('wa-chat-body');
    if (!container) return;

    container.innerHTML = '';
    const messages = WHATSAPP_DATA.messages;
    let lastDate = '';
    const fragment = document.createDocumentFragment();

    messages.forEach(function(msg, idx) {
      // Separador de fecha
      if (msg.date !== lastDate) {
        fragment.appendChild(createDateSeparator(msg.date));
        lastDate = msg.date;
      }

      // Mensaje de sistema (cifrado, etc.)
      if (msg.type === 'system') {
        fragment.appendChild(createSystemMessage(msg));
        return;
      }

      // Mensaje estándar
      const row = createMessageRow(msg, idx);
      fragment.appendChild(row);
    });

    container.appendChild(fragment);

    // Actualizar contadores del encabezado
    updateHeaderStats();
  }

  // ─── Separador de Fecha ───────────────────────────────────
  function createDateSeparator(dateStr) {
    const sep = document.createElement('div');
    sep.className = 'wa-date-separator';
    sep.setAttribute('data-date', dateStr);

    const parts = dateStr.split('-');
    const day = parseInt(parts[2], 10);
    const month = MONTHS_ES[parseInt(parts[1], 10) - 1];
    const year = parts[0];

    sep.innerHTML = '<span class="wa-date-pill">' + day + ' de ' + month + ' de ' + year + '</span>';
    return sep;
  }

  // ─── Mensaje de Sistema ───────────────────────────────────
  function createSystemMessage(msg) {
    const sys = document.createElement('div');
    sys.className = 'wa-system-message';
    sys.setAttribute('data-msg-id', msg.id);

    const cleanText = msg.text.replace(/[\u200e\u200f\u202a-\u202e]/g, '').trim();
    sys.innerHTML = '<span>' + escapeHtml(cleanText) + '</span>';
    return sys;
  }

  // ─── Fila de Mensaje ──────────────────────────────────────
  function createMessageRow(msg, idx) {
    const row = document.createElement('div');
    const isLucio = msg.sender.toLowerCase().indexOf('lucio') !== -1;
    const direction = isLucio ? 'incoming' : 'outgoing';

    row.className = 'wa-message-row ' + direction;
    row.setAttribute('data-msg-id', msg.id);
    row.setAttribute('data-index', idx);

    const isSticker = msg.type === 'sticker';
    const bubble = document.createElement('div');
    bubble.className = 'wa-bubble ' + direction + (isSticker ? ' wa-sticker-bubble' : '');

    // Nombre del remitente
    if (!isSticker) {
      const sender = document.createElement('span');
      sender.className = 'wa-sender ' + direction;
      sender.textContent = msg.sender;
      bubble.appendChild(sender);
    }

    // Adjunto multimedia
    if (msg.attachment) {
      const attachEl = createAttachmentElement(msg);
      if (attachEl) bubble.appendChild(attachEl);
    }

    // Texto del mensaje
    if (msg.text && msg.text.trim()) {
      const textEl = document.createElement('div');
      textEl.className = 'wa-bubble-text';
      textEl.innerHTML = formatText(msg.text);
      bubble.appendChild(textEl);
    }

    // Marca de hora
    const timeEl = document.createElement('span');
    timeEl.className = 'wa-time';
    timeEl.textContent = msg.time;
    bubble.appendChild(timeEl);

    row.appendChild(bubble);
    return row;
  }

  // ─── Creación de Adjuntos ─────────────────────────────────
  function createAttachmentElement(msg) {
    const filename = msg.attachment;
    const ext = filename.split('.').pop().toLowerCase();

    if (['jpg', 'jpeg', 'png'].indexOf(ext) !== -1) {
      return createImageElement(msg);
    } else if (ext === 'webp') {
      return createStickerElement(msg);
    } else if (['opus', 'ogg', 'mp3'].indexOf(ext) !== -1) {
      return createAudioElement(msg);
    } else if (['mov', 'mp4'].indexOf(ext) !== -1) {
      return createVideoElement(msg);
    } else if (ext === 'pdf') {
      return createDocumentElement(msg);
    }
    return null;
  }

  // ─── Imagen ───────────────────────────────────────────────
  function createImageElement(msg) {
    const img = document.createElement('img');
    img.src = MEDIA_BASE + msg.attachment;
    img.alt = 'Fotografía — ' + msg.sender;
    img.className = 'wa-image';
    img.loading = 'lazy';
    img.addEventListener('click', function() {
      openLightbox(MEDIA_BASE + msg.attachment, msg.sender + ' • ' + msg.date + ' ' + msg.time);
    });
    return img;
  }

  // ─── Sticker ──────────────────────────────────────────────
  function createStickerElement(msg) {
    const div = document.createElement('div');
    div.className = 'wa-sticker';
    const img = document.createElement('img');
    img.src = MEDIA_BASE + msg.attachment;
    img.alt = 'Sticker';
    img.loading = 'lazy';
    div.appendChild(img);
    return div;
  }

  // ─── Reproductor de Audio ─────────────────────────────────
  function createAudioElement(msg) {
    const container = document.createElement('div');
    container.className = 'wa-audio-player';
    container.setAttribute('data-src', MEDIA_BASE + msg.attachment);

    const playBtn = document.createElement('button');
    playBtn.className = 'wa-audio-play-btn';
    playBtn.setAttribute('aria-label', 'Reproducir nota de voz');
    playBtn.innerHTML = `
      <svg class="play-icon" viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><polygon points="6,4 20,12 6,20"></polygon></svg>
      <svg class="pause-icon" viewBox="0 0 24 24" width="16" height="16" fill="currentColor" style="display:none"><rect x="5" y="4" width="4" height="16"></rect><rect x="15" y="4" width="4" height="16"></rect></svg>
    `;

    const progressWrap = document.createElement('div');
    progressWrap.className = 'wa-audio-progress-wrap';

    const rangeInput = document.createElement('input');
    rangeInput.type = 'range';
    rangeInput.className = 'wa-audio-progress';
    rangeInput.min = '0';
    rangeInput.max = '100';
    rangeInput.value = '0';
    rangeInput.step = '0.1';

    const durationEl = document.createElement('div');
    durationEl.className = 'wa-audio-duration';
    durationEl.textContent = '0:00';

    progressWrap.appendChild(rangeInput);
    progressWrap.appendChild(durationEl);

    container.appendChild(playBtn);
    container.appendChild(progressWrap);

    let audio = null;

    playBtn.addEventListener('click', function() {
      if (!audio) {
        audio = new Audio(MEDIA_BASE + msg.attachment);
        audio.preload = 'metadata';

        audio.addEventListener('loadedmetadata', function() {
          if (audio.duration && !isNaN(audio.duration)) {
            durationEl.textContent = formatDuration(audio.duration);
          }
        });

        audio.addEventListener('timeupdate', function() {
          if (audio.duration && !isNaN(audio.duration)) {
            const pct = (audio.currentTime / audio.duration) * 100;
            rangeInput.value = pct;
            durationEl.textContent = formatDuration(audio.currentTime);
          }
        });

        audio.addEventListener('ended', function() {
          playBtn.querySelector('.play-icon').style.display = '';
          playBtn.querySelector('.pause-icon').style.display = 'none';
          rangeInput.value = 0;
          durationEl.textContent = formatDuration(audio.duration);
        });
      }

      if (audio.paused) {
        // Pausar cualquier otro audio sonando
        if (activeAudio && activeAudio !== audio) {
          activeAudio.pause();
          if (activePlayBtn) {
            activePlayBtn.querySelector('.play-icon').style.display = '';
            activePlayBtn.querySelector('.pause-icon').style.display = 'none';
          }
        }

        activeAudio = audio;
        activePlayBtn = playBtn;
        activeProgressBar = rangeInput;
        activeDurationEl = durationEl;

        audio.play().then(() => {
          playBtn.querySelector('.play-icon').style.display = 'none';
          playBtn.querySelector('.pause-icon').style.display = '';
        }).catch(err => {
          console.warn('Error al reproducir audio:', err);
        });
      } else {
        audio.pause();
        playBtn.querySelector('.play-icon').style.display = '';
        playBtn.querySelector('.pause-icon').style.display = 'none';
      }
    });

    rangeInput.addEventListener('input', function() {
      if (audio && audio.duration) {
        audio.currentTime = (rangeInput.value / 100) * audio.duration;
      }
    });

    return container;
  }

  // ─── Video ────────────────────────────────────────────────
  function createVideoElement(msg) {
    const container = document.createElement('div');
    container.className = 'wa-video';

    let videoSrc = MEDIA_BASE + msg.attachment;
    if (msg.webSrc) {
      videoSrc = msg.webSrc;
    } else if (msg.attachment.toLowerCase().endsWith('.mov')) {
      videoSrc = MEDIA_WEB + msg.attachment.replace(/\.mov$/i, '.mp4');
    }

    const video = document.createElement('video');
    video.src = videoSrc;
    video.controls = true;
    video.preload = 'metadata';
    video.playsInline = true;

    const overlay = document.createElement('div');
    overlay.className = 'wa-video-overlay';
    overlay.innerHTML = '<div class="wa-video-play-btn"></div>';

    overlay.addEventListener('click', function() {
      overlay.style.display = 'none';
      video.play();
    });

    video.addEventListener('play', function() {
      overlay.style.display = 'none';
    });

    video.addEventListener('pause', function() {
      if (!video.ended) overlay.style.display = 'flex';
    });

    video.addEventListener('ended', function() {
      overlay.style.display = 'flex';
    });

    container.appendChild(video);
    container.appendChild(overlay);
    return container;
  }

  // ─── Documento / PDF ──────────────────────────────────────
  function createDocumentElement(msg) {
    const card = document.createElement('div');
    card.className = 'wa-document';

    const filename = msg.attachment.replace(/^\d+-/, '');

    card.innerHTML = `
      <div class="wa-document-icon">
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
          <polyline points="14 2 14 8 20 8"></polyline>
        </svg>
      </div>
      <div class="wa-document-info">
        <div class="wa-document-name" title="${escapeHtml(filename)}">${escapeHtml(filename)}</div>
        <div class="wa-document-meta">Documento PDF oficial</div>
      </div>
      <a href="${MEDIA_BASE + msg.attachment}" target="_blank" rel="noopener" class="wa-document-open">Abrir PDF</a>
    `;

    return card;
  }

  // ─── Búsqueda en el Chat ──────────────────────────────────
  function initSearch() {
    const input = document.getElementById('wa-search-input');
    const counter = document.getElementById('wa-search-counter');
    const prevBtn = document.getElementById('wa-search-prev');
    const nextBtn = document.getElementById('wa-search-next');
    const clearBtn = document.getElementById('wa-search-clear');
    if (!input) return;

    let debounceTimer = null;

    input.addEventListener('input', function() {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(function() {
        performSearch(input.value.trim());
      }, 250);
    });

    if (prevBtn) {
      prevBtn.addEventListener('click', function() { navigateSearch(-1); });
    }
    if (nextBtn) {
      nextBtn.addEventListener('click', function() { navigateSearch(1); });
    }
    if (clearBtn) {
      clearBtn.addEventListener('click', function() {
        input.value = '';
        clearSearch();
        input.focus();
      });
    }

    input.addEventListener('keydown', function(e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        navigateSearch(e.shiftKey ? -1 : 1);
      }
    });
  }

  function performSearch(query) {
    clearSearch();
    const counter = document.getElementById('wa-search-counter');
    const prevBtn = document.getElementById('wa-search-prev');
    const nextBtn = document.getElementById('wa-search-next');

    if (!query || query.length < 2) {
      if (counter) counter.textContent = '';
      if (prevBtn) prevBtn.disabled = true;
      if (nextBtn) nextBtn.disabled = true;
      return;
    }

    const textElements = document.querySelectorAll('.wa-bubble-text');
    searchResults = [];

    const regex = new RegExp('(' + escapeRegex(query) + ')', 'gi');

    textElements.forEach(function(el) {
      if (regex.test(el.textContent)) {
        el.innerHTML = el.innerHTML.replace(regex, '<mark class="wa-highlight">$1</mark>');
        const marks = el.querySelectorAll('.wa-highlight');
        marks.forEach(function(m) { searchResults.push(m); });
      }
    });

    if (searchResults.length > 0) {
      if (prevBtn) prevBtn.disabled = false;
      if (nextBtn) nextBtn.disabled = false;
      currentSearchIndex = -1;
      navigateSearch(1);
    } else {
      if (counter) counter.textContent = '0 de 0';
      if (prevBtn) prevBtn.disabled = true;
      if (nextBtn) nextBtn.disabled = true;
    }
  }

  function navigateSearch(direction) {
    if (searchResults.length === 0) return;

    if (currentSearchIndex >= 0 && searchResults[currentSearchIndex]) {
      searchResults[currentSearchIndex].classList.remove('active');
    }

    currentSearchIndex += direction;
    if (currentSearchIndex >= searchResults.length) currentSearchIndex = 0;
    if (currentSearchIndex < 0) currentSearchIndex = searchResults.length - 1;

    const current = searchResults[currentSearchIndex];
    current.classList.add('active');
    current.scrollIntoView({ behavior: 'smooth', block: 'center' });

    const counter = document.getElementById('wa-search-counter');
    if (counter) {
      counter.textContent = (currentSearchIndex + 1) + ' de ' + searchResults.length;
    }
  }

  function clearSearch() {
    document.querySelectorAll('.wa-highlight').forEach(function(el) {
      el.outerHTML = el.textContent;
    });
    searchResults = [];
    currentSearchIndex = -1;
    const counter = document.getElementById('wa-search-counter');
    if (counter) counter.textContent = '';
    const prevBtn = document.getElementById('wa-search-prev');
    const nextBtn = document.getElementById('wa-search-next');
    if (prevBtn) prevBtn.disabled = true;
    if (nextBtn) nextBtn.disabled = true;
  }

  // ─── Barra de Navegación ──────────────────────────────────
  function initToolbar() {
    const goTop = document.getElementById('wa-go-top');
    const goBottom = document.getElementById('wa-go-bottom');
    const dateSelect = document.getElementById('wa-date-select');

    if (goTop) {
      goTop.addEventListener('click', function() {
        const firstMsg = document.querySelector('.wa-message-row, .wa-date-separator');
        if (firstMsg) firstMsg.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    }

    if (goBottom) {
      goBottom.addEventListener('click', function() {
        const rows = document.querySelectorAll('.wa-message-row');
        if (rows.length > 0) {
          rows[rows.length - 1].scrollIntoView({ behavior: 'smooth', block: 'end' });
        }
      });
    }

    if (dateSelect) {
      const dates = [];
      WHATSAPP_DATA.messages.forEach(function(m) {
        if (dates.indexOf(m.date) === -1) dates.push(m.date);
      });

      dateSelect.innerHTML = '<option value="">📅 Saltar a fecha...</option>';
      dates.forEach(function(d) {
        const opt = document.createElement('option');
        opt.value = d;
        const parts = d.split('-');
        opt.textContent = parseInt(parts[2], 10) + ' de ' + MONTHS_ES[parseInt(parts[1], 10) - 1] + ' (' + parts[0] + ')';
        dateSelect.appendChild(opt);
      });

      dateSelect.addEventListener('change', function() {
        if (!this.value) return;
        const sep = document.querySelector('.wa-date-separator[data-date="' + this.value + '"]');
        if (sep) {
          sep.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
        this.value = '';
      });
    }
  }

  // ─── Lightbox para Fotos ──────────────────────────────────
  function initLightbox() {
    const lb = document.getElementById('wa-lightbox');
    if (!lb) return;

    const closeBtn = lb.querySelector('.wa-lightbox-close');
    const backdrop = lb.querySelector('.wa-lightbox-backdrop');

    if (closeBtn) closeBtn.addEventListener('click', closeLightbox);
    if (backdrop) backdrop.addEventListener('click', closeLightbox);

    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape' && lb.classList.contains('active')) {
        closeLightbox();
      }
    });
  }

  function openLightbox(src, captionText) {
    const lb = document.getElementById('wa-lightbox');
    if (!lb) return;

    const img = lb.querySelector('.wa-lightbox-img');
    const caption = lb.querySelector('.wa-lightbox-caption');

    img.src = src;
    caption.textContent = captionText || '';

    lb.classList.add('active');
    lb.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }

  function closeLightbox() {
    const lb = document.getElementById('wa-lightbox');
    if (!lb) return;

    lb.classList.remove('active');
    lb.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  // ─── Estadísticas del Encabezado ──────────────────────────
  function updateHeaderStats() {
    const meta = WHATSAPP_DATA.meta;
    const msgCountEl = document.getElementById('wa-stat-messages');
    const audioCountEl = document.getElementById('wa-stat-audios');
    const mediaCountEl = document.getElementById('wa-stat-media');

    if (msgCountEl) msgCountEl.textContent = meta.totalMessages;
    if (audioCountEl) audioCountEl.textContent = meta.audios;
    if (mediaCountEl) mediaCountEl.textContent = meta.images + meta.videos + meta.documents;
  }

  // ─── Utilidades ───────────────────────────────────────────
  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  function formatText(text) {
    let html = escapeHtml(text);
    html = html.replace(/\n/g, '<br>');
    html = html.replace(/\*([^*]+)\*/g, '<strong>$1</strong>');
    html = html.replace(/\b_([^_]+)_\b/g, '<em>$1</em>');
    html = html.replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" rel="noopener">$1</a>');
    return html;
  }

  function formatDuration(seconds) {
    if (!seconds || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return mins + ':' + (secs < 10 ? '0' : '') + secs;
  }

})();
