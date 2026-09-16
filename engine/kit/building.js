/**
 * engine/kit/building.js
 * ---------------------------------------------------------------
 * Building blocks for ANY 3D environment: floors, walls with door
 * openings, glass walls, windows, automatic doors and lights — plus
 * the invisible parts every environment needs: walking collision and
 * the performance merge.
 *
 * How an environment uses it (see projects/<name>/environment.js):
 *
 *   export function buildEnvironment(scene) {
 *     const world = startWorld(scene, { wallHeight: 3.2 });          // 1. start
 *     addLights(scene, { center: [0, 0, -5], size: 20 });
 *     addFloor(world.group, -6, -10, 6, 0, MAT.floorWood);             // 2. build
 *     buildWall(world.group, { axis: 'x', at: 0, from: -6, to: 6, doors: [{ center: 0, width: 2 }] });
 *     place(world.group, F.createPlant(), 4, -2);
 *     return finishWorld({ bounds: { minX: -20, maxX: 20, minZ: -15, maxZ: 20 } }); // 3. finish
 *   }
 *
 * Units are metres. Looking from the entrance into the building:
 *   x = left (-) / right (+),  y = up,  z = towards the entrance (+) / deeper inside (-)
 *
 * ROTATION cheat-sheet for place() — which way the FRONT of an item points:
 *   FACE.entrance (+z)   FACE.back (-z)   FACE.right (+x)   FACE.left (-x)
 * ---------------------------------------------------------------
 */
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { CONFIG } from '../config.js';
import { MAT, windowViewTexture } from './materials.js';
import { addBox, createFramedPicture, createSlidingDoorPair } from './furniture.js';

export const FACE = { entrance: 0, back: Math.PI, right: Math.PI / 2, left: -Math.PI / 2 };

/* ---- The world being built ----
   `colliders`: every solid wall piece and every object standing on the floor, recorded as a
   rectangle on the floor plan { minX, maxX, minZ, maxZ, kind }. kind is 'wall' (solid — also
   hides markers behind it), 'glass' or 'object'. walk-controls.js stops visitors walking
   into them. buildWall() and place() record them automatically. */
let world = null;
const tempBox = new THREE.Box3();
const rectFromBox = (box, kind) => ({ minX: box.min.x, maxX: box.max.x, minZ: box.min.z, maxZ: box.max.z, kind });

/* ================================================================
   START / FINISH
   ================================================================ */

/**
 * Starts a new world. All options are optional:
 *   wallHeight (3.2), wallThickness (0.2), doorHeight (2.4) — defaults for buildWall()
 * Returns { group } — add everything you build to world.group.
 */
export function startWorld(scene, { wallHeight = 3.2, wallThickness = 0.2, doorHeight = 2.4 } = {}) {
  const group = new THREE.Group();
  group.name = 'environment';
  scene.add(group);
  world = { group, colliders: [], updaters: [], wallHeight, wallThickness, doorHeight };
  return world;
}

/**
 * Finishes the world and returns what the engine needs:
 *   { group, colliders, bounds, update(dt, camera) }
 * `bounds` = the area visitors can walk in: { minX, maxX, minZ, maxZ }.
 */
export function finishWorld({ bounds }) {
  if (CONFIG.graphics.mergeStaticMeshes) mergeStaticMeshes(world.group);
  const { group, colliders, updaters } = world;
  return {
    group,
    colliders,
    bounds,
    update(dt, camera) { updaters.forEach((fn) => fn(dt, camera)); },
  };
}

/** Makes an object block walking. (place() and buildWall() already do this for you.) */
export function blockWalking(object, kind = 'object') {
  world.colliders.push(rectFromBox(tempBox.setFromObject(object), kind));
}

/** Runs fn(dt, camera) every frame — for anything that animates. */
export function onEveryFrame(fn) {
  world.updaters.push(fn);
}

/* ================================================================
   LIGHTS
   ================================================================ */

/**
 * Soft sky light plus a "sun" that casts shadows, aimed at `center`.
 * `size` = half the width (metres) of the area that gets shadows — make it cover the building.
 */
