/**
 * look-controls.js
 * ---------------------------------------------------------------
 * Looking around while standing still. The camera only turns — it
 * never moves, so it can't go through walls.
 *
 *   Dragging       hold the left mouse button (or a finger) and move
 *   Mouse-follow   just move the mouse: the view turns towards it
 *                  (CONFIG.look.mouseFollow: 'turn', 'lean' or 'off')
 *
 * Speeds and modes are set in CONFIG.look (engine/config.js) and can
 * be overridden per project in project-config.js → settings.look.
 *
 * A short press without dragging counts as a "tap" (click) and is
 * reported through onTap(x, y) — main.js uses it to click markers.
 * ---------------------------------------------------------------
 */
import * as THREE from 'three';
import { CONFIG } from '../config.js';

const DRAG_THRESHOLD = 6;              // pixels the pointer must move before it counts as a drag
const DRAG_RADIANS_PER_PIXEL = 0.0045; // drag speed at sensitivity 1
const { degToRad, clamp, damp } = THREE.MathUtils;

/** Can the mouse drag to look around? See CONFIG.look.drag in engine/config.js. */
export function mouseDragAllowed() {
  const { drag, mouseFollow } = CONFIG.look;
  return drag === 'auto' ? mouseFollow === 'off' : Boolean(drag);
}

export class LookControls {
  constructor(camera, element) {
    this.camera = camera;
    this.element = element;
    this.enabled = true;          // false while the tour drives the camera
    this.dragging = false;
    this.onTap = null;            // (clientX, clientY) => void
    this.onDragStart = null;      // () => void
    this.canFollow = () => true;  // main.js can pause mouse-follow (e.g. while the mouse is on a marker)

    this.mouseX = null;           // mouse across the 3D view: -1 (left edge) … 1 (right edge); null = not over it
    this.mouseY = null;           // mouse down the 3D view: -1 (top edge) … 1 (bottom edge); null = not over it
    this.lean = 0;                // 'lean' mode: how far (radians) the view currently leans left / right
    this.leanY = 0;               // … and up / down
    element.classList.toggle('no-drag', !mouseDragAllowed()); // plain arrow cursor when the mouse can't drag

    // 'YXZ' order = yaw (turn left/right) first, then pitch (look up/down): no sideways tilt.
    const rotation = camera.quaternion.clone();
    camera.rotation.order = 'YXZ';
    camera.quaternion.copy(rotation);

    let pointer = null; // the active press: { startX, startY, lastX, lastY, dragging }

    element.addEventListener('pointerdown', (event) => {
      pointer = {
        startX: event.clientX, startY: event.clientY, lastX: event.clientX, lastY: event.clientY,
        dragging: false, canDrag: this.dragAllowed(event.pointerType),
      };
      element.setPointerCapture(event.pointerId);
    });

    element.addEventListener('pointermove', (event) => {
      if (event.pointerType === 'mouse') {  // remember where the mouse is, for mouse-follow
        const rect = element.getBoundingClientRect();
        this.mouseX = clamp(((event.clientX - rect.left) / rect.width) * 2 - 1, -1, 1);
        this.mouseY = clamp(((event.clientY - rect.top) / rect.height) * 2 - 1, -1, 1);
      }
      if (!pointer) return;
      const dx = event.clientX - pointer.lastX;
      const dy = event.clientY - pointer.lastY;
      pointer.lastX = event.clientX;
      pointer.lastY = event.clientY;

      if (!pointer.dragging && Math.hypot(event.clientX - pointer.startX, event.clientY - pointer.startY) > DRAG_THRESHOLD) {
        pointer.dragging = true; // moved too far to count as a click
        if (pointer.canDrag) {
          this.dragging = true;
          element.classList.add('dragging');
          this.onDragStart?.();
        }
      }
      if (pointer.dragging && pointer.canDrag && this.enabled) this.rotate(dx, dy);
    });

    const endPress = () => {
      pointer = null;
      this.dragging = false;
      element.classList.remove('dragging');
    };
    element.addEventListener('pointerup', (event) => {
      if (pointer && !pointer.dragging) this.onTap?.(event.clientX, event.clientY);
      endPress();
    });
    element.addEventListener('pointercancel', endPress);

    // Mouse over the bottom panel, a button, a popup, or outside the window: mouse-follow stops
    element.addEventListener('pointerleave', () => { this.mouseX = null; this.mouseY = null; });
  }

  /** Touch and pen can always drag; the mouse only when mouseDragAllowed(). */
  dragAllowed(pointerType) {
    return pointerType !== 'mouse' || mouseDragAllowed();
  }

  /** Dragging: turns the camera by the mouse movement (dx, dy in pixels). */
  rotate(dx, dy) {
    const { sensitivity, invertDrag, maxPitchDeg } = CONFIG.look;
    const speed = DRAG_RADIANS_PER_PIXEL * sensitivity * (invertDrag ? 1 : -1);
    const maxPitch = degToRad(maxPitchDeg);
    const rotation = this.camera.rotation; // y = yaw, x = pitch
    rotation.y += dx * speed;
    rotation.x = clamp(rotation.x + dy * speed, -maxPitch, maxPitch);
    rotation.z = 0;
  }

  /** Mouse-follow: call every frame with the time since the last frame (seconds). */
  update(dt) {
    const { mouseFollow, followSpeed, followAngle, followDeadZone, followVertical, sensitivity, maxPitchDeg } = CONFIG.look;
    if (!this.enabled) {            // the tour is driving the camera
      this.lean = 0;
      this.leanY = 0;
      return;
    }
    if (mouseFollow === 'off' || this.dragging || !this.canFollow()) return;

    // How hard the mouse "pushes": 0 in the dead zone around the centre, rising to ±1 at the edges
    const push = (v) => Math.sign(v) * Math.max(0, (Math.abs(v) - followDeadZone) / Math.max(1e-6, 1 - followDeadZone));
    const pushX = push(this.mouseX ?? 0);
    const pushY = followVertical ? push(this.mouseY ?? 0) : 0; // -1 = top … 1 = bottom
    const rotation = this.camera.rotation;
    const maxPitch = degToRad(maxPitchDeg);

    if (mouseFollow === 'turn') {
      // Keep turning towards the mouse: left / right all the way round, up / down within maxPitchDeg
      const speed = degToRad(followSpeed) * sensitivity * dt;
      rotation.y -= pushX * speed;
      rotation.x = clamp(rotation.x - pushY * speed, -maxPitch, maxPitch);
    } else if (mouseFollow === 'lean') {
      // Lean smoothly towards the mouse; comes back when the mouse is centred or leaves the view
      const nextX = damp(this.lean, -pushX * degToRad(followAngle), 6, dt);
      const nextY = damp(this.leanY, -pushY * degToRad(followAngle), 6, dt);
      rotation.y += nextX - this.lean;
      rotation.x = clamp(rotation.x + nextY - this.leanY, -maxPitch, maxPitch);
      this.lean = nextX;
      this.leanY = nextY;
    }
  }
}
