/**
 * engine/main.js — starts the 3D tour
 * ---------------------------------------------------------------
 * Started by boot.js once the project's settings are loaded.
 * Creates the renderer, scene and camera, loads the project's
 * environment and tour content, and wires the tour, walking,
 * markers, popup and on-screen controls together.
 *
 * Nothing in the engine folder belongs to one project.
 *
 * ENGINE FILES
 *   boot.js                picks and loads the project, then starts this file
 *   config.js              all default settings (projects override them)
 *   core/tour.js           camera movement between stops
 *   core/look-controls.js  look around: dragging and mouse-follow
 *   core/walk-controls.js  walk with the keyboard
 *   core/hotspots.js       clickable markers
 *   ui/popup.js            info window
 *   ui/hud.js              start screen, bottom panel, buttons
 *   ui/branding.js         project name, colours, texts and logo on the page
 *   ui/picker.js           coordinate picker (?pick) — a tool for building tours
 *   environments/          loads the project's world: code, 3D model or 360° photo (detected automatically)
 *   kit/                   building blocks for code environments: walls, furniture, materials
 *
 * PROJECT FILES (projects/<name>/)
 *   project-config.js      name, colours, texts, environment type, setting overrides
 *   environment.js         builds the 3D world in code: buildEnvironment(scene) (not needed for models / 360° photos)
 *   tour-data.js           TOUR_STOPS: stops, markers, popup content
 *
 * URL options:  ?project=<folder>   ?stop=5   ?stop=2&hotspot=<id>   ?pick
 * ---------------------------------------------------------------
 */
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { CONFIG } from './config.js';
import { skyTexture } from './kit/materials.js';
import { TourController } from './core/tour.js';
import { LookControls } from './core/look-controls.js';
import { WalkControls } from './core/walk-controls.js';
import { HotspotManager } from './core/hotspots.js';
import { Popup } from './ui/popup.js';
import { Hud } from './ui/hud.js';
import { loadEnvironment } from './environments/load.js';

// The project's tour content (the folder was chosen in boot.js)
const { TOUR_STOPS } = await import(`../${CONFIG.projectFolder}/tour-data.js`);

/* ================================================================
   1. Renderer, scene, camera
   ================================================================ */
const canvas = document.getElementById('scene');

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, CONFIG.graphics.maxPixelRatio));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.shadowMap.enabled = CONFIG.graphics.shadows;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
scene.background = skyTexture(); // an environment may replace this in buildEnvironment()

// Soft studio-style environment light, so materials don't look flat
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
scene.environmentIntensity = 0.45;

const camera = new THREE.PerspectiveCamera(CONFIG.camera.fov, window.innerWidth / window.innerHeight, 0.1, 400);

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

/* ================================================================
   2. The project's 3D world
   ================================================================ */
// Code, 3D model or 360° photo — detected automatically (environments/load.js)
let world; // → { group, colliders, bounds, update(dt, camera), … }
try {
  world = await loadEnvironment(scene, TOUR_STOPS);
} catch (error) {
  document.getElementById('intro-status').textContent = `Could not load the environment: ${error.message}`;
  throw error;
}

// Start-screen view: the project's settings.camera, otherwise the environment's own suggestion
const intro = CONFIG.camera.introPosition
  ? { position: CONFIG.camera.introPosition, lookAt: CONFIG.camera.introLookAt ?? [0, 2, 0] }
  : world.introView ?? { position: [0, 7, 30], lookAt: [0, 2, 0] };
camera.position.set(...intro.position);
camera.lookAt(...intro.lookAt);

/* ================================================================
   3. Tour systems
   ================================================================ */
const tour = new TourController(camera, TOUR_STOPS);
const look = new LookControls(camera, canvas);
const walk = new WalkControls(camera, world.colliders, world.bounds);
const hotspots = new HotspotManager(scene, camera, canvas, document.getElementById('tooltip'), world.colliders);
hotspots.build(TOUR_STOPS);
hotspots.onlyActiveStop = Boolean(world.markersPerStop);
const popup = new Popup(document.getElementById('popup'));
const hud = new Hud(TOUR_STOPS, { walkable: world.walkable !== false });

const state = {
  started: false,  // start screen dismissed?
  autoPlay: false, // Auto mode on?
  waited: 0,       // seconds spent at the current stop (for Auto mode)
  freeStop: -1,    // while walking freely: the (nearest) stop shown in the bottom panel
};

/**
 * Goes to a stop. Next/previous stop: the camera drives there.
 * Far stops, after walking freely (a drive from a random spot could cut through walls),
 * or environments that can't drive (360° photos): fade and jump.
 */
function goToStop(index) {
  if (index < 0 || index >= TOUR_STOPS.length) return;
  if (tour.isMoving || hud.fading) return;
  if (index === tour.index && !tour.free) return;
  popup.close();
  const canDrive = world.drive !== false && !tour.free;
  if (canDrive && Math.abs(index - tour.index) === 1) tour.driveTo(index); // also covers start screen (-1) → stop 0
  else hud.fadeThrough(() => tour.jumpTo(index));
}

