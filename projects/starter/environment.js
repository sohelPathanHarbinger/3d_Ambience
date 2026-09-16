/**
 * environment.js — STARTER: a single room with an entrance
 * ---------------------------------------------------------------
 * Shows the smallest complete environment. Copy it and grow it.
 *
 *   z=-10 ┌──────────────────────┐
 *         │  plant   (TV)  plant │
 *         │       [desk]         │
 *         │ sofa           window│
 *   z=0   └────────[door]────────┘
 *        x=-6       x=0       x=6
 *               OUTSIDE (z > 0)
 *
 * Building blocks: engine/kit/building.js (walls, floors, doors, place),
 * engine/kit/furniture.js (F.createXxx), engine/kit/materials.js (MAT).
 * ---------------------------------------------------------------
 */
import { CONFIG } from '../../engine/config.js';
import {
  FACE, startWorld, finishWorld, addLights, place, addFloor, buildWall, addWindow, addProximityDoors,
} from '../../engine/kit/building.js';
import * as F from '../../engine/kit/furniture.js';
import { MAT, slideTexture } from '../../engine/kit/materials.js';
import PROJECT from './project-config.js';

const H = 3.2; // ceiling height (metres)

export function buildEnvironment(scene) {
  const world = startWorld(scene, { wallHeight: H });
  const g = world.group;
  addLights(scene, { center: [0, 0, -5], size: 20 });

  // Outside: grass and a path to the door
  addFloor(g, -60, -60, 60, 60, MAT.grass, -0.02);
  addFloor(g, -1.5, 0, 1.5, 20, MAT.pavers, 0.002);
  [[-5, 6], [5, 6]].forEach(([x, z]) => place(g, F.createTree(4.5), x, z));

  // The room: floor, four walls (the front one has a door), automatic doors, sign
  addFloor(g, -6, -10, 6, 0, MAT.floorWood);
  buildWall(g, { axis: 'z', at: -6, from: -10, to: 0 });                                  // left
  buildWall(g, { axis: 'z', at: 6, from: -10, to: 0 });                                   // right
  buildWall(g, { axis: 'x', at: -10, from: -6, to: 6 });                                  // back
  buildWall(g, { axis: 'x', at: 0, from: -6, to: 6, doors: [{ center: 0, width: 2 }] });  // front, with door
  addProximityDoors(g, { x: 0, z: 0, leafWidth: 1.0, height: 2.4, triggerRadius: 4 });
  place(g, F.createSign(PROJECT.companyName, 3, 0.5), 0, 0.115, FACE.entrance, 2.8);

  // Roof (its underside is the ceiling) and light panels
  if (CONFIG.graphics.showCeiling) {
    F.addBox(g, 12.4, 0.3, 10.4, MAT.ceiling, 0, H + 0.15, -5).castShadow = false;
    [[-3, -3], [3, -3], [-3, -7], [3, -7]].forEach(([x, z]) => {
      F.addBox(g, 1.2, 0.03, 0.6, MAT.lightPanel, x, H - 0.015, z).castShadow = false;
    });
  }

  // Inside
  place(g, F.createReceptionDesk('WELCOME'), 0, -6);
  place(g, F.createScreen(2.0, 1.125, slideTexture(`Welcome to ${PROJECT.companyName}`, PROJECT.companyTagline)), 0, -9.87, FACE.entrance, 2.0);
  place(g, F.createSofa(2.2), -5.3, -3, FACE.right);
  [[-5.4, -9.4], [5.4, -9.4], [5.4, -0.6]].forEach(([x, z]) => place(g, F.createPlant(), x, z));
  addWindow(g, { x: 5.88, z: -5, width: 5, facing: FACE.left });

  return finishWorld({ bounds: { minX: -20, maxX: 20, minZ: -15, maxZ: 22 } });
}
