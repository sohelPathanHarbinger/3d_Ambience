/**
 * furniture.js
 * ---------------------------------------------------------------
 * "Builder" functions that create furniture and props out of simple
 * shapes (boxes, cylinders, low-poly blobs). Each one returns a
 * THREE.Group standing on the floor (y = 0) at the origin, so an
 * environment only has to position and rotate it (place() in building.js).
 * Every project can use them; add project-only props in the project folder.
 *
 * Conventions
 *   - Units are metres.
 *   - The FRONT of every item faces +z when its rotation is 0.
 *   - Chairs face -z (towards the desk in front of them).
 *   - Wall-mounted items (screens, pictures) are centred on the origin.
 *
 * To add a new object: copy a similar function and change the boxes.
 * addBox(parent, width, height, depth, material, x, y, z) — x/y/z is the CENTRE of the box.
 * ---------------------------------------------------------------
 */
import * as THREE from 'three';
import {
  MAT, makeTextTexture, pictureMaterial, scannerScreenTexture, whiteboardTexture, vendingTexture,
} from './materials.js';

/* ================================================================
   Basic shape helpers
   ================================================================ */
const geometryCache = new Map(); // identical shapes share one geometry (saves memory)

function cached(key, create) {
  if (!geometryCache.has(key)) geometryCache.set(key, create());
  return geometryCache.get(key);
}

