/**
 * engine/environments/model.js — environment type "model"
 * ---------------------------------------------------------------
 * Loads a 3D model file (.glb or .gltf) made in Blender, SketchUp,
 * 3ds Max, Revit… and turns it into a walkable tour environment.
 *
 * In project-config.js:
 *   environment: 'assets/models/bank.glb'
 *   or with options:
 *   environment: {
 *     file: 'assets/models/bank.glb',
 *     scale: 1,              // 0.01 if the model was made in centimetres
 *     position: [0, 0, 0],   // move the model
 *     rotationDeg: 0,        // turn the model around the vertical axis
 *     collision: true,       // false = walk through everything
 *   }
 *
 * Model tips: metres, y = up, floor at the height where visitors walk.
 * Walking collision is worked out automatically — see autoColliders().
 * ---------------------------------------------------------------
 */
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { resolveAsset } from '../config.js';
import { addLights } from '../kit/building.js';

export async function loadModelEnvironment(scene, env) {
  let gltf;
  try {
    gltf = await new GLTFLoader().loadAsync(resolveAsset(env.file));
  } catch (error) {
    throw new Error(`Could not load the 3D model "${env.file}" (${error.message || error}).`);
  }

  const model = gltf.scene;
  model.scale.setScalar(env.scale ?? 1);
  model.position.set(...(env.position ?? [0, 0, 0]));
  model.rotation.y = THREE.MathUtils.degToRad(env.rotationDeg ?? 0);
  model.traverse((object) => {
    if (object.isMesh) {
      object.castShadow = true;
      object.receiveShadow = true;
    }
  });
  scene.add(model);
  model.updateMatrixWorld(true);

  // Size of the model → lights, walking area and start-screen view
  const box = new THREE.Box3().setFromObject(model);
  const center = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3());
  const half = Math.max(size.x, size.z) / 2;
  addLights(scene, { center: [center.x, box.min.y, center.z], size: half + 5 });

  return {
    group: model,
    colliders: env.collision === false ? [] : autoColliders(model, box.min.y),
    bounds: { minX: box.min.x - 10, maxX: box.max.x + 10, minZ: box.min.z - 10, maxZ: box.max.z + 10 },
    introView: {
      position: [center.x, box.min.y + Math.max(size.y * 1.5, 6), box.max.z + half + 6],
      lookAt: [center.x, box.min.y + 1, center.z],
    },
    update() {},
  };
}

/**
 * Walking collision from the model's separate objects:
 *   - blocks: anything standing on the floor that is taller than 30 cm (walls, furniture)
 *   - ignored: floors, ceilings, lights, wall pictures, and very large combined objects (over 40 m² floor area)
 *   - objects named "…nocollide…" never block
 *   - objects named "…collider…" block but are hidden (invisible walls you add in the modelling tool)
 * Objects 2 m or taller count as walls (they also hide markers behind them); glass stays see-through.
 * Works best when walls and furniture are separate objects in the model.
 */
function autoColliders(model, floorY) {
  const colliders = [];
  const box = new THREE.Box3();
  model.traverse((object) => {
    if (!object.isMesh) return;
    const name = object.name.toLowerCase();
    if (name.includes('nocollide')) return;

    box.setFromObject(object);
    const height = box.max.y - box.min.y;
    const floorArea = (box.max.x - box.min.x) * (box.max.z - box.min.z);
    const invisibleWall = name.includes('collider');
    if (invisibleWall) object.visible = false;
    else if (height < 0.3 || box.min.y > floorY + 1.0 || floorArea > 40) return;

    const material = Array.isArray(object.material) ? object.material[0] : object.material;
    const seeThrough = material?.transparent && material.opacity < 0.9;
    const kind = seeThrough ? 'glass' : height >= 2 ? 'wall' : 'object';
    colliders.push({ minX: box.min.x, maxX: box.max.x, minZ: box.min.z, maxZ: box.max.z, kind });
  });
  return colliders;
}
