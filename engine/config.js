/**
 * engine/config.js
 * ---------------------------------------------------------------
 * Default settings of the 3D tour engine — the full list of what can
 * be tuned. DON'T edit this file for one project: override any value
 * in that project's project-config.js, under `settings`, for example:
 *
 *   settings: { walk: { speed: 3 }, graphics: { shadows: false } }
 *
 * The final CONFIG = these defaults + the project's project-config.js.
 * boot.js fills it once, before anything else runs.
 * ---------------------------------------------------------------
 */

// ---- WHICH PROJECT TO SHOW ------------------------------------------
// The folder name inside /projects that opens in the browser, e.g. 'starter'.
// (For one visit you can also add ?project=<folder> to the address.)
export const ACTIVE_PROJECT = 'harbinger-office';

const DEFAULT_SETTINGS = {
  // ---- Camera -----------------------------------------------------
  camera: {
    fov: 65,                    // field of view in degrees (wider = see more)
    eyeHeight: 1.65,            // metres — eye height of a standing person
    introPosition: null,        // where the camera waits behind the start screen, e.g. [0, 7, 30]
    introLookAt: null,          // null = automatic (3D models and 360° photos choose a good view)
  },

  // ---- Guided tour ------------------------------------------------
  tour: {
    moveSpeed: 2.8,             // metres per second while driving between stops
    minMoveTime: 1.6,           // seconds — even short moves take at least this long
    autoPlayDelay: 8,           // seconds to stay at each stop in Auto mode
  },

  // ---- Looking around with the mouse ------------------------------
  look: {
    sensitivity: 1,             // mouse speed: 0.5 = half as fast, 2 = twice as fast
                                // (used for dragging and for mouse-follow 'turn')
    maxPitchDeg: 55,            // how far you can look up / down

    // Dragging (hold the left mouse button and move)
    // While mouseFollow (below) is on — 'turn' or 'lean' — dragging with the mouse is OFF by default,
    // so the two don't fight each other. It is ON when mouseFollow is 'off'.
    // On touch screens dragging always works, because there is no mouse to follow.
    // With dragging off, looking up / down is done by moving the mouse towards the top / bottom
    // (followVertical below).
    drag: 'auto',               // 'auto' (as described above) · true = always allow · false = never
    invertDrag: false,          // false: drag right = look right (like a game)
                                // true: dragging "pulls" the view the other way (like a 360° photo)

    // Mouse-follow (just move the mouse, no button pressed) — turns the view left / right
    mouseFollow: 'turn',        // 'turn' = keeps turning while the mouse is towards the left or right side (full 360°)
                                // 'lean' = leans a little towards the mouse, comes back when the mouse is centred
                                // 'off'  = only dragging turns the view
    followSpeed: 60,            // 'turn': degrees per second with the mouse at the screen edge
    followAngle: 25,            // 'lean': degrees the view leans with the mouse at the screen edge
    followDeadZone: 0.3,        // middle part of the screen (0 … 1) where the mouse doesn't turn the view
    followVertical: true,       // also look up / down with the mouse towards the top / bottom of the screen
  },

  // ---- Walking with the keyboard (the on-screen help shows these keys automatically) ----
  walk: {
    speed: 2.2,                 // metres per second
    bodyRadius: 0.3,            // how close you can get to walls and furniture (metres)
    // Keys for each direction. 'KeyW' = the W key, 'ArrowUp' = ↑ and so on.
    keys: {
      forward: ['ArrowUp', 'KeyW'],
      back: ['ArrowDown', 'KeyS'],
      left: ['ArrowLeft', 'KeyA'],
      right: ['ArrowRight', 'KeyD'],
    },
  },

  // ---- Clickable markers ------------------------------------------
  hotspots: {
    size: 0.38,                 // marker size in metres
    color: null,                // null = the project's theme.primary
    glowDistance: 4,            // closer than this (metres) = marker glows; farther = plain icon
  },

  // ---- Graphics ---------------------------------------------------
  graphics: {
    shadows: true,              // set false on slow machines
    maxPixelRatio: 2,           // lower (e.g. 1) = faster but blurrier
    showCeiling: true,
    mergeStaticMeshes: true,    // performance: joins static furniture into a few big meshes
  },
};

// Used for any colour a project's `theme` leaves out
const DEFAULT_THEME = {
  primary: '#2f6fdf',           // markers, buttons, accent signs
  primaryDark: '#2459b8',       // hover states, brand-coloured chairs
  primaryLight: '#6aa0ff',      // brand colour on the dark panels
  secondary: '#1f2937',         // feature walls, counters, sign backgrounds
  glow: '#5aa2ff',              // glowing strips
};

/** The live settings every engine file reads. */
export const CONFIG = structuredClone(DEFAULT_SETTINGS);

/**
 * Called once by boot.js: merges a project's project-config.js into CONFIG.
 * `folder` is the project's folder relative to index.html, e.g. 'projects/harbinger-office'.
 */
export function applyProject(folder, project) {
  const { settings = {}, theme = {}, ...identity } = project;
  deepMerge(CONFIG, settings);
  Object.assign(CONFIG, identity);            // companyName, title, intro, logoMark, favicon…
  CONFIG.theme = { ...DEFAULT_THEME, ...theme };
  CONFIG.hotspots.color ??= CONFIG.theme.primary;
  CONFIG.projectFolder = folder;
}

/**
 * Turns a path written inside a project (e.g. 'assets/images/logo.svg') into one the page
 * can load ('projects/<name>/assets/images/logo.svg'). Full URLs are returned unchanged.
 */
export function resolveAsset(path) {
  if (!path || /^(https?:|data:|blob:|\/)/.test(path)) return path;
  return `${CONFIG.projectFolder}/${path}`;
}

/** Copies `source` into `target`, going into nested objects (arrays are replaced, not merged). */
function deepMerge(target, source) {
  for (const [key, value] of Object.entries(source)) {
    const bothObjects = value && typeof value === 'object' && !Array.isArray(value)
      && target[key] && typeof target[key] === 'object' && !Array.isArray(target[key]);
    if (bothObjects) deepMerge(target[key], value);
    else target[key] = value;
  }
  return target;
}
