/**
 * engine/environments/panorama.js — environment type "360° photo"
 * ---------------------------------------------------------------
 * Shows 360° photos (equirectangular, 2:1 — what 360° cameras and
 * phone panorama apps produce). The visitor stands in the middle and
 * looks around; moving to another stop fades to that stop's photo.
 *
 * In project-config.js:
 *   environment: 'assets/360/entrance.jpg'          (the first / default photo)
 *   or: environment: { file: 'assets/360/entrance.jpg', rotationDeg: 0 }
 *
 * In tour-data.js each stop can have its own photo, and always stands in the middle:
 *   { id: 'lobby', name: 'Lobby', panorama: 'assets/360/lobby.jpg',
 *     camera: { position: [0, 0, 0], lookAt: [0, 0, -1] }, hotspots: [ … ] }
 *
 * The middle of each photo faces forward (-z). Only the current stop's
 * markers are shown. Place markers with the coordinate picker (?pick):
 * click a spot on the photo and paste the position.
 * ---------------------------------------------------------------
 */
import * as THREE from 'three';
import { resolveAsset } from '../config.js';

const RADIUS = 5; // metres — the photo is shown on the inside of a sphere this big

export async function loadPanoramaEnvironment(scene, env, stops = []) {
  const loader = new THREE.TextureLoader();
  const photos = new Map(); // path → Promise<texture>, so each photo loads once
  const loadPhoto = (path) => {
    if (!photos.has(path)) {
      photos.set(path, loader.loadAsync(resolveAsset(path)).then((texture) => {
        texture.colorSpace = THREE.SRGBColorSpace;
        return texture;
      }).catch((error) => {
        throw new Error(`Could not load the 360° photo "${path}" (${error.message || error}).`);
      }));
    }
    return photos.get(path);
  };

  const geometry = new THREE.SphereGeometry(RADIUS, 64, 32);
  geometry.scale(-1, 1, 1); // show the photo on the inside of the sphere
  const material = new THREE.MeshBasicMaterial({ map: await loadPhoto(env.file), toneMapped: false });
  const sphere = new THREE.Mesh(geometry, material);
  sphere.rotation.y = -Math.PI / 2 + THREE.MathUtils.degToRad(env.rotationDeg ?? 0); // middle of the photo faces -z
  scene.add(sphere);

  // Start loading every stop's photo in the background, so switching is instant
  stops.forEach((stop) => { if (stop.panorama) loadPhoto(stop.panorama).catch(() => {}); });

  return {
    group: sphere,
    colliders: [],
    bounds: { minX: -1, maxX: 1, minZ: -1, maxZ: 1 },
    walkable: false,
    drive: false,
    markersPerStop: true,
    introView: { position: [0, 0, 0], lookAt: [0, 0, -1] },
    update() {},
    async onStop(index, stop, camera) {
      camera.position.set(0, 0, 0); // always view from the middle of the photo
      material.map = await loadPhoto(stop.panorama ?? env.file);
    },
  };
}
