/**
 * engine/environments/load.js — picks the kind of environment AUTOMATICALLY
 * ---------------------------------------------------------------
 * What the project's project-config.js says decides the type:
 *
 *   (no `environment` line)                → CODE: the project's environment.js builds the world
 *   environment: 'assets/models/bank.glb'  → MODEL: a 3D model file (.glb / .gltf)        — model.js
 *   environment: 'assets/360/lobby.jpg'    → 360° PHOTO: a panorama (.jpg .png .webp)    — panorama.js
 *
 * The type is detected from the file extension. To pass options, use an object:
 *   environment: { file: 'assets/models/bank.glb', scale: 0.01, rotationDeg: 90 }
 *   environment: { type: 'model', file: 'assets/models/bank-model?v=2' }   (type written out)
 *
 * Every type gives the engine the same "world":
 *   { group, colliders, bounds, update(dt, camera) } and, optionally:
 *   walkable: false        no keyboard walking (360° photos)
 *   drive: false           stops fade into each other instead of driving
 *   markersPerStop: true   only the current stop's markers are shown
 *   introView              { position, lookAt } for the start screen
 *   onStop(index, stop, camera)  called when the camera arrives at a stop
 * ---------------------------------------------------------------
 */
import { CONFIG } from '../config.js';

const TYPE_BY_EXTENSION = {
  glb: 'model', gltf: 'model',
  jpg: 'panorama', jpeg: 'panorama', png: 'panorama', webp: 'panorama',
};

/** Turns the project's `environment` setting into { type, file, …options }. */
export function describeEnvironment(setting = CONFIG.environment) {
  if (!setting) return { type: 'code' };
  const env = typeof setting === 'string' ? { file: setting } : { ...setting };
  if (!env.type) {
    const extension = String(env.file || '').split('?')[0].split('.').pop().toLowerCase();
    env.type = TYPE_BY_EXTENSION[extension];
    if (!env.type) {
      throw new Error(`Can't tell what kind of environment "${env.file}" is. Use a .glb/.gltf model or a .jpg/.png/.webp 360° photo, or add type: 'model' or 'panorama'.`);
    }
  }
  return env;
}

/** Builds the project's environment into `scene` and returns its world. */
export async function loadEnvironment(scene, stops) {
  const env = describeEnvironment();

  if (env.type === 'code') {
    const { buildEnvironment } = await import(`../../${CONFIG.projectFolder}/environment.js`);
    return buildEnvironment(scene, stops);
  }
  if (env.type === 'model') {
    const { loadModelEnvironment } = await import('./model.js');
    return loadModelEnvironment(scene, env, stops);
  }
  if (env.type === 'panorama') {
    const { loadPanoramaEnvironment } = await import('./panorama.js');
    return loadPanoramaEnvironment(scene, env, stops);
  }
  throw new Error(`Unknown environment type "${env.type}". Use 'code', 'model' or 'panorama'.`);
}
