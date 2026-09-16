/**
 * tour.js
 * ---------------------------------------------------------------
 * Moves the camera between the tour stops defined in tour-data.js.
 *
 *   driveTo(i)  smooth "walk" along a curved path — used for next / previous stop
 *   jumpTo(i)   instant move — used behind a fade when jumping to a far stop
 *
 * While driving, the camera looks where it is going, then turns to
 * face the stop's `lookAt` point as it arrives.
 *
 * Events (assign functions):
 *   onDepart(targetIndex)  camera starts moving
 *   onArrive(index)        camera has arrived at a stop
 * ---------------------------------------------------------------
 */
import * as THREE from 'three';
import { CONFIG } from '../config.js';

const UP = new THREE.Vector3(0, 1, 0);
const tempMatrix = new THREE.Matrix4();

const toVector = (array) => new THREE.Vector3(...array);

/** Rotation that makes a camera at `from` look at `to`. */
function lookRotation(from, to) {
  tempMatrix.lookAt(from, to, UP);
  return new THREE.Quaternion().setFromRotationMatrix(tempMatrix);
}

const smoothstep = (edge0, edge1, x) => {
  const t = THREE.MathUtils.clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
};
const easeInOut = (t) => 0.5 - 0.5 * Math.cos(Math.PI * t); // slow start, slow finish

export class TourController {
  constructor(camera, stops) {
    this.camera = camera;
    this.stops = stops;
    this.index = -1;     // -1 = not started yet (start screen)
    this.motion = null;  // the current drive, or null when standing still
    this.free = false;   // true once the visitor walks away from the stop with the keyboard (set by main.js)
    this.onDepart = () => {};
    this.onArrive = () => {};
  }

  get isMoving() {
    return this.motion !== null;
  }

  /** Smoothly drives the camera to stop `target`. Intended for neighbouring stops. */
  driveTo(target) {
    const stop = this.stops[target];
    if (!stop || target === this.index || this.isMoving) return;

    // Path = current position → via points → the stop.
    // Moving forward uses the target stop's `via`; moving backward uses the current stop's `via` reversed.
    const viaPoints = target > this.index
      ? stop.via || []
      : [...(this.stops[this.index]?.via || [])].reverse();
    const points = [this.camera.position.clone(), ...viaPoints.map(toVector), toVector(stop.camera.position)];

    const curve = new THREE.CatmullRomCurve3(points, false, 'centripetal');
    this.motion = {
      curve,
      target,
      elapsed: 0,
      duration: Math.max(CONFIG.tour.minMoveTime, curve.getLength() / CONFIG.tour.moveSpeed),
      startRotation: this.camera.quaternion.clone(),
      endRotation: lookRotation(toVector(stop.camera.position), toVector(stop.camera.lookAt)),
    };
    this.free = false;
    this.onDepart(target);
  }

  /** Instantly places the camera at stop `target`. */
  jumpTo(target) {
    const stop = this.stops[target];
    if (!stop) return;
    this.motion = null;
    this.free = false;
    this.camera.position.copy(toVector(stop.camera.position));
    this.camera.quaternion.copy(lookRotation(toVector(stop.camera.position), toVector(stop.camera.lookAt)));
    this.index = target;
    this.onArrive(target);
  }

  /** Call every frame with the time since the last frame (seconds). */
  update(dt) {
    const m = this.motion;
    if (!m) return;

    m.elapsed += dt;
    const t = Math.min(1, m.elapsed / m.duration);
    const progress = easeInOut(t);

    // Position along the curve
    const position = m.curve.getPointAt(progress);
    this.camera.position.copy(position);

    // Orientation: start view → looking along the path → the stop's view
    const direction = m.curve.getTangentAt(Math.min(progress, 0.999));
    direction.y = 0; // keep the head level while walking
    const travelRotation = direction.lengthSq() > 1e-6
      ? lookRotation(position, position.clone().add(direction.normalize()))
      : m.endRotation;
    const rotation = m.startRotation.clone().slerp(travelRotation, smoothstep(0, 0.25, t));
    rotation.slerp(m.endRotation, smoothstep(0.55, 1, t));
    this.camera.quaternion.copy(rotation);

    if (t >= 1) {
      this.motion = null;
      this.index = m.target;
      this.onArrive(m.target);
    }
  }
}
