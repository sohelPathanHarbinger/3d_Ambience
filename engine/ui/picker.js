/**
 * picker.js — COORDINATE PICKER (a tool for building tours; visitors never see it)
 * ---------------------------------------------------------------
 * Turn it on by adding "pick" to the address:
 *   index.html?pick          index.html?project=starter&pick
 *
 * Walk or drive to the area you are working on and click any spot.
 * The panel shows all values together, each under a title that says
 * WHERE to paste it, and "Copy all" copies the whole block:
 *
 *   // Marker → tour-data.js, inside a hotspot { … }
 *   position: [x, y, z],
 *   // Stop camera → tour-data.js, inside a stop { … }
 *   camera: { position: […], lookAt: […] },
 *   // Floor x, z → environment.js: place(parent, object, x, z)
 *   x, z
 *
 * The marker is placed 0.3 m in front of the clicked surface. "Stop camera"
 * is where you stand and look right now. Clicking a marker still opens its popup.
 * ---------------------------------------------------------------
 */
import * as THREE from 'three';
import { CONFIG } from '../config.js';

const MARKER_OFFSET = 0.3; // metres between the clicked surface and the suggested marker position
const LOOK_DISTANCE = 6;   // metres ahead of the camera used for a stop's lookAt

const round = (n) => Number(n.toFixed(2));
const vector = (v) => `[${round(v.x)}, ${round(v.y)}, ${round(v.z)}]`;

export class CoordinatePicker {
  constructor(scene, camera, world) {
    this.camera = camera;
    this.world = world;
    this.raycaster = new THREE.Raycaster();
    this.marker = '(click a spot)';
    this.floor = '(click a spot)';
    this.view = '';

    // Panel (styles: "Coordinate picker" section in css/style.css)
    this.panel = document.createElement('div');
    this.panel.className = 'picker';
    this.panel.innerHTML = `
      <p class="picker-title">📍 Coordinate picker</p>
      <p class="picker-help">Click any spot in the 3D view. Paste each line into the file named above it.</p>
      <pre class="picker-values"></pre>
      <button class="picker-copy">Copy all</button>
      <p class="picker-status" aria-live="polite"></p>`;
    document.body.append(this.panel);
    this.values = this.panel.querySelector('.picker-values');
    this.status = this.panel.querySelector('.picker-status');
    this.panel.querySelector('.picker-copy').addEventListener('click', () => this.copy());

    // Pin that marks the last clicked spot
    this.pin = new THREE.Sprite(new THREE.SpriteMaterial({ map: pinTexture(), depthTest: false, transparent: true }));
    this.pin.scale.setScalar(0.25);
    this.pin.renderOrder = 1000;
    this.pin.visible = false;
    scene.add(this.pin);
  }

  /** All values as one block, each with a title saying where it goes. */
  text() {
    return [
      '// Marker → tour-data.js, inside a hotspot { … }',
      this.marker,
      '// Stop camera → tour-data.js, inside a stop { … }',
      this.view,
      '// Floor x, z → environment.js: place(parent, object, x, z)',
      this.floor,
    ].join('\n');
  }

  /** Called when the 3D view is clicked somewhere that isn't a marker. */
  pick(clientX, clientY, canvas) {
    const rect = canvas.getBoundingClientRect();
    const pointer = new THREE.Vector2(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1);
    this.raycaster.setFromCamera(pointer, this.camera);

    // The first surface hit — looking straight through see-through glass
    const hit = this.raycaster.intersectObject(this.world.group, true).find(({ object }) => {
      const material = Array.isArray(object.material) ? object.material[0] : object.material;
      return object.visible && !(material?.transparent && material.opacity < 0.5);
    });
    if (!hit) {
      this.status.textContent = 'Nothing there — click a floor, a wall or an object.';
      return;
    }

    // Suggested marker spot: a little in front of the surface, towards the camera
    const towardsCamera = this.camera.position.clone().sub(hit.point).normalize();
    const marker = hit.point.clone().addScaledVector(towardsCamera, MARKER_OFFSET);
    this.marker = `position: ${vector(marker)},`;
    this.floor = `${round(hit.point.x)}, ${round(hit.point.z)}`;
    this.pin.position.copy(marker);
    this.pin.visible = true;
    this.values.textContent = this.text();
    this.copy();
  }

  /** Keeps "Stop camera" showing the current view — call every frame. */
  update() {
    const position = this.camera.position;
    const lookAt = this.camera.getWorldDirection(new THREE.Vector3()).multiplyScalar(LOOK_DISTANCE).add(position);
    const y = Math.abs(position.y - CONFIG.camera.eyeHeight) < 0.01 ? 'EYE' : round(position.y);
    const view = `camera: { position: [${round(position.x)}, ${y}, ${round(position.z)}], lookAt: ${vector(lookAt)} },`;
    if (view !== this.view) {
      this.view = view;
      this.values.textContent = this.text();
    }
  }

  copy() {
    const text = this.text();
    console.log(`[picker]\n${text}`);
    const done = (copied) => {
      this.status.textContent = copied ? 'Copied all values.' : 'Select the text above and press Ctrl+C to copy it.';
    };
    if (navigator.clipboard) navigator.clipboard.writeText(text).then(() => done(true), () => done(false));
    else done(false);
  }
}

/** Small round pin in the project's brand colour. */
function pinTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 64;
  const ctx = canvas.getContext('2d');
  ctx.beginPath();
  ctx.arc(32, 32, 26, 0, Math.PI * 2);
  ctx.lineWidth = 6;
  ctx.strokeStyle = '#ffffff';
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(32, 32, 12, 0, Math.PI * 2);
  ctx.fillStyle = CONFIG.theme.primary;
  ctx.fill();
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}
