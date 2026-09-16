/**
 * materials.js
 * ---------------------------------------------------------------
 * All colours, textures and materials used by the 3D office.
 *
 * Textures are DRAWN IN CODE on an HTML <canvas>, so no image files
 * are needed for the 3D world. To re-colour something, change its hex
 * value in MAT (section 3). Brand colours (THEME) come from the
 * project's project-config.js → theme, so they change per project.
 * ---------------------------------------------------------------
 */
import * as THREE from 'three';
import { CONFIG } from '../config.js';

/* ================================================================
   1. TEXTURE HELPERS
   ================================================================ */

/**
 * Creates a texture by drawing on a canvas.
 * @param {number} width   canvas width in pixels
 * @param {number} height  canvas height in pixels
 * @param {(ctx: CanvasRenderingContext2D, w: number, h: number) => void} draw  drawing code
 * @param {boolean} repeat true = tile the texture (floors), false = stretch it once (signs, pictures)
 */
export function makeCanvasTexture(width, height, draw, repeat = true) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  draw(canvas.getContext('2d'), width, height);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  if (repeat) texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

/** Pseudo-random numbers that are the same on every page load (textures never change). */
function seededRandom(seed) {
  let s = seed;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

/** Fills the whole canvas with a colour plus fine grain (carpet, grass, stone). */
function fillNoise(ctx, w, h, [r, g, b], amount, seed) {
  const image = ctx.createImageData(w, h);
  const random = seededRandom(seed);
  for (let i = 0; i < image.data.length; i += 4) {
    const n = (random() - 0.5) * amount;
    image.data[i] = r + n;
    image.data[i + 1] = g + n;
    image.data[i + 2] = b + n;
    image.data[i + 3] = 255;
  }
  ctx.putImageData(image, 0, 0);
}

const FONT = '"Segoe UI", Roboto, Arial, sans-serif';
const HANDWRITING = '"Segoe Print", "Comic Sans MS", cursive';

/**
 * Text on a coloured background — used for 3D signs, name plates and screens.
 * Use "\n" for a second line; the first line is drawn larger.
 * Pass `background: null` for a transparent background.
 */
export function makeTextTexture(text, {
  width = 1024, height = 256, background = CONFIG.theme.secondary, color = '#ffffff', fontWeight = '700',
} = {}) {
  const lines = String(text).split('\n');
  return makeCanvasTexture(width, height, (ctx, w, h) => {
    if (background) {
      ctx.fillStyle = background;
      ctx.fillRect(0, 0, w, h);
    }
    ctx.fillStyle = color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Share the height between the lines: 60% for the first line when there are several
    const heights = lines.length === 1
      ? [h]
      : [h * 0.6, ...lines.slice(1).map(() => (h * 0.4) / (lines.length - 1))];

    let y = 0;
    lines.forEach((line, i) => {
      const weight = i === 0 ? fontWeight : '400';
      let size = heights[i] * (i === 0 ? 0.62 : 0.55);
      ctx.font = `${weight} ${size}px ${FONT}`;
      const measured = ctx.measureText(line).width;  // shrink long lines so they fit
      if (measured > w * 0.9) {
        size *= (w * 0.9) / measured;
        ctx.font = `${weight} ${size}px ${FONT}`;
      }
      ctx.fillText(line, w / 2, y + heights[i] / 2);
      y += heights[i];
    });
  }, false);
}

/* ================================================================
   2. FLOOR TEXTURES  (one texture tile = 2 m × 2 m, see addFloor in building.js)
   ================================================================ */
const TEX = {
  // Light marble tiles (lobby) — 2 × 2 tiles of 1 m
  marble: makeCanvasTexture(512, 512, (ctx, w, h) => {
    ctx.fillStyle = '#ebe7df';
    ctx.fillRect(0, 0, w, h);
    const random = seededRandom(7);
    ctx.strokeStyle = 'rgba(140, 132, 120, 0.16)';
    ctx.lineWidth = 2;
    for (let i = 0; i < 16; i++) {               // soft veins
      let x = random() * w;
      let y = random() * h;
      ctx.beginPath();
      ctx.moveTo(x, y);
      for (let j = 0; j < 6; j++) {
        x += (random() - 0.5) * 120;
        y += (random() - 0.3) * 80;
        ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    ctx.fillStyle = '#cbc5ba';                   // grout lines
    for (let i = 0; i < 2; i++) {
      ctx.fillRect((i * w) / 2, 0, 3, h);
      ctx.fillRect(0, (i * h) / 2, w, 3);
    }
  }),

  carpet: makeCanvasTexture(256, 256, (ctx, w, h) => fillNoise(ctx, w, h, [92, 104, 118], 26, 3)),
  carpetDark: makeCanvasTexture(256, 256, (ctx, w, h) => fillNoise(ctx, w, h, [62, 68, 80], 22, 5)),

  // Wooden planks (corridor and cabins) — 10 rows of 20 cm
  wood: makeCanvasTexture(512, 512, (ctx, w, h) => {
    const random = seededRandom(11);
    const plankHeight = h / 10;
    for (let row = 0; row < 10; row++) {
      let x = -random() * w * 0.5;
      while (x < w) {
        const length = w * (0.35 + random() * 0.4);
        const tone = 150 + random() * 40;
        ctx.fillStyle = `rgb(${tone + 30}, ${tone - 10}, ${tone - 60})`;
        ctx.fillRect(x, row * plankHeight, length, plankHeight);
        ctx.strokeStyle = 'rgba(80, 50, 25, 0.18)'; // grain
        ctx.lineWidth = 1;
        for (let g = 0; g < 5; g++) {
          const gy = row * plankHeight + random() * plankHeight;
          ctx.beginPath();
          ctx.moveTo(x, gy);
          ctx.lineTo(x + length, gy + (random() - 0.5) * 6);
          ctx.stroke();
        }
        ctx.fillStyle = 'rgba(60, 35, 15, 0.5)';     // plank end joint
        ctx.fillRect(x, row * plankHeight, 2, plankHeight);
        x += length;
      }
      ctx.fillStyle = 'rgba(60, 35, 15, 0.45)';
      ctx.fillRect(0, row * plankHeight, w, 2);
    }
  }),

  // Warm checker tiles (pantry) — 4 × 4 tiles of 50 cm
  checker: makeCanvasTexture(256, 256, (ctx, w, h) => {
    for (let i = 0; i < 4; i++) {
      for (let j = 0; j < 4; j++) {
        ctx.fillStyle = (i + j) % 2 ? '#d6c7ad' : '#f1ece2';
        ctx.fillRect((i * w) / 4, (j * h) / 4, w / 4, h / 4);
      }
    }
  }),

  // Grey paving stones (outside)
  pavers: makeCanvasTexture(256, 256, (ctx, w, h) => {
    fillNoise(ctx, w, h, [178, 176, 170], 18, 13);
    ctx.fillStyle = 'rgba(90, 88, 84, 0.55)';
    for (let row = 0; row < 4; row++) {
      ctx.fillRect(0, (row * h) / 4, w, 2);
      const offset = row % 2 ? w / 4 : 0;
      for (let c = 0; c < 3; c++) ctx.fillRect(offset + (c * w) / 2, (row * h) / 4, 2, h / 4);
    }
  }),

  grass: makeCanvasTexture(256, 256, (ctx, w, h) => fillNoise(ctx, w, h, [104, 146, 76], 40, 17)),
};

/* ================================================================
   3. MATERIALS — change colours here
   ================================================================ */

/** Standard lit material. roughness 0 = mirror-like … 1 = matte. metalness 0 … 1. */
function std(color, roughness = 0.8, metalness = 0, extra = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness, ...extra });
}

/** A lighter version of a colour (amount 0 … 1 towards white). */
const lighten = (color, amount) => `#${new THREE.Color(color).lerp(new THREE.Color('#ffffff'), amount).getHexString()}`;

// Brand colours come from the project's project-config.js → theme. Everything else here is neutral.
const THEME = CONFIG.theme;

export const MAT = {
  // ---- Floors ----
  floorMarble: std('#ffffff', 0.35, 0, { map: TEX.marble }),
  floorCarpet: std('#ffffff', 0.95, 0, { map: TEX.carpet }),
  floorCarpetDark: std('#ffffff', 0.95, 0, { map: TEX.carpetDark }),
  floorWood: std('#ffffff', 0.6, 0, { map: TEX.wood }),
  floorPantry: std('#ffffff', 0.4, 0, { map: TEX.checker }),
  pavers: std('#ffffff', 0.9, 0, { map: TEX.pavers }),
  grass: std('#ffffff', 1, 0, { map: TEX.grass }),
  rug: std('#b86b4b', 1),
  doormat: std('#2c2f33', 1),

  // ---- Building ----
  wall: std('#f4f2ee', 0.92),
  accentWall: std(THEME.secondary, 0.7),   // brand: feature walls
  ceiling: std('#fbfbf9', 0.95),
  frame: std('#2b2f36', 0.45, 0.6), // window and door frames
  glass: std('#d6eef7', 0.05, 0.1, { transparent: true, opacity: 0.22, depthWrite: false, side: THREE.DoubleSide }),
  frostedGlass: std('#eef4f6', 0.3, 0, { transparent: true, opacity: 0.8, side: THREE.DoubleSide }),
  lightPanel: new THREE.MeshBasicMaterial({ color: '#fffdf2' }),
  concrete: std('#bdb9b1', 0.95),
  hedge: std('#3f7a3a', 1, 0, { flatShading: true }),

  // ---- Furniture ----
  deskTop: std('#efe9df', 0.6),
  deskLeg: std('#cfcac1', 0.5, 0.3),
  woodDark: std('#6b4a32', 0.55),
  woodLight: std('#c49a6c', 0.6),
  metal: std('#aab2ba', 0.35, 0.8),
  blackMetal: std('#26282c', 0.45, 0.5),
  steel: std('#c9ced3', 0.25, 0.9),
  gold: std('#d4a73a', 0.3, 0.9),
  plasticWhite: std('#eeeeec', 0.5),
  keyboard: std('#33363b', 0.6),
  screen: std('#0b1a2a', 0.2, 0, { emissive: '#2a6fb0', emissiveIntensity: 0.55 }),
  partition: std('#8593a1', 0.95),
  fabricBlue: std('#2f5d8a', 0.9),
  fabricGrey: std('#7a7f86', 0.9),
  fabricBrand: std(THEME.primaryDark, 0.9),  // brand-coloured chairs
  fabricGreen: std('#4f8a6b', 0.9),
  leather: std('#2a2522', 0.5),
  sofa: std('#56606b', 0.9),
  cushion: std('#8e98a3', 0.95),
  brandDark: std(THEME.secondary, 0.45),                        // brand: counters, machines
  accentGlow: new THREE.MeshBasicMaterial({ color: THEME.glow }), // brand: glowing strips
  cabinet: std('#3d4a5c', 0.55),
  cabinetUpper: std('#f1efea', 0.6),
  countertop: std('#dcd9d2', 0.3),
  backsplash: std('#d9e6ea', 0.3),
  mug: std('#ffffff', 0.4),

  // ---- Nature ----
  pot: std('#efece6', 0.6),
  soil: std('#4a3728', 1),
  leaf: std('#3f8a4a', 0.8, 0, { flatShading: true }),
  leafDark: std('#2f6e3a', 0.8, 0, { flatShading: true }),
  trunk: std('#6d4c35', 0.9),

  // Book spines for the bookshelves
  books: ['#8e2b2b', '#2b4f8e', '#d9a441', '#3b7a57', '#5b3f7a', '#e8e2d0'].map((c) => std(c, 0.8)),
};

/** Material that shows a picture and ignores lighting (screens, signs, posters). */
export function pictureMaterial(texture, extra = {}) {
  return new THREE.MeshBasicMaterial({ map: texture, toneMapped: false, ...extra });
}

/* ================================================================
   4. PICTURES for screens, boards and walls
   ================================================================ */

/** Sky gradient used as the scene background. */
export function skyTexture() {
  return makeCanvasTexture(4, 512, (ctx, w, h) => {
    const gradient = ctx.createLinearGradient(0, 0, 0, h);
    gradient.addColorStop(0, '#6fa8dc');
    gradient.addColorStop(0.55, '#bcd8ee');
    gradient.addColorStop(1, '#eef3f2');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);
  }, false);
}

