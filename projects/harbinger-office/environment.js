/**
 * environment.js — the 3D Harbinger Group office
 * ---------------------------------------------------------------
 * The engine calls buildEnvironment(scene) once and gets back
 * { group, colliders, bounds, update } (made by finishWorld()).
 *
 * FLOOR PLAN (top view, metres). The entrance is at the bottom:
 *
 *   z=-34 ┌───────────────────────────────────────┐
 *         │              PANTRY                   │
 *   z=-26 ├─────────────┬── open ──┬──────────────┤
 *         │             │          │ CABIN 3      │ z -26…-22
 *         │  MEETING    │ corridor │ CABIN 2      │ z -22…-18
 *         │  ROOM       │          │ CABIN 1      │ z -18…-14
 *   z=-14 ├─────────────┘          └──────────────┤
 *         │           OPEN WORKSPACE              │
 *   z=0   ├────────────[ biometric door ]─────────┤
 *         │  RECEPTION               LOUNGE       │
 *   z=8   └────────────[ entrance doors ]─────────┘
 *        x=-12        x=-3   x=0   x=3         x=12
 *                      OUTSIDE (z > 8)
 *
 * Each area has its own build function below, so you can change one
 * room without touching the others. Building blocks come from the kit:
 *   engine/kit/building.js   walls, floors, doors, windows, place(), FACE, lights
 *   engine/kit/furniture.js  desks, chairs, plants, signs, screens… (F.createXxx)
 *   engine/kit/materials.js  colours (MAT.xxx) and pictures for screens and boards
 * ---------------------------------------------------------------
 */
import { CONFIG } from '../../engine/config.js';
import {
  FACE, startWorld, finishWorld, addLights, place, addFloor, buildWall, addWindow, addProximityDoors, blockWalking,
} from '../../engine/kit/building.js';
import * as F from '../../engine/kit/furniture.js';
import {
  MAT, slideTexture, videoCallTexture, menuBoardTexture, noticeBoardTexture, artTexture,
} from '../../engine/kit/materials.js';
import PROJECT from './project-config.js';

const { addBox } = F;

/* ---- Building dimensions (metres) ---- */
const H = 3.2;       // ceiling height
const DOOR_H = 2.4;  // standard door height

export function buildEnvironment(scene) {
  const world = startWorld(scene, { wallHeight: H, doorHeight: DOOR_H });
  addLights(scene, { center: [0, 0, -10], size: 32 });

  const g = world.group;
  buildShell(g);
  buildExterior(g);
  buildLobby(g);
  buildWorkspace(g);
  buildMeetingRoom(g);
  buildCabins(g);
  buildPantry(g);

  return finishWorld({ bounds: { minX: -30, maxX: 30, minZ: -40, maxZ: 45 } }); // visitors can't walk outside this area
}

/* ================================================================
   BUILDING SHELL — floors, outer walls, roof / ceiling
   ================================================================ */
function buildShell(parent) {
  // One floor per area, each with its own material
  addFloor(parent, -12, 0, 12, 8, MAT.floorMarble);          // lobby
  addFloor(parent, -12, -14, 12, 0, MAT.floorCarpet);        // workspace
  addFloor(parent, -12, -26, -3, -14, MAT.floorCarpetDark);  // meeting room
  addFloor(parent, -3, -26, 3, -14, MAT.floorWood);          // corridor
  addFloor(parent, 3, -26, 12, -14, MAT.floorWood);          // cabins
  addFloor(parent, -12, -34, 12, -26, MAT.floorPantry);      // pantry

  // Outer walls
  buildWall(parent, { axis: 'z', at: -12, from: -34, to: 8 });  // left
  buildWall(parent, { axis: 'z', at: 12, from: -34, to: 8 });   // right
  buildWall(parent, { axis: 'x', at: -34, from: -12, to: 12 }); // back

  // Front: glass facade with the entrance opening (the sliding doors are added in buildExterior)
  buildWall(parent, { axis: 'x', at: 8, from: -12, to: 12, doors: [{ center: 0, width: 3, height: 2.6 }], glass: true });

  if (CONFIG.graphics.showCeiling) {
    // Roof slab — its underside is the ceiling
    const roof = addBox(parent, 24.4, 0.3, 42.4, MAT.ceiling, 0, H + 0.15, -13);
    roof.castShadow = false;

    // Ceiling light panels on a grid (positions chosen to avoid the interior walls)
    for (const x of [-9, -4.5, 0, 4.5, 9]) {
      for (let z = 5; z >= -31; z -= 4) {
        const panel = addBox(parent, 1.2, 0.03, 0.6, MAT.lightPanel, x, H - 0.015, z);
        panel.castShadow = false;
      }
    }
  }
}

