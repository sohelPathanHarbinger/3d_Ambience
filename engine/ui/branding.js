/**
 * branding.js
 * ---------------------------------------------------------------
 * Puts the project's identity on the page: browser-tab title and
 * icon, brand colours (CSS variables used by css/style.css), the
 * start-screen texts, and the name + logo in the top-left badge.
 *
 * Everything comes from the project's project-config.js (via CONFIG).
 * Called once by boot.js, before the 3D engine loads.
 * ---------------------------------------------------------------
 */
import { CONFIG, resolveAsset } from '../config.js';

const $ = (id) => document.getElementById(id);

export function applyBranding() {
  const { theme, companyName = '', intro = {} } = CONFIG;
  document.title = CONFIG.title || companyName || '3D Tour';

  // Brand colours → CSS variables
  const css = document.documentElement.style;
  css.setProperty('--brand', theme.primary);
  css.setProperty('--brand-dark', theme.primaryDark);
  css.setProperty('--brand-light', theme.primaryLight);
  css.setProperty('--secondary', theme.secondary);
  if (theme.panel) css.setProperty('--panel', theme.panel);

  // Start screen
  $('intro-kicker').textContent = intro.kicker ?? '';
  $('intro-title').textContent = intro.title ?? `Welcome to ${companyName}`;
  $('intro-text').textContent = intro.text ?? '';

  // Top-left badge: small logo + company name
  $('brand-name').textContent = companyName;
  const mark = $('brand-mark');
  if (CONFIG.logoMark) mark.src = resolveAsset(CONFIG.logoMark);
  else mark.hidden = true;

  // Browser-tab icon: an emoji ('🏢') or an image path ('assets/images/icon.png')
  if (CONFIG.favicon) {
    const isImage = /\.(svg|png|ico|jpe?g|gif|webp)$/i.test(CONFIG.favicon);
    const emojiSvg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>${CONFIG.favicon}</text></svg>`;
    document.querySelector('link[rel="icon"]').href = isImage
      ? resolveAsset(CONFIG.favicon)
      : `data:image/svg+xml,${encodeURIComponent(emojiSvg)}`;
  }
}