export function addLights(scene, { center = [0, 0, 0], size = 30 } = {}) {
  scene.add(new THREE.HemisphereLight('#ffffff', '#b9b2a6', 0.9));

  // The sun shines through the roof on purpose: it gives furniture soft contact shadows on the floor
  const [cx, cy, cz] = center;
  const sun = new THREE.DirectionalLight('#fff4e5', 1.6);
  sun.position.set(cx + 8, cy + 30, cz + 22);
  sun.target.position.set(cx, cy, cz);
  scene.add(sun.target);
  if (CONFIG.graphics.shadows) {
    sun.castShadow = true;
    sun.shadow.mapSize.set(4096, 4096);
    Object.assign(sun.shadow.camera, { left: -size, right: size, top: size, bottom: -size, near: 1, far: 58 + size });
    sun.shadow.bias = -0.0004;
    sun.shadow.normalBias = 0.03;
  }
  scene.add(sun);
}

/* ================================================================
   PLACING THINGS
   ================================================================ */

/**
 * Adds `object` to `parent` at (x, z), turned by `rotationY` (see FACE), lifted by `y`.
 * Anything that reaches down to the floor also blocks walking; wall-mounted signs,
 * screens and pictures don't. Animated items (doors) never block.
 */
export function place(parent, object, x, z, rotationY = 0, y = 0) {
  object.position.set(x, y, z);
  object.rotation.y = rotationY;
  parent.add(object);
  if (!object.userData.dynamic) {
    tempBox.setFromObject(object);
    if (tempBox.min.y < 1.0) world.colliders.push(rectFromBox(tempBox, 'object'));
  }
  return object;
}

/** Flat floor rectangle between corners (x1, z1) and (x2, z2). Textures repeat every 2 m. */
export function addFloor(parent, x1, z1, x2, z2, material, y = 0) {
  const width = Math.abs(x2 - x1);
  const depth = Math.abs(z2 - z1);
  const geometry = new THREE.PlaneGeometry(width, depth);
  const uv = geometry.attributes.uv; // scale UVs to real-world size
  for (let i = 0; i < uv.count; i++) uv.setXY(i, (uv.getX(i) * width) / 2, (uv.getY(i) * depth) / 2);

  const floor = new THREE.Mesh(geometry, material);
  floor.rotation.x = -Math.PI / 2;
  floor.position.set((x1 + x2) / 2, y, (z1 + z2) / 2);
  floor.receiveShadow = true;
  parent.add(floor);
  return floor;
}

/* ================================================================
   WALLS, WINDOWS, DOORS
   ================================================================ */

/**
 * Straight wall with optional door openings.
 *   axis 'x' → wall runs along x, from `from` to `to`, at z = `at`
 *   axis 'z' → wall runs along z, from `from` to `to`, at x = `at`
 *   doors    → [{ center, width, height? }] openings; `center` is measured along the wall
 *   glass    → glass panes with thin frames (the parts above doors stay solid)
 *   height   → defaults to the world's wallHeight
 */
export function buildWall(parent, { axis, at, from, to, doors = [], glass = false, material = MAT.wall, height = world.wallHeight }) {
  const start = Math.min(from, to);
  const end = Math.max(from, to);
  const thickness = glass ? 0.06 : world.wallThickness;

  // 1. Cut the wall into pieces: solid parts between doors, plus a "header" above each door
  const pieces = []; // [alongStart, alongEnd, bottomY, topY]
  let cursor = start;
  [...doors].sort((a, b) => a.center - b.center).forEach((door) => {
    const doorStart = door.center - door.width / 2;
    const doorEnd = door.center + door.width / 2;
    if (doorStart > cursor) pieces.push([cursor, doorStart, 0, height]);
    pieces.push([doorStart, doorEnd, door.height ?? world.doorHeight, height]);
    cursor = doorEnd;
  });
  if (cursor < end) pieces.push([cursor, end, 0, height]);

  // 2. Build every piece as a box
  pieces.forEach(([a, b, y0, y1]) => {
    const isHeader = y0 > 0;
    const along = b - a;
    const [w, d] = axis === 'x' ? [along, thickness] : [thickness, along];
    const [x, z] = axis === 'x' ? [(a + b) / 2, at] : [at, (a + b) / 2];
    if (!isHeader) world.colliders.push({ minX: x - w / 2, maxX: x + w / 2, minZ: z - d / 2, maxZ: z + d / 2, kind: glass ? 'glass' : 'wall' });
    if (glass && !isHeader) {
      const pane = addBox(parent, w, y1 - y0, d, MAT.glass, x, (y0 + y1) / 2, z);
      pane.castShadow = false;
      pane.receiveShadow = false;
      addGlassFrame(parent, axis, at, a, b, height);
    } else {
      addBox(parent, w, y1 - y0, d, glass ? MAT.frame : material, x, (y0 + y1) / 2, z);
    }
  });
}