/* ================================================================
   OUTSIDE — ground, walkway, company sign, trees, entrance doors
   ================================================================ */
function buildExterior(parent) {
  addFloor(parent, -90, -90, 90, 90, MAT.grass, -0.02);
  addFloor(parent, -14, 8, 14, 12, MAT.pavers, 0.002);       // front plaza
  addFloor(parent, -2.5, 12, 2.5, 40, MAT.pavers, 0.002);    // walkway
  addFloor(parent, -1.2, 10, 1.2, 11.4, MAT.doormat, 0.008); // door mat

  // Entrance canopy, and the parapet above the facade carrying the company name
  addBox(parent, 7, 0.15, 2.6, MAT.frame, 0, 3.0, 9.3);
  const parapet = addBox(parent, 24.4, 1.1, 0.3, MAT.wall, 0, H + 0.56, 8.05);
  parapet.castShadow = false;
  place(parent, F.createSign(PROJECT.companyName, 8, 0.8, { background: null, color: CONFIG.theme.secondary }), 0, 8.21, FACE.entrance, H + 0.55);

  // Hedges along the facade, planters beside the door, visitor info stand
  [-8, 8].forEach((x) => blockWalking(addBox(parent, 7, 0.6, 0.8, MAT.hedge, x, 0.3, 8.7)));
  place(parent, F.createPlanter(), -3.8, 9.3);
  place(parent, F.createPlanter(), 3.8, 9.3);
  place(parent, F.createInfoKiosk(), 3.0, 12.5);

  // Trees and lamp posts
  const trees = [[-7, 14], [7, 14], [-13, 18], [13, 18], [-17, 5], [17, 5], [-17, -10], [17, -10], [-16, -26], [16, -26], [-8, 24], [9, 26]];
  trees.forEach(([x, z], i) => place(parent, F.createTree(4.5 + (i % 3) * 0.8), x, z));
  [[-3.6, 16], [3.6, 16], [-3.6, 23], [3.6, 23]].forEach(([x, z]) => place(parent, F.createLampPost(), x, z));

  // Automatic sliding glass doors — open when the camera comes within 6 m
  addProximityDoors(parent, { x: 0, z: 8.07, leafWidth: 1.5, height: 2.6, material: MAT.glass, triggerRadius: 6 });
}

/* ================================================================
   LOBBY — reception, logo wall, lounge, biometric door
   ================================================================ */
