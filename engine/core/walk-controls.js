/**
 * walk-controls.js
 * ---------------------------------------------------------------
 * Walk around freely with the keyboard: forward, backward, step left,
 * step right. Which keys do what is set in config.js (CONFIG.walk.keys);
 * the on-screen help texts are generated from the same setting (ui/hud.js).
 *
 * You always walk in the direction you are looking; turning is still
 * done by dragging the mouse (look-controls.js).
 *
 * Walls, glass and furniture block the way. They come from the project's
 * environment (recorded by kit/building.js) as rectangles on the floor plan ("colliders"). Moving along x and z
 * separately lets you slide along a wall instead of getting stuck.
 *
 * onMove() is called on every frame in which the camera actually moved.
 * ---------------------------------------------------------------
 */
import * as THREE from 'three';
import { CONFIG } from '../config.js';

// Which keys walk in which direction — set in config.js (CONFIG.walk.keys)
const KEYS = CONFIG.walk.keys;
const ALL_KEYS = Object.values(KEYS).flat();

const forwardDirection = new THREE.Vector3();
const rightDirection = new THREE.Vector3();
const step = new THREE.Vector3();

export class WalkControls {
  /**
   * @param camera     the camera that walks
   * @param colliders  [{ minX, maxX, minZ, maxZ }] rectangles you can't walk into
   * @param bounds     { minX, maxX, minZ, maxZ } the area you can't leave
   */
  constructor(camera, colliders, bounds) {
    this.camera = camera;
    this.colliders = colliders;
    this.bounds = bounds;
    this.enabled = false; // main.js switches this on/off every frame
    this.onMove = null;   // () => void
    this.pressed = new Set();

    window.addEventListener('keydown', (event) => {
      if (!ALL_KEYS.includes(event.code)) return;
      event.preventDefault(); // stop arrow keys from scrolling anything
      if (this.enabled) this.pressed.add(event.code);
    });
    window.addEventListener('keyup', (event) => this.pressed.delete(event.code));
    window.addEventListener('blur', () => this.pressed.clear()); // don't keep walking after switching windows
  }

  isDown(direction) {
    return KEYS[direction].some((code) => this.pressed.has(code));
  }

  /** Call every frame with the time since the last frame (seconds). */
  update(dt) {
    if (!this.enabled) {
      this.pressed.clear();
      return;
    }
    const forward = (this.isDown('forward') ? 1 : 0) - (this.isDown('back') ? 1 : 0);
    const sideways = (this.isDown('right') ? 1 : 0) - (this.isDown('left') ? 1 : 0);
    if (!forward && !sideways) return;

    // Forward = where the camera looks, flattened onto the floor. Right = 90° clockwise from it.
    this.camera.getWorldDirection(forwardDirection);
    forwardDirection.y = 0;
    forwardDirection.normalize();
    rightDirection.set(-forwardDirection.z, 0, forwardDirection.x);
    step.set(0, 0, 0)
      .addScaledVector(forwardDirection, forward)
      .addScaledVector(rightDirection, sideways)
      .normalize()
      .multiplyScalar(CONFIG.walk.speed * dt);

    const position = this.camera.position;
    const startX = position.x;
    const startZ = position.z;
    const stuck = this.isBlocked(position.x, position.z); // already inside something? then let them walk out

    if (stuck || !this.isBlocked(position.x + step.x, position.z)) position.x += step.x;
    if (stuck || !this.isBlocked(position.x, position.z + step.z)) position.z += step.z;
    position.y = CONFIG.camera.eyeHeight;

    if (position.x !== startX || position.z !== startZ) this.onMove?.();
  }

  /** True if a body standing at (x, z) would overlap a wall, furniture, or leave the allowed area. */
  isBlocked(x, z) {
    const r = CONFIG.walk.bodyRadius;
    const b = this.bounds;
    if (x < b.minX + r || x > b.maxX - r || z < b.minZ + r || z > b.maxZ - r) return true;
    return this.colliders.some((c) => x > c.minX - r && x < c.maxX + r && z > c.minZ - r && z < c.maxZ + r);
  }
}