function addMesh(parent, geometry, material, x, y, z) {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

/** Adds a box to `parent`. (x, y, z) is the CENTRE of the box. */
export function addBox(parent, w, h, d, material, x = 0, y = 0, z = 0) {
  const geometry = cached(`box${w}|${h}|${d}`, () => new THREE.BoxGeometry(w, h, d));
  return addMesh(parent, geometry, material, x, y, z);
}

/** Adds an upright cylinder. (x, y, z) is the CENTRE. Few segments = faceted look. */
export function addCylinder(parent, radiusTop, radiusBottom, h, material, x = 0, y = 0, z = 0, segments = 20) {
  const geometry = cached(`cyl${radiusTop}|${radiusBottom}|${h}|${segments}`,
    () => new THREE.CylinderGeometry(radiusTop, radiusBottom, h, segments));
  return addMesh(parent, geometry, material, x, y, z);
}

/** Adds a low-poly "blob" (leaves, tree tops, bushes). */
export function addBlob(parent, radius, material, x = 0, y = 0, z = 0) {
  const geometry = cached('blob', () => new THREE.IcosahedronGeometry(1, 0));
  const mesh = addMesh(parent, geometry, material, x, y, z);
  mesh.scale.setScalar(radius);
  return mesh;
}

/** Adds a flat rectangle facing +z (signs, screens, pictures). */
export function addPlane(parent, w, h, material, x = 0, y = 0, z = 0) {
  const mesh = addMesh(parent, new THREE.PlaneGeometry(w, h), material, x, y, z);
  mesh.castShadow = false;
  return mesh;
}

/* ================================================================
   Signs, screens and pictures (centred on the origin, facing +z)
   ================================================================ */

/** Flat sign with text. `options` go to makeTextTexture (background, color). background: null = transparent. */
export function createSign(text, width, height, options = {}) {
  const pixelsWide = 2048;
  const texture = makeTextTexture(text, {
    width: pixelsWide,
    height: Math.min(1024, Math.round((pixelsWide * height) / width)),
    ...options,
  });
  const group = new THREE.Group();
  addPlane(group, width, height, pictureMaterial(texture, { transparent: options.background === null }));
  return group;
}

/** TV / monitor on a wall showing `texture`. */
export function createScreen(width, height, texture) {
  const group = new THREE.Group();
  addBox(group, width + 0.06, height + 0.06, 0.05, MAT.blackMetal);
  addPlane(group, width, height, pictureMaterial(texture), 0, 0, 0.026);
  return group;
}

/** Framed picture (wall art, notice board, fake window, menu board). */
export function createFramedPicture(width, height, texture, frameMaterial = MAT.blackMetal) {
  const group = new THREE.Group();
  addBox(group, width + 0.08, height + 0.08, 0.04, frameMaterial);
  addPlane(group, width, height, pictureMaterial(texture), 0, 0, 0.021);
  return group;
}

/** Whiteboard with a marker tray. */
export function createWhiteboard(width = 2.4, height = 1.2) {
  const group = createFramedPicture(width, height, whiteboardTexture(), MAT.metal);
  addBox(group, width * 0.6, 0.03, 0.08, MAT.metal, 0, -height / 2 - 0.05, 0.04);
  return group;
}

/* ================================================================
   Desks and chairs
   ================================================================ */

/** Office chair, facing -z. `tall` = executive high-back version. */
export function createOfficeChair(material = MAT.fabricBlue, tall = false) {
  const group = new THREE.Group();
  addCylinder(group, 0.3, 0.3, 0.04, MAT.blackMetal, 0, 0.05, 0, 5);   // base (simplified 5-star)
  addCylinder(group, 0.03, 0.03, 0.36, MAT.metal, 0, 0.25, 0, 8);       // gas lift
  addBox(group, 0.52, 0.08, 0.5, material, 0, 0.47, 0);                 // seat
  const backHeight = tall ? 0.8 : 0.52;
  addBox(group, 0.48, backHeight, 0.07, material, 0, 0.55 + backHeight / 2, 0.24); // backrest
  return group;
}

/** Computer monitor with the screen facing +z. y = 0 is the desk surface. */
export function createMonitor(width = 0.62) {
  const group = new THREE.Group();
  const height = width * 0.6;
  addBox(group, 0.22, 0.02, 0.16, MAT.blackMetal, 0, 0.01, 0);                            // foot
  addBox(group, 0.04, 0.22, 0.03, MAT.blackMetal, 0, 0.12, -0.03);                        // neck
  addBox(group, width, height, 0.03, MAT.blackMetal, 0, 0.12 + height / 2, 0);            // body
  addBox(group, width - 0.04, height - 0.04, 0.005, MAT.screen, 0, 0.12 + height / 2, 0.016); // glowing screen
  return group;
}

/** One desk with monitor, keyboard and chair. The person sits on the +z side. */
export function createWorkstation(chairMaterial = MAT.fabricBlue) {
  const group = new THREE.Group();
  addBox(group, 1.4, 0.04, 0.7, MAT.deskTop, 0, 0.74, 0);        // desk top
  addBox(group, 0.04, 0.72, 0.66, MAT.deskLeg, -0.66, 0.36, 0);  // side panels
  addBox(group, 0.04, 0.72, 0.66, MAT.deskLeg, 0.66, 0.36, 0);

  const monitor = createMonitor();
  monitor.position.set(0, 0.76, -0.2);
  group.add(monitor);

  addBox(group, 0.45, 0.02, 0.14, MAT.keyboard, -0.05, 0.77, 0.08); // keyboard
  addBox(group, 0.06, 0.02, 0.1, MAT.keyboard, 0.3, 0.77, 0.1);     // mouse

  const chair = createOfficeChair(chairMaterial);
  chair.position.set(0, 0, 0.6);
  group.add(chair);
  return group;
}

/** A pod of 4 desks (2 facing each way) with low partition panels. About 2.9 m × 3 m. */
export function createCubicleCluster(chairMaterial = MAT.fabricBlue) {
  const group = new THREE.Group();
  const desks = [                              // [x, z, rotation]
    [-0.72, 0.36, 0], [0.72, 0.36, 0],
    [-0.72, -0.36, Math.PI], [0.72, -0.36, Math.PI],
  ];
  desks.forEach(([x, z, rotation]) => {
    const desk = createWorkstation(chairMaterial);
    desk.position.set(x, 0, z);
    desk.rotation.y = rotation;
    group.add(desk);
  });
  addBox(group, 2.9, 1.25, 0.05, MAT.partition, 0, 0.625, 0);    // centre divider
  addBox(group, 0.05, 1.1, 1.44, MAT.partition, -1.45, 0.55, 0); // end panels
  addBox(group, 0.05, 1.1, 1.44, MAT.partition, 1.45, 0.55, 0);
  addBox(group, 0.03, 0.4, 1.4, MAT.frostedGlass, 0, 0.96, 0);   // low glass between neighbours
  addBox(group, 2.94, 0.03, 0.08, MAT.metal, 0, 1.265, 0);        // top trim
  return group;
}

/** Reception counter. Visitors stand on the +z side, the receptionist sits behind (-z). */
export function createReceptionDesk(label = '') {
  const group = new THREE.Group();
  addBox(group, 3.4, 1.1, 0.12, MAT.brandDark, 0, 0.55, 0.4);    // tall front panel
  addBox(group, 3.6, 0.05, 0.42, MAT.countertop, 0, 1.125, 0.35);     // counter ledge
  addBox(group, 0.12, 1.1, 0.9, MAT.brandDark, -1.64, 0.55, 0);  // side returns
  addBox(group, 0.12, 1.1, 0.9, MAT.brandDark, 1.64, 0.55, 0);
  addBox(group, 3.2, 0.04, 0.6, MAT.deskTop, 0, 0.74, -0.1);          // work surface
  addBox(group, 3.4, 0.03, 0.01, MAT.accentGlow, 0, 0.12, 0.465);     // glowing strip

  if (label) {
    const sign = createSign(label, 1.8, 0.28, { background: null });
    sign.position.set(0, 0.7, 0.462);
    group.add(sign);
  }

  [-0.7, 0.7].forEach((x) => {                                         // monitors face the receptionist
    const monitor = createMonitor(0.55);
    monitor.position.set(x, 0.76, 0.05);
    monitor.rotation.y = Math.PI;
    group.add(monitor);
  });
  const chair = createOfficeChair(MAT.fabricBrand);
  chair.position.set(0, 0, -0.8);
  chair.rotation.y = Math.PI;
  group.add(chair);

  addCylinder(group, 0.05, 0.06, 0.05, MAT.gold, 0.9, 1.175, 0.35, 12);  // desk bell
  addBox(group, 0.35, 0.03, 0.25, MAT.plasticWhite, -0.8, 1.165, 0.35); // visitor book
  return group;
}

/** Meeting table with chairs on both long sides plus one at the head (-x end). */
export function createConferenceTable(length = 4.4, width = 1.5, chairsPerSide = 4) {
  const group = new THREE.Group();
  addBox(group, length, 0.06, width, MAT.woodDark, 0, 0.75, 0);
  addBox(group, 0.5, 0.72, width * 0.45, MAT.blackMetal, -length * 0.32, 0.36, 0);  // pedestals
  addBox(group, 0.5, 0.72, width * 0.45, MAT.blackMetal, length * 0.32, 0.36, 0);
  addCylinder(group, 0.13, 0.15, 0.04, MAT.blackMetal, 0, 0.8, 0, 3);              // conference phone

  const spacing = length / chairsPerSide;
  for (let i = 0; i < chairsPerSide; i++) {
    const x = -length / 2 + spacing * (i + 0.5);
    const near = createOfficeChair(MAT.leather);
    near.position.set(x, 0, width / 2 + 0.35);
    group.add(near);
    const far = createOfficeChair(MAT.leather);
    far.position.set(x, 0, -width / 2 - 0.35);
    far.rotation.y = Math.PI;
    group.add(far);
  }
  const head = createOfficeChair(MAT.leather, true);
  head.position.set(-length / 2 - 0.5, 0, 0);
  head.rotation.y = -Math.PI / 2;
  group.add(head);
  return group;
}

/** Executive desk. The owner sits on the +z side, two guest chairs on the -z side. */
export function createExecutiveDesk(nameplate = '') {
  const group = new THREE.Group();
  addBox(group, 2.0, 0.06, 0.95, MAT.woodDark, 0, 0.76, 0);        // top
  addBox(group, 0.06, 0.73, 0.9, MAT.woodDark, -0.97, 0.365, 0);   // sides
  addBox(group, 0.06, 0.73, 0.9, MAT.woodDark, 0.97, 0.365, 0);
  addBox(group, 1.88, 0.55, 0.04, MAT.woodDark, 0, 0.45, -0.42);   // front (modesty) panel

  const monitor = createMonitor(0.7);
  monitor.position.set(-0.35, 0.79, -0.2);
  group.add(monitor);

  addBox(group, 0.34, 0.02, 0.24, MAT.metal, 0.5, 0.8, 0.12);           // laptop
  const lid = addBox(group, 0.34, 0.22, 0.01, MAT.metal, 0.5, 0.91, 0.0);
  lid.rotation.x = -0.25;

  addCylinder(group, 0.08, 0.1, 0.02, MAT.blackMetal, 0.85, 0.8, -0.3, 12);   // desk lamp
  addCylinder(group, 0.012, 0.012, 0.4, MAT.blackMetal, 0.85, 1.0, -0.3, 6);
  addCylinder(group, 0.05, 0.1, 0.1, MAT.plasticWhite, 0.85, 1.2, -0.3, 12);

  if (nameplate) {                                                       // name plate facing the guests
    addBox(group, 0.46, 0.12, 0.03, MAT.blackMetal, 0, 0.85, -0.385);
    const sign = createSign(nameplate, 0.42, 0.1, { background: '#1c1c1c', color: '#e9c46a' });
    sign.position.set(0, 0.85, -0.402);
    sign.rotation.y = Math.PI;
    group.add(sign);
  }

  const owner = createOfficeChair(MAT.leather, true);
  owner.position.set(0, 0, 0.85);
  group.add(owner);
  [-0.55, 0.55].forEach((x) => {
    const guest = createOfficeChair(MAT.fabricGrey);
    guest.position.set(x, 0, -1.0);
    guest.rotation.y = Math.PI;
    group.add(guest);
  });
  return group;
}

/* ================================================================
   Lounge and storage
   ================================================================ */

export function createSofa(width = 2.2, material = MAT.sofa) {
  const group = new THREE.Group();
  addBox(group, width, 0.42, 0.9, material, 0, 0.21, 0);                // base
  addBox(group, width - 0.36, 0.12, 0.7, MAT.cushion, 0, 0.48, 0.06);   // seat cushion
  addBox(group, width, 0.5, 0.2, material, 0, 0.67, -0.35);             // backrest
  addBox(group, 0.18, 0.62, 0.9, material, -width / 2 + 0.09, 0.31, 0); // arms
  addBox(group, 0.18, 0.62, 0.9, material, width / 2 - 0.09, 0.31, 0);
  return group;
}

export function createCoffeeTable() {
  const group = new THREE.Group();
  addBox(group, 1.2, 0.05, 0.65, MAT.woodLight, 0, 0.42, 0);
  [[-0.54, -0.27], [0.54, -0.27], [-0.54, 0.27], [0.54, 0.27]].forEach(([x, z]) => {
    addBox(group, 0.04, 0.4, 0.04, MAT.blackMetal, x, 0.2, z);
  });
  addBox(group, 0.3, 0.03, 0.22, MAT.fabricBrand, -0.2, 0.46, 0.05); // magazines
  return group;
}

/** Bookshelf, 35 cm deep. `seed` changes the arrangement of the books. */
export function createBookshelf(width = 2.4, height = 2.1, seed = 1) {
  const group = new THREE.Group();
  const depth = 0.35;
  addBox(group, width, height, 0.03, MAT.woodDark, 0, height / 2, -depth / 2 + 0.015); // back
  addBox(group, 0.04, height, depth, MAT.woodDark, -width / 2 + 0.02, height / 2, 0);  // sides
  addBox(group, 0.04, height, depth, MAT.woodDark, width / 2 - 0.02, height / 2, 0);

  let s = seed * 97;
  const random = () => (s = (s * 16807) % 2147483647) / 2147483647;
  const shelves = 5;
  for (let i = 0; i <= shelves; i++) {
    const y = 0.04 + (i * (height - 0.08)) / shelves;
    addBox(group, width - 0.08, 0.03, depth - 0.02, MAT.woodDark, 0, y, 0);
    if (i === shelves) break;
    // A row of book blocks with random gaps
    let x = -width / 2 + 0.1;
    while (x < width / 2 - 0.3) {
      if (random() < 0.25) { x += 0.15 + random() * 0.25; continue; }
      const blockWidth = 0.12 + random() * 0.2;
      const blockHeight = 0.2 + random() * 0.12;
      const material = MAT.books[Math.floor(random() * MAT.books.length)];
      addBox(group, blockWidth, blockHeight, 0.24, material, x + blockWidth / 2, y + 0.015 + blockHeight / 2, 0.01);
      x += blockWidth + 0.01;
    }
  }
  return group;
}

export function createTrophy() {
  const group = new THREE.Group();
  addBox(group, 0.12, 0.05, 0.12, MAT.woodDark, 0, 0.025, 0);
  addCylinder(group, 0.015, 0.02, 0.12, MAT.gold, 0, 0.11, 0, 8);
  addCylinder(group, 0.08, 0.03, 0.12, MAT.gold, 0, 0.23, 0, 12);
  return group;
}

export function createPrinter() {
  const group = new THREE.Group();
  addBox(group, 0.7, 0.65, 0.55, MAT.cabinet, 0, 0.325, 0);         // stand
  addBox(group, 0.62, 0.42, 0.5, MAT.plasticWhite, 0, 0.86, 0);      // printer body
  addBox(group, 0.4, 0.02, 0.2, MAT.plasticWhite, 0, 1.08, 0.12);    // paper tray
  addBox(group, 0.15, 0.08, 0.005, MAT.screen, 0.18, 0.95, 0.253);   // control screen
  return group;
}

/* ================================================================
   Pantry
   ================================================================ */

/** Kitchen counter with wall cabinets and sink. Its back is against a wall. */
export function createKitchenCounter(length = 8) {
  const group = new THREE.Group();
  addBox(group, length, 0.84, 0.6, MAT.cabinet, 0, 0.44, 0);             // base cabinets
  addBox(group, length + 0.04, 0.04, 0.64, MAT.countertop, 0, 0.88, 0.02); // worktop
  for (let x = -length / 2 + 0.6; x < length / 2; x += 0.6) {             // cabinet door gaps
    addBox(group, 0.01, 0.78, 0.005, MAT.blackMetal, x, 0.46, 0.302);
  }
  addBox(group, length, 0.72, 0.36, MAT.cabinetUpper, 0, 1.96, -0.12);    // wall cabinets
  addBox(group, length, 0.68, 0.02, MAT.backsplash, 0, 1.24, -0.29);      // splash-back
  addBox(group, 0.6, 0.012, 0.42, MAT.steel, -1, 0.905, 0.02);            // sink
  addCylinder(group, 0.015, 0.015, 0.3, MAT.steel, -1, 1.05, -0.2, 8);    // tap
  addBox(group, 0.03, 0.03, 0.16, MAT.steel, -1, 1.19, -0.13);
  return group;
}

export function createFridge() {
  const group = new THREE.Group();
  addBox(group, 0.8, 1.9, 0.7, MAT.steel, 0, 0.95, 0);
  addBox(group, 0.78, 0.01, 0.005, MAT.blackMetal, 0, 1.25, 0.352);  // door split
  addBox(group, 0.03, 0.5, 0.04, MAT.blackMetal, -0.32, 1.55, 0.37); // handles
  addBox(group, 0.03, 0.4, 0.04, MAT.blackMetal, -0.32, 0.95, 0.37);
  return group;
}

/** Coffee machine. y = 0 is the counter top. */
export function createCoffeeMachine() {
  const group = new THREE.Group();
  addBox(group, 0.34, 0.45, 0.4, MAT.blackMetal, 0, 0.225, 0);
  addBox(group, 0.2, 0.12, 0.06, MAT.steel, 0, 0.3, 0.2);            // spout
  addBox(group, 0.26, 0.02, 0.14, MAT.steel, 0, 0.03, 0.24);         // drip tray
  addCylinder(group, 0.04, 0.035, 0.09, MAT.mug, 0, 0.085, 0.24, 12);
  addBox(group, 0.12, 0.07, 0.005, MAT.screen, 0, 0.38, 0.201);      // display
  return group;
}

/** Microwave. y = 0 is the counter top. */
export function createMicrowave() {
  const group = new THREE.Group();
  addBox(group, 0.5, 0.3, 0.38, MAT.plasticWhite, 0, 0.15, 0);
  addBox(group, 0.32, 0.2, 0.005, MAT.blackMetal, -0.06, 0.15, 0.192);
  return group;
}

export function createVendingMachine() {
  const group = new THREE.Group();
  addBox(group, 1.0, 1.9, 0.8, MAT.brandDark, 0, 0.95, 0);
  addPlane(group, 0.62, 1.3, pictureMaterial(vendingTexture()), -0.12, 1.15, 0.401);
  addBox(group, 0.2, 0.5, 0.02, MAT.blackMetal, 0.36, 1.2, 0.41);    // keypad
  addBox(group, 0.62, 0.18, 0.02, MAT.blackMetal, -0.12, 0.3, 0.41); // pick-up slot
  return group;
}

/** Café chair, facing -z. */
export function createCafeChair(material = MAT.fabricBrand) {
  const group = new THREE.Group();
  addBox(group, 0.44, 0.05, 0.44, material, 0, 0.46, 0);
  addBox(group, 0.42, 0.36, 0.04, material, 0, 0.7, 0.2);
  [[-0.19, -0.19], [0.19, -0.19], [-0.19, 0.19], [0.19, 0.19]].forEach(([x, z]) => {
    addCylinder(group, 0.015, 0.015, 0.44, MAT.blackMetal, x, 0.22, z, 6);
  });
  return group;
}

/** Round table with 4 café chairs around it. */
export function createRoundTableSet(chairMaterial = MAT.fabricBrand) {
  const group = new THREE.Group();
  addCylinder(group, 0.5, 0.5, 0.04, MAT.plasticWhite, 0, 0.74, 0, 28);
  addCylinder(group, 0.04, 0.04, 0.7, MAT.blackMetal, 0, 0.37, 0, 8);
  addCylinder(group, 0.25, 0.28, 0.03, MAT.blackMetal, 0, 0.015, 0, 20);
  for (let i = 0; i < 4; i++) {
    const angle = (i * Math.PI) / 2 + Math.PI / 4;
    const chair = createCafeChair(chairMaterial);
    chair.position.set(Math.sin(angle) * 0.72, 0, Math.cos(angle) * 0.72);
    chair.rotation.y = angle; // seat faces the table
    group.add(chair);
  }
  return group;
}

/* ================================================================
   Plants and outdoor items
   ================================================================ */

export function createPlant(height = 1.3) {
  const group = new THREE.Group();
  addCylinder(group, 0.22, 0.17, 0.45, MAT.pot, 0, 0.225, 0, 16);
  addCylinder(group, 0.2, 0.2, 0.02, MAT.soil, 0, 0.44, 0, 16);
  addCylinder(group, 0.025, 0.03, height * 0.5, MAT.trunk, 0, 0.45 + height * 0.25, 0, 6);
  addBlob(group, 0.34, MAT.leaf, 0, height * 0.72, 0);
  addBlob(group, 0.26, MAT.leafDark, 0.16, height * 0.86, 0.08);
  addBlob(group, 0.28, MAT.leaf, -0.14, height * 0.9, -0.1);
  addBlob(group, 0.2, MAT.leafDark, 0.02, height * 1.02, 0);
  return group;
}

export function createTree(height = 5) {
  const group = new THREE.Group();
  addCylinder(group, 0.12, 0.18, height * 0.5, MAT.trunk, 0, height * 0.25, 0, 8);
  addBlob(group, height * 0.28, MAT.leaf, 0, height * 0.62, 0);
  addBlob(group, height * 0.22, MAT.leafDark, height * 0.12, height * 0.75, height * 0.05);
  addBlob(group, height * 0.2, MAT.leaf, -height * 0.1, height * 0.8, -height * 0.06);
  return group;
}

export function createPlanter(width = 1.0) {
  const group = new THREE.Group();
  addBox(group, width, 0.6, width, MAT.concrete, 0, 0.3, 0);
  addBlob(group, width * 0.45, MAT.hedge, 0, 0.75, 0);
  addBlob(group, width * 0.3, MAT.leafDark, width * 0.2, 0.95, 0.1);
  return group;
}

export function createLampPost() {
  const group = new THREE.Group();
  addCylinder(group, 0.05, 0.07, 3.2, MAT.blackMetal, 0, 1.6, 0, 8);
  addBox(group, 0.35, 0.12, 0.35, MAT.blackMetal, 0, 3.26, 0);
  addBox(group, 0.28, 0.04, 0.28, MAT.lightPanel, 0, 3.19, 0);
  return group;
}

/** Visitor information stand with a tilted board. */
export function createInfoKiosk() {
  const group = new THREE.Group();
  addBox(group, 0.5, 0.05, 0.4, MAT.blackMetal, 0, 0.025, 0);
  addBox(group, 0.1, 1.1, 0.1, MAT.blackMetal, 0, 0.6, 0);
  const board = new THREE.Group();
  board.position.set(0, 1.3, 0);
  board.rotation.x = -0.35; // tilt back so it can be read from the front
  group.add(board);
  addBox(board, 0.8, 0.55, 0.05, MAT.blackMetal);
  const sign = createSign('VISITOR INFO\nPlease register at reception', 0.74, 0.49);
  sign.position.z = 0.026;
  board.add(sign);
  return group;
}

/* ================================================================
   Animated items — marked userData.dynamic so they are never merged
   ================================================================ */

/**
 * Two sliding glass door leaves. Call setOpen(0…1) to slide them
 * (0 = closed, 1 = open). addProximityDoors() in building.js animates this by distance.
 */
export function createSlidingDoorPair(leafWidth, height, glassMaterial = MAT.glass) {
  const group = new THREE.Group();
  group.userData.dynamic = true;

  const makeLeaf = (handleSide) => {
    const leaf = new THREE.Group();
    const pane = addBox(leaf, leafWidth, height, 0.03, glassMaterial, 0, height / 2, 0);
    pane.castShadow = false;
    addBox(leaf, leafWidth, 0.06, 0.05, MAT.frame, 0, 0.03, 0);              // bottom rail
    addBox(leaf, leafWidth, 0.06, 0.05, MAT.frame, 0, height - 0.03, 0);     // top rail
    addBox(leaf, 0.05, height, 0.05, MAT.frame, -leafWidth / 2 + 0.025, height / 2, 0);
    addBox(leaf, 0.05, height, 0.05, MAT.frame, leafWidth / 2 - 0.025, height / 2, 0);
    addBox(leaf, 0.03, 0.7, 0.08, MAT.metal, handleSide * (leafWidth / 2 - 0.12), 1.05, 0); // handle
    group.add(leaf);
    return leaf;
  };
  const left = makeLeaf(1);
  const right = makeLeaf(-1);

  const setOpen = (amount) => {
    const slide = amount * leafWidth * 0.95;
    left.position.x = -leafWidth / 2 - slide;
    right.position.x = leafWidth / 2 + slide;
  };
  setOpen(0);
  return { group, setOpen };
}

/** Wall-mounted fingerprint scanner. setGranted(true) turns its screen green. */
export function createBiometricScanner() {
  const group = new THREE.Group();
  group.userData.dynamic = true;
  addBox(group, 0.2, 0.3, 0.05, MAT.blackMetal);

  const readyTexture = scannerScreenTexture(false);
  const grantedTexture = scannerScreenTexture(true);
  const screenMaterial = pictureMaterial(readyTexture);
  addPlane(group, 0.16, 0.1, screenMaterial, 0, 0.07, 0.026);

  const padMaterial = new THREE.MeshBasicMaterial({ color: '#39a0ff' });
  addBox(group, 0.07, 0.07, 0.01, padMaterial, 0, -0.07, 0.03); // finger pad

  return {
    group,
    setGranted(granted) {
      screenMaterial.map = granted ? grantedTexture : readyTexture;
      padMaterial.color.set(granted ? '#3ddc84' : '#39a0ff');
    },
  };
}
