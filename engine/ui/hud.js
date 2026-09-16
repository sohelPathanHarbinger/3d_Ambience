/**
 * hud.js
 * ---------------------------------------------------------------
 * Everything on screen that is NOT 3D: the start screen, the bottom
 * panel (stop name, description, prev / next, progress dots, Auto
 * button) and the black fade used when jumping between far stops.
 *
 * main.js connects the buttons to the tour by assigning the on…
 * callbacks below.
 * ---------------------------------------------------------------
 */
import { CONFIG } from '../config.js';
import { mouseDragAllowed } from '../core/look-controls.js';

const $ = (id) => document.getElementById(id);

/** Turns a key code from config.js into a readable label: 'ArrowUp' → '↑', 'KeyE' → 'E', 'Digit1' → '1'. */
function keyLabel(code) {
  const arrows = { ArrowUp: '↑', ArrowDown: '↓', ArrowLeft: '←', ArrowRight: '→' };
  if (arrows[code]) return arrows[code];
  return code.replace(/^(Key|Digit|Numpad)/, ''); // anything else ('Space', 'ShiftLeft'…) is shown as it is
}

/**
 * The walking keys from CONFIG.walk.keys as readable groups, one group per "column" of the
 * key lists, in the order forward · left · back · right. Example: ['↑ ← ↓ →', 'E S D F'].
 */
function walkKeyGroups() {
  const { forward = [], left = [], back = [], right = [] } = CONFIG.walk.keys;
  const groups = [];
  const columns = Math.max(forward.length, left.length, back.length, right.length);
  for (let i = 0; i < columns; i++) {
    const labels = [forward[i], left[i], back[i], right[i]].filter(Boolean).map(keyLabel);
    if (labels.length) groups.push(labels.join(' '));
  }
  return groups;
}

export class Hud {
  constructor(stops, { walkable = true } = {}) {
    this.stops = stops;
    this.walkable = walkable; // false = this environment has no keyboard walking (360° photos)
    this.visited = new Set();
    this.fading = false;

    // Callbacks — assigned in main.js
    this.onStart = null;      // (autoPlay: boolean) => void
    this.onPrev = null;
    this.onNext = null;
    this.onJump = null;       // (index) => void
    this.onToggleAuto = null;
    this.onRestart = null;

    this.showWalkKeys(); // (project name, colours and start-screen texts are set by branding.js)
    this.showLookHelp();

    // One clickable dot per stop
    this.dots = stops.map((stop, i) => {
      const dot = document.createElement('button');
      dot.className = 'dot';
      dot.title = stop.name;
      dot.setAttribute('aria-label', `Go to ${stop.name}`);
      dot.addEventListener('click', () => this.onJump?.(i));
      $('dots').append(dot);
      return dot;
    });

    $('btn-start-auto').addEventListener('click', () => this.onStart?.(true));
    $('btn-start-manual').addEventListener('click', () => this.onStart?.(false));
    $('btn-prev').addEventListener('click', () => this.onPrev?.());
    $('btn-next').addEventListener('click', () => this.onNext?.());
    $('btn-auto').addEventListener('click', () => this.onToggleAuto?.());
    $('btn-restart').addEventListener('click', () => this.onRestart?.());

    // Bottom panel collapse / expand — remembered in this browser for next time
    let collapsed = false;
    try { collapsed = localStorage.getItem('panelCollapsed') === '1'; } catch { /* storage blocked: start expanded */ }
    this.setCollapsed(collapsed);
    $('btn-panel-toggle').addEventListener('click', () => this.setCollapsed(!this.collapsed));
  }

  /** Writes the walking keys from config.js into the start-screen help and the top-right hint. */
  showWalkKeys() {
    const groups = this.walkable ? walkKeyGroups() : [];

    // Start screen: "<b>↑ ← ↓ →</b> or <b>E S D F</b> to walk"
    const help = $('help-walk');
    help.textContent = '';
    groups.forEach((group, i) => {
      if (i > 0) help.append(' or ');
      const bold = document.createElement('b');
      bold.textContent = group;
      help.append(bold);
    });
    help.append(' to walk');
    help.hidden = groups.length === 0;

    // Top-right hint: "↑ ← ↓ → or E S D F to walk · "
    $('hint-walk').textContent = groups.length ? `${groups.join(' or ')} to walk · ` : '';
  }