function buildLobby(parent) {
  // Wall between lobby and workspace with the secure door in the middle
  buildWall(parent, { axis: 'x', at: 0, from: -12, to: 12, doors: [{ center: 0, width: 2 }] });

  // Biometric scanner right of the door; its screen turns green while the door is open
  const scanner = F.createBiometricScanner();
  place(parent, scanner.group, 1.55, 0.13, FACE.entrance, 1.3);
  addProximityDoors(parent, {
    x: 0, z: 0, leafWidth: 1.0, height: DOOR_H, material: MAT.frostedGlass, triggerRadius: 2.6,
    onChange: scanner.setGranted,
  });
  place(parent, F.createSign('EMPLOYEES ONLY', 1.6, 0.3, { background: '#2b2f36' }), 0, 0.115, FACE.entrance, 2.8);

  // Reception: dark feature wall with the logo, and the desk in front of it
  addBox(parent, 6.5, H, 0.06, MAT.accentWall, -5, H / 2, 0.13);
  place(parent, F.createSign(`${PROJECT.companyName}\n${PROJECT.companyTagline}`, 4.4, 1.2, { background: null }), -5, 0.17, FACE.entrance, 2.2);
  place(parent, F.createReceptionDesk('RECEPTION'), -5, 3.6);

  // Lobby TV on the left wall
  const slide = slideTexture(`Welcome to ${PROJECT.companyName}`, PROJECT.companyTagline);
  place(parent, F.createScreen(2.0, 1.125, slide), -11.86, 4.5, FACE.right, 1.9);

  // Waiting lounge on the right
  addFloor(parent, 7.3, 1.4, 11, 5.4, MAT.rug, 0.004);
  place(parent, F.createSofa(2.4), 11.3, 3.4, FACE.left);
  place(parent, F.createSofa(2.2), 8.6, 0.6, FACE.entrance);
  place(parent, F.createCoffeeTable(), 9.3, 3.2);

  [[-11.3, 7.2], [11.3, 7.2], [-11.3, 0.8], [2.4, 0.7], [6.8, 0.7]].forEach(([x, z]) => place(parent, F.createPlant(), x, z));
}

/* ================================================================
   OPEN WORKSPACE — 8 pods of 4 desks, printer, notice board
   ================================================================ */
function buildWorkspace(parent) {
  const chairColours = [MAT.fabricBlue, MAT.fabricGrey, MAT.fabricBrand, MAT.fabricGreen];
  let n = 0;
  for (const z of [-4, -10]) {
    for (const x of [-8.5, -4.5, 4.5, 8.5]) {
      place(parent, F.createCubicleCluster(chairColours[n++ % chairColours.length]), x, z);
    }
  }

  place(parent, F.createPrinter(), 3.8, -13.45);
  place(parent, F.createFramedPicture(2.2, 1.4, noticeBoardTexture(), MAT.woodDark), -11.87, -7, FACE.right, 1.6);

  sideWindow(parent, -1, -13, -9);
  sideWindow(parent, -1, -5, -1);
  sideWindow(parent, 1, -13, -1);

  [[-11.3, -0.8], [11.3, -0.8], [-11.3, -13.2], [11.3, -13.2], [-2.4, -7], [2.4, -7]].forEach(([x, z]) => place(parent, F.createPlant(), x, z));
}

/* ================================================================
   MEETING ROOM — glass wall to the corridor, table, screen, whiteboard
   ================================================================ */
function buildMeetingRoom(parent) {
  buildWall(parent, { axis: 'x', at: -14, from: -12, to: -3 });                         // wall facing the workspace
  buildWall(parent, { axis: 'z', at: -3, from: -26, to: -14, doors: [{ center: -20, width: 1.6 }], glass: true });
  place(parent, F.createSign(`MEETING ROOM · ${PROJECT.meetingRoomName.toUpperCase()}`, 2.2, 0.36), -2.95, -20, FACE.right, 2.8);

  place(parent, F.createConferenceTable(4.4, 1.5, 4), -7.6, -20);
  place(parent, F.createScreen(2.2, 1.24, videoCallTexture()), -11.87, -18.2, FACE.right, 1.65);
  addBox(parent, 0.08, 0.06, 0.5, MAT.blackMetal, -11.85, 2.36, -18.2);                 // camera bar above the screen
  place(parent, F.createWhiteboard(2.4, 1.2), -11.87, -22.8, FACE.right, 1.5);
  place(parent, F.createFramedPicture(1.6, 1.1, artTexture(3)), -7.5, -14.13, FACE.back, 1.7);

  [[-11.3, -14.7], [-11.3, -25.3], [-3.7, -25.3]].forEach(([x, z]) => place(parent, F.createPlant(), x, z));
}

/* ================================================================
   LEADERSHIP CABINS — 3 private offices off the corridor
   ================================================================ */
const CABIN_CENTRES = [-16, -20, -24]; // z of the middle of each cabin (and its door)