/** The tour stop whose standing point is closest to the camera. */
function nearestStop() {
  let nearest = 0;
  let nearestDistance = Infinity;
  TOUR_STOPS.forEach((stop, i) => {
    const [x, , z] = stop.camera.position;
    const distance = (x - camera.position.x) ** 2 + (z - camera.position.z) ** 2;
    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearest = i;
    }
  });
  return nearest;
}

function openHotspot(hotspot) {
  hotspots.enabled = false;
  hotspots.setHovered(null);
  popup.open(hotspot.popup);
}

function setAutoPlay(on) {
  state.autoPlay = on;
  state.waited = 0;
  hud.setAuto(on);
}

// ---- Tour events ----
tour.onDepart = (target) => {
  hotspots.setActiveStop(null);
  look.enabled = false;
  hud.showStop(target, { moving: true });
  hud.setAutoProgress(0);
};
tour.onArrive = (index) => {
  world.onStop?.(index, TOUR_STOPS[index], camera); // e.g. show this stop's 360° photo
  hotspots.setActiveStop(index);
  look.enabled = true;
  hud.showStop(index);
  hud.setAutoProgress(0);
  state.waited = 0;
  state.freeStop = -1;
};

// ---- Walking with the keyboard ----
walk.onMove = () => {
  if (!tour.free) {                         // first step away from a stop
    tour.free = true;
    hotspots.setActiveStop(null);           // now markers glow only when you are close to them
    if (state.autoPlay) setAutoPlay(false); // the visitor has taken over
  }
  const nearest = nearestStop();
  if (nearest !== state.freeStop) {         // show the area you are in; ◀ ▶ then work from here
    state.freeStop = nearest;
    tour.index = nearest;
    hud.showStop(nearest, { free: true });
  }
};

// ---- Mouse / touch ----
look.onTap = (x, y) => {
  if (tour.isMoving) return;
  const hotspot = hotspots.pick(x, y);
  if (hotspot) openHotspot(hotspot);
  else picker?.pick(x, y, canvas); // coordinate picker (?pick)
};
look.onDragStart = () => { state.waited = 0; }; // looking around delays Auto mode
look.canFollow = () => !hotspots.hovered;       // mouse-follow pauses over a marker, so it's easy to click
popup.onClose = () => {
  hotspots.enabled = true;
  state.waited = 0;
};

// ---- On-screen buttons ----
hud.onStart = (autoPlay) => {
  state.started = true;
  setAutoPlay(autoPlay);
  hud.hideIntro();
  goToStop(0);
};
hud.onNext = () => goToStop(tour.index + 1);
hud.onPrev = () => goToStop(tour.index - 1);
hud.onJump = (index) => goToStop(index);
hud.onRestart = () => goToStop(0);
hud.onToggleAuto = () => setAutoPlay(!state.autoPlay);

// ---- Keyboard (walking keys are handled in walk-controls.js) ----
window.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') popup.close();
});

// ---- URL options: ?stop=N&hotspot=id ----
const params = new URLSearchParams(location.search);

// ---- Coordinate picker: only with ?pick in the address (a tool for building tours) ----
const picker = params.has('pick') ? new (await import('./ui/picker.js')).CoordinatePicker(scene, camera, world) : null;
const startStop = parseInt(params.get('stop'), 10);
if (startStop >= 1 && startStop <= TOUR_STOPS.length) {
  state.started = true;
  hud.hideIntro();
  tour.jumpTo(startStop - 1);
  const hotspot = TOUR_STOPS[startStop - 1].hotspots?.find((h) => h.id === params.get('hotspot'));
  if (hotspot) openHotspot(hotspot);
}

/* ================================================================
   4. Animation loop — runs every frame
   ================================================================ */
const clock = new THREE.Clock();
let firstFrame = true;

renderer.setAnimationLoop(() => {
  const dt = Math.min(clock.getDelta(), 0.1); // cap to avoid big jumps after a pause
  walk.enabled = state.started && !tour.isMoving && !hud.fading && !popup.isOpen && world.walkable !== false;
  tour.update(dt);
  look.update(dt);   // mouse-follow turning
  walk.update(dt);
  world.update(dt, camera);
  hotspots.update(clock.elapsedTime, camera.position);
  picker?.update();
  updateAutoPlay(dt);
  renderer.render(scene, camera);

  if (firstFrame) {
    firstFrame = false;
    hud.setReady();
  }
});

/** Auto mode: wait at each stop, then move on. Pauses while a popup is open. */
function updateAutoPlay(dt) {
  const lastStop = TOUR_STOPS.length - 1;
  const waiting = state.autoPlay && !tour.free && !tour.isMoving && !popup.isOpen && !hud.fading
    && tour.index >= 0 && tour.index < lastStop;
  if (!waiting) return;
  state.waited += dt;
  hud.setAutoProgress(state.waited / CONFIG.tour.autoPlayDelay);
  if (state.waited >= CONFIG.tour.autoPlayDelay) goToStop(tour.index + 1);
}
