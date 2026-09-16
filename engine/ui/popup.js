/**
 * popup.js
 * ---------------------------------------------------------------
 * The info window shown when a marker is clicked.
 *
 * It is built from the `popup` object in tour-data.js. Every field
 * except `title` is optional, so any combination works:
 *   title, subtitle, video, image (+ imageCaption, layout: 'side'),
 *   text, audio (+ audioLabel, audioAutoplay)
 *
 * Order in the window: header → video → image/text → audio.
 * Media paths are relative to the project folder ('assets/images/x.jpg'); full URLs work too.
 * ---------------------------------------------------------------
 */
import { resolveAsset } from '../config.js';

export class Popup {
  constructor(root) {
    this.root = root;
    this.card = root.querySelector('.popup-card');
    this.titleEl = root.querySelector('#popup-title');
    this.subtitleEl = root.querySelector('.popup-subtitle');
    this.bodyEl = root.querySelector('.popup-body');
    this.onClose = null; // () => void

    root.querySelector('.popup-close').addEventListener('click', () => this.close());
    root.addEventListener('click', (event) => {           // click on the dark background closes it
      if (event.target === root) this.close();
    });
  }

  get isOpen() {
    return this.root.classList.contains('is-open');
  }

  open(content) {
    this.bodyEl.innerHTML = '';
    this.titleEl.textContent = content.title || '';
    this.subtitleEl.textContent = content.subtitle || '';

    // 1. Video — usually the main content, so it goes first
    if (content.video) this.bodyEl.append(createVideo(content.video));

    // 2. Image and/or text — stacked, or side by side with layout: 'side'
    if (content.image || content.text) {
      const row = createElement('div', 'popup-row');
      if (content.layout === 'side' && content.image && content.text) row.classList.add('popup-row--side');
      if (content.image) row.append(createImage(content.image, content.imageCaption, content.title));
      if (content.text) row.append(createText(content.text));
      this.bodyEl.append(row);
    }

    // 3. Audio player
    if (content.audio) this.bodyEl.append(createAudio(content.audio, content.audioLabel, content.audioAutoplay));

    this.root.classList.add('is-open');
    this.root.setAttribute('aria-hidden', 'false');
    this.card.scrollTop = 0;
  }

  close() {
    if (!this.isOpen) return;
    // Stop anything still playing, then clear the content (this also stops YouTube iframes)
    this.bodyEl.querySelectorAll('audio, video').forEach((media) => media.pause());
    this.bodyEl.innerHTML = '';
    this.root.classList.remove('is-open');
    this.root.setAttribute('aria-hidden', 'true');
    this.onClose?.();
  }
}

/* ---------- Small builders for each kind of content ---------- */

function createElement(tag, className) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  return element;
}

function createImage(src, caption, alt) {
  const figure = createElement('figure', 'popup-figure');
  const image = createElement('img');
  image.src = resolveAsset(src);
  image.alt = alt || '';
  figure.append(image);
  if (caption) {
    const figcaption = createElement('figcaption');
    figcaption.textContent = caption;
    figure.append(figcaption);
  }
  return figure;
}

/** `text` is a string or an array of strings (one per paragraph). Simple HTML is allowed. */
function createText(text) {
  const container = createElement('div', 'popup-text');
  (Array.isArray(text) ? text : [text]).forEach((paragraph) => {
    const p = createElement('p');
    p.innerHTML = paragraph;
    container.append(p);
  });
  return container;
}

function createAudio(src, label, autoplay) {
  const box = createElement('div', 'popup-audio');
  const title = createElement('p', 'popup-audio-label');
  title.textContent = label || '🔊 Audio';
  const audio = createElement('audio');
  audio.controls = true;
  audio.preload = 'metadata';
  audio.src = resolveAsset(src);
  audio.autoplay = Boolean(autoplay);
  box.append(title, audio);
  return box;
}

/** Converts YouTube / Vimeo page links to their embeddable player URL. Returns null for video files. */
function toEmbedUrl(url) {
  const youtube = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/);
  if (youtube) return `https://www.youtube.com/embed/${youtube[1]}?rel=0`;
  const vimeo = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (vimeo) return `https://player.vimeo.com/video/${vimeo[1]}`;
  return null;
}

function createVideo(src) {
  const box = createElement('div', 'popup-video');
  const embedUrl = toEmbedUrl(src);
  if (embedUrl) {
    const iframe = createElement('iframe');
    iframe.src = embedUrl;
    iframe.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
    iframe.allowFullscreen = true;
    box.append(iframe);
  } else {
    const video = createElement('video');
    video.src = resolveAsset(src);
    video.controls = true;
    video.playsInline = true;
    video.preload = 'metadata';
    box.append(video);
  }
  return box;
}