function buildCabins(parent) {
  buildWall(parent, { axis: 'x', at: -14, from: 3, to: 12 });
  buildWall(parent, { axis: 'x', at: -18, from: 3, to: 12 });
  buildWall(parent, { axis: 'x', at: -22, from: 3, to: 12 });
  buildWall(parent, { axis: 'z', at: 3, from: -26, to: -14, doors: CABIN_CENTRES.map((z) => ({ center: z, width: 1.2 })), glass: true });

  PROJECT.cabins.slice(0, 3).forEach((person, i) => {
    const z = CABIN_CENTRES[i];
    place(parent, F.createSign(`${person.title} · ${person.name}`, 1.8, 0.32), 2.95, z, FACE.left, 2.8); // above the door
    place(parent, F.createExecutiveDesk(`${person.name}\n${person.title}`), 9.4, z, FACE.right);
    place(parent, F.createBookshelf(2.4, 2.1, i + 1), 11.72, z, FACE.left);
    place(parent, F.createPlant(1.4), 11.3, z - 1.55);
    place(parent, F.createPlant(1.1), 3.6, z + 1.5);
    place(parent, F.createFramedPicture(1.2, 0.85, artTexture(i + 5)), 8.6, z + 1.88, FACE.back, 1.7);
  });

  // Trophies on top of the first cabin's bookshelf
  [-0.6, 0.1, 0.8].forEach((dz) => place(parent, F.createTrophy(), 11.72, CABIN_CENTRES[0] + dz, 0, 2.08));

  // Plants in the corridor corners
  [[-2.4, -14.8], [2.4, -14.8], [-2.4, -25.4], [2.4, -25.4]].forEach(([x, z]) => place(parent, F.createPlant(1.1), x, z));
}

/* ================================================================
   PANTRY — kitchen counter, fridge, vending machine, café tables
   ================================================================ */
function buildPantry(parent) {
  buildWall(parent, { axis: 'x', at: -26, from: -12, to: 12, doors: [{ center: 0, width: 6, height: 2.7 }] });
  place(parent, F.createSign('PANTRY & CAFÉ', 2.4, 0.4, { background: CONFIG.theme.primary, color: '#ffffff' }), 0, -25.885, FACE.entrance, 2.95);

  place(parent, F.createKitchenCounter(8), -2, -33.6);
  place(parent, F.createCoffeeMachine(), 0.9, -33.65, FACE.entrance, 0.9);
  place(parent, F.createMicrowave(), -4.8, -33.7, FACE.entrance, 0.9);
  place(parent, F.createFridge(), 2.55, -33.55);
  place(parent, F.createVendingMachine(), 4.15, -33.5);
  place(parent, F.createFramedPicture(2.0, 1.33, menuBoardTexture(), MAT.woodDark), 6.3, -33.87, FACE.entrance, 1.75);

  const tables = [[-3.0, -30.8], [-7.4, -30.4], [3.4, -30.8], [7.8, -30.4], [-8.6, -32.7]];
  const chairColours = [MAT.fabricBrand, MAT.fabricGreen, MAT.fabricBlue];
  tables.forEach(([x, z], i) => place(parent, F.createRoundTableSet(chairColours[i % 3]), x, z, (i % 2) * (Math.PI / 4)));

  sideWindow(parent, -1, -33, -27);
  sideWindow(parent, 1, -33, -27);
  [[-11.3, -26.7], [11.3, -26.7], [11.3, -33.3]].forEach(([x, z]) => place(parent, F.createPlant(), x, z));
}

/* ================================================================
   HELPERS
   ================================================================ */

/** Fake window on the left (side -1) or right (side 1) outer wall, between zFrom and zTo. */
function sideWindow(parent, side, zFrom, zTo) {
  addWindow(parent, {
    x: side * 11.88, // just in front of the wall's inside face
    z: (zFrom + zTo) / 2,
    width: Math.abs(zTo - zFrom),
    facing: side < 0 ? FACE.right : FACE.left,
  });
}