/** Presentation slide (lobby TV). */
export function slideTexture(title, subtitle) {
  return makeCanvasTexture(1024, 576, (ctx, w, h) => {
    const gradient = ctx.createLinearGradient(0, 0, w, h);
    gradient.addColorStop(0, CONFIG.theme.secondary);
    gradient.addColorStop(1, lighten(CONFIG.theme.secondary, 0.15));
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);
    ctx.globalAlpha = 0.12;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(w - 140, 120, 220, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.fillStyle = CONFIG.theme.primary;
    ctx.fillRect(80, 210, 120, 10);
    ctx.fillStyle = '#ffffff';
    ctx.font = `700 72px ${FONT}`;
    ctx.fillText(title, 80, 320, w - 160);
    ctx.fillStyle = '#cfe0f0';
    ctx.font = `400 38px ${FONT}`;
    ctx.fillText(subtitle, 80, 390, w - 160);
  }, false);
}

/** Video call with four participants (meeting-room screen). */
export function videoCallTexture() {
  return makeCanvasTexture(1024, 576, (ctx, w, h) => {
    ctx.fillStyle = '#101820';
    ctx.fillRect(0, 0, w, h);
    const colours = ['#3b6e99', '#8a5a9e', '#4f8a6b', '#b0703a'];
    colours.forEach((colour, i) => {
      const tileW = w / 2 - 16;
      const tileH = h / 2 - 16;
      const x = (i % 2) * (w / 2) + 8;
      const y = Math.floor(i / 2) * (h / 2) + 8;
      ctx.fillStyle = colour;
      ctx.fillRect(x, y, tileW, tileH);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
      ctx.beginPath();                                                        // head
      ctx.arc(x + tileW / 2, y + tileH * 0.42, tileH * 0.16, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();                                                        // shoulders
      ctx.ellipse(x + tileW / 2, y + tileH * 0.98, tileH * 0.3, tileH * 0.3, 0, Math.PI, 0);
      ctx.fill();
    });
  }, false);
}

/** Whiteboard with some hand-drawn notes. */
export function whiteboardTexture() {
  return makeCanvasTexture(1024, 512, (ctx, w, h) => {
    ctx.fillStyle = '#fbfbfb';
    ctx.fillRect(0, 0, w, h);
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    ctx.fillStyle = '#1f5fbf';
    ctx.font = `700 56px ${HANDWRITING}`;
    ctx.fillText('Q3 Roadmap', 60, 100);
    ctx.font = `400 40px ${HANDWRITING}`;
    [['Plan', '#1f5fbf'], ['Build', '#d0392b'], ['Launch', '#2e8b57']].forEach(([label, colour], i) => {
      const x = 60 + i * 300;
      ctx.strokeStyle = colour;
      ctx.fillStyle = colour;
      ctx.strokeRect(x, 160, 240, 120);
      ctx.fillText(label, x + 55, 235);
      if (i < 2) {                                                            // arrow to the next box
        ctx.beginPath();
        ctx.moveTo(x + 250, 220);
        ctx.lineTo(x + 290, 220);
        ctx.moveTo(x + 278, 208);
        ctx.lineTo(x + 290, 220);
        ctx.lineTo(x + 278, 232);
        ctx.stroke();
      }
    });
    ctx.fillStyle = '#444444';
    ctx.font = `400 34px ${HANDWRITING}`;
    ['• hire 2 designers', '• ship mobile app v2', '• customer survey'].forEach((t, i) => ctx.fillText(t, 70, 360 + i * 48));
  }, false);
}

/** Chalkboard menu (pantry). */
export function menuBoardTexture() {
  return makeCanvasTexture(768, 512, (ctx, w, h) => {
    ctx.fillStyle = '#23302a';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#f5f1e6';
    ctx.lineWidth = 3;
    ctx.setLineDash([10, 10]);
    ctx.strokeRect(20, 20, w - 40, h - 40);
    ctx.fillStyle = '#f5f1e6';
    ctx.textAlign = 'center';
    ctx.font = `700 64px ${HANDWRITING}`;
    ctx.fillText("TODAY'S MENU", w / 2, 100);
    ctx.font = `400 38px ${HANDWRITING}`;
    ['Veg Biryani', 'Grilled Paneer Wrap', 'Garden Salad', 'Fresh Fruit & Juice'].forEach((t, i) => ctx.fillText(t, w / 2, 190 + i * 72));
  }, false);
}

/** Front window of the vending machine. */
export function vendingTexture() {
  return makeCanvasTexture(256, 512, (ctx, w, h) => {
    ctx.fillStyle = '#0f1a24';
    ctx.fillRect(0, 0, w, h);
    const random = seededRandom(23);
    const colours = ['#e84a4a', '#f2b134', '#3fa7d6', '#59c36a', '#f07ad1', '#ffffff'];
    for (let row = 0; row < 6; row++) {
      for (let col = 0; col < 4; col++) {
        ctx.fillStyle = colours[Math.floor(random() * colours.length)];
        ctx.fillRect(18 + col * 56, 24 + row * 76, 40, 52);
      }
      ctx.fillStyle = '#5b6b7a';
      ctx.fillRect(10, 80 + row * 76, w - 20, 6);
    }
  }, false);
}

/** Abstract wall art — `seed` picks the colours and shapes. */
export function artTexture(seed) {
  return makeCanvasTexture(512, 384, (ctx, w, h) => {
    const random = seededRandom(seed * 101);
    const palettes = [
      ['#f4e9d8', '#e07a5f', '#3d405b', '#81b29a', '#f2cc8f'],
      ['#eef2f3', '#264653', '#2a9d8f', '#e9c46a', '#f4a261'],
      ['#f7f1ea', '#8e7dbe', '#f28482', '#84a59d', '#f6bd60'],
    ];
    const palette = palettes[seed % palettes.length];
    ctx.fillStyle = palette[0];
    ctx.fillRect(0, 0, w, h);
    ctx.globalAlpha = 0.85;
    for (let i = 0; i < 7; i++) {
      ctx.fillStyle = palette[1 + (i % 4)];
      if (random() > 0.5) {
        ctx.beginPath();
        ctx.arc(random() * w, random() * h, 30 + random() * 110, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillRect(random() * w * 0.8, random() * h * 0.8, 40 + random() * 180, 40 + random() * 140);
      }
    }
    ctx.globalAlpha = 1;
  }, false);
}

/** Cork board with sticky notes (workspace). */
export function noticeBoardTexture() {
  return makeCanvasTexture(512, 384, (ctx, w, h) => {
    fillNoise(ctx, w, h, [190, 150, 105], 40, 29);
    const random = seededRandom(31);
    const colours = ['#fff27a', '#ffb3c7', '#9fe3ff', '#b8f28c', '#ffffff'];
    for (let i = 0; i < 9; i++) {
      const x = 20 + (i % 3) * 160 + random() * 20;
      const y = 20 + Math.floor(i / 3) * 120 + random() * 15;
      ctx.save();
      ctx.translate(x + 60, y + 45);
      ctx.rotate((random() - 0.5) * 0.2);
      ctx.fillStyle = colours[i % colours.length];
      ctx.fillRect(-60, -45, 120, 90);
      ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
      for (let line = 0; line < 3; line++) ctx.fillRect(-45, -25 + line * 20, 60 + random() * 30, 4);
      ctx.fillStyle = '#dd3333';
      ctx.beginPath();
      ctx.arc(0, -38, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }, false);
}

/** View through a (fake) window: sky, distant buildings, trees. */
export function windowViewTexture() {
  return makeCanvasTexture(1024, 256, (ctx, w, h) => {
    const gradient = ctx.createLinearGradient(0, 0, 0, h);
    gradient.addColorStop(0, '#8fc1e8');
    gradient.addColorStop(1, '#e3eef5');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);
    const random = seededRandom(41);
    ctx.fillStyle = '#b7c6d3';
    for (let x = 0; x < w; x += 40 + random() * 40) {
      const buildingHeight = 40 + random() * 110;
      ctx.fillRect(x, h - buildingHeight - 40, 30 + random() * 40, buildingHeight);
    }
    ctx.fillStyle = '#7fa66a';
    ctx.fillRect(0, h - 40, w, 40);
  }, false);
}

/** Small screen on the biometric scanner. */
export function scannerScreenTexture(granted) {
  return makeTextTexture(granted ? 'ACCESS\nGRANTED' : 'PLACE\nFINGER', {
    width: 256, height: 160, background: granted ? '#1f8f4e' : CONFIG.theme.secondary,
  });
}