  /**
   * Explains how to look around, matching CONFIG.look (mouseFollow and drag), e.g.
   * "Move the mouse to the sides to look around" · "Drag, or move the mouse, to look around" · "Drag to look around"
   */
  showLookHelp() {
    const sides = CONFIG.look.followVertical ? ' towards the edges' : ' to the sides';
    const where = { turn: sides, lean: '' }[CONFIG.look.mouseFollow]; // undefined = mouse-follow off
    let bold = 'Drag';
    let rest = ' to look around';
    if (where !== undefined && mouseDragAllowed()) rest = `, or move the mouse${where}, to look around`;
    if (where !== undefined && !mouseDragAllowed()) {
      bold = 'Move the mouse';
      rest = `${where} to look around`;
    }
    const boldText = document.createElement('b');
    boldText.textContent = bold;
    $('help-look').replaceChildren(boldText, rest); // start screen
    $('hint-look').textContent = bold + rest;       // top-right hint
  }

  /** Shrinks the bottom panel to one slim row (more room for the 3D view), or expands it again. */
  setCollapsed(collapsed) {
    this.collapsed = collapsed;
    const button = $('btn-panel-toggle');
    $('panel').classList.toggle('is-collapsed', collapsed);
    button.textContent = collapsed ? '▴' : '▾';
    button.title = collapsed ? 'Show details' : 'Hide details';
    button.setAttribute('aria-expanded', String(!collapsed));
    try { localStorage.setItem('panelCollapsed', collapsed ? '1' : '0'); } catch { /* not saved, that's fine */ }
  }

  /** Called once the 3D scene has been drawn: enables the start buttons. */
  setReady() {
    $('btn-start-auto').disabled = false;
    $('btn-start-manual').disabled = false;
    $('intro-status').textContent = '';
  }

  hideIntro() {
    const intro = $('intro');
    intro.classList.add('is-leaving');
    setTimeout(() => intro.classList.add('is-hidden'), 600);
    $('hud').classList.remove('is-hidden');
  }

  /**
   * Shows a stop in the bottom panel:
   *   moving = true → the camera is driving there
   *   free = true   → the visitor is walking freely and this is the nearest stop
   */
  showStop(index, { moving = false, free = false } = {}) {
    const stop = this.stops[index];
    const total = this.stops.length;
    const isLast = index === total - 1;

    let step = `Stop ${index + 1} of ${total}`;
    if (moving) step = `Heading to stop ${index + 1} of ${total}…`;
    if (free) step = `Walking freely · near stop ${index + 1} of ${total}`;
    $('stop-step').textContent = step;
    $('stop-name').textContent = stop.name;
    $('stop-desc').textContent = stop.description || '';
    $('btn-restart').classList.toggle('is-hidden', moving || !isLast);

    if (!moving) this.visited.add(index);
    this.dots.forEach((dot, i) => {
      dot.classList.toggle('is-current', i === index);
      dot.classList.toggle('is-visited', this.visited.has(i));
    });
    $('btn-prev').disabled = moving || index === 0;
    $('btn-next').disabled = moving || isLast;
  }

  setAuto(on) {
    $('btn-auto').classList.toggle('is-on', on);
    this.setAutoProgress(0);
  }

  /** Fills the little bar under the Auto button (0 … 1). */
  setAutoProgress(fraction) {
    $('auto-progress').style.width = `${Math.min(1, fraction) * 100}%`;
  }

  /** Fades to black, runs `callback` (e.g. teleport the camera), then fades back in. */
  fadeThrough(callback) {
    if (this.fading) return;
    this.fading = true;
    const fade = $('fade');
    fade.classList.add('is-active');
    setTimeout(() => {
      callback();
      fade.classList.remove('is-active');
      setTimeout(() => { this.fading = false; }, 350);
    }, 380);
  }
}