/** Thin dark frame around a glass pane: bottom rail, top rail and a post every ~1.5 m. */
function addGlassFrame(parent, axis, at, a, b, height) {
  const bar = (along, y, length, barHeight) => {
    const [w, d] = axis === 'x' ? [length, 0.08] : [0.08, length];
    const [x, z] = axis === 'x' ? [along, at] : [at, along];
    addBox(parent, w, barHeight, d, MAT.frame, x, y, z);
  };
  const length = b - a;
  bar((a + b) / 2, 0.04, length, 0.08);
  bar((a + b) / 2, height - 0.03, length, 0.06);
  const posts = Math.max(1, Math.round(length / 1.5));
  for (let i = 0; i <= posts; i++) bar(a + (length * i) / posts, height / 2, 0.06, height);
}

/**
 * Fake window (a view of sky and buildings) hanging on a wall.
 * (x, z) = its centre on the wall's inside face, `facing` = FACE.xxx direction it looks into the room.
 */
let windowTexture = null;
export function addWindow(parent, { x, z, width, facing, height = 1.5, y = 1.75 }) {
  windowTexture ??= windowViewTexture();
  place(parent, createFramedPicture(width, height, windowTexture, MAT.frame), x, z, facing, y);
}

/**
 * Pair of sliding doors (in a door opening) that open automatically when the camera
 * is within `triggerRadius` metres. `onChange(isOpen)` is called whenever they open or close.
 */
export function addProximityDoors(parent, { x, z, leafWidth, height, material = MAT.glass, triggerRadius = 3, onChange }) {
  const doors = createSlidingDoorPair(leafWidth, height, material);
  place(parent, doors.group, x, z);

  const centre = new THREE.Vector3(x, CONFIG.camera.eyeHeight, z);
  let amount = 0;     // 0 = closed … 1 = fully open
  let isOpen = false;
  onEveryFrame((dt, camera) => {
    const shouldOpen = camera.position.distanceTo(centre) < triggerRadius;
    if (shouldOpen !== isOpen) {
      isOpen = shouldOpen;
      onChange?.(isOpen);
    }
    amount += THREE.MathUtils.clamp((isOpen ? 1 : 0) - amount, -dt * 2.5, dt * 2.5); // steady sliding speed
    doors.setOpen(amount);
  });
}

/* ================================================================
   PERFORMANCE
   ================================================================ */

/**
 * Joins all static meshes that share a material into one big mesh, so hundreds
 * of furniture boxes become a handful of draw calls. Groups marked
 * `userData.dynamic = true` (doors, scanner) are left alone.
 * Switch off with settings.graphics.mergeStaticMeshes = false when debugging.
 */
function mergeStaticMeshes(root) {
  root.updateMatrixWorld(true);
  const buckets = new Map(); // "material|shadow flags" → { material, flags, meshes: [] }

  (function collect(object) {
    if (object.userData.dynamic) return;
    if (object.isMesh) {
      const key = `${object.material.uuid}|${object.castShadow}|${object.receiveShadow}`;
      if (!buckets.has(key)) buckets.set(key, { material: object.material, castShadow: object.castShadow, receiveShadow: object.receiveShadow, meshes: [] });
      buckets.get(key).meshes.push(object);
    }
    object.children.forEach(collect);
  })(root);

  buckets.forEach(({ material, castShadow, receiveShadow, meshes }) => {
    if (meshes.length < 2) return;
    const geometries = meshes.map((mesh) => {
      const geometry = mesh.geometry.index ? mesh.geometry.toNonIndexed() : mesh.geometry.clone();
      return geometry.applyMatrix4(mesh.matrixWorld); // bake position/rotation into the vertices
    });
    const merged = mergeGeometries(geometries);
    geometries.forEach((g) => g.dispose());
    if (!merged) return; // incompatible shapes — keep the originals

    meshes.forEach((mesh) => mesh.removeFromParent());
    const mesh = new THREE.Mesh(merged, material);
    mesh.castShadow = castShadow;
    mesh.receiveShadow = receiveShadow;
    root.add(mesh);
  });
}
