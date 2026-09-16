/**
 * hotspots.js
 * ---------------------------------------------------------------
 * The clickable markers ("i", "▶", "♪") floating in the scene.
 *
 *   - Every marker is always visible as a plain icon.
 *   - A marker GLOWS (pulsing ring) when you are within
 *     CONFIG.hotspots.glowDistance of it, or while you stand at the
 *     tour stop it belongs to.
 *   - Markers behind a solid wall are hidden and can't be clicked.
 *
 *   build(stops)                  creates one marker per hotspot in tour-data.js
 *   setActiveStop(index)          the stop you are standing at (its markers glow), or null
 *   pick(x, y)                    returns the hotspot data under the mouse, or null
 *   update(time, cameraPosition)  glow animation — call every frame
 *
 * Hovering a marker shows its `label` in a tooltip.
 * ---------------------------------------------------------------
 */
import * as THREE from 'three';
import { CONFIG } from '../config.js';

/* ---------- Marker textures (drawn on a canvas, cached) ---------- */
const textureCache = new Map();

function canvasTexture(key, draw) {
  if (!textureCache.has(key)) {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 128;
    draw(canvas.getContext('2d'));
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    textureCache.set(key, texture);
  }
  return textureCache.get(key);
}

/** Round badge (CONFIG.hotspots.color) with a white symbol. */
function iconTexture(glyph) {
  return canvasTexture(`icon:${glyph}`, (ctx) => {
    ctx.beginPath();
    ctx.arc(64, 64, 52, 0, Math.PI * 2);
    ctx.fillStyle = CONFIG.hotspots.color;
    ctx.fill();
    ctx.lineWidth = 8;
    ctx.strokeStyle = '#ffffff';
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = glyph === 'i' ? 'bold 66px Georgia, serif' : 'bold 50px "Segoe UI Symbol", Arial, sans-serif';
    ctx.fillText(glyph, glyph === '▶' ? 68 : 64, 68);
  });
}

/** Expanding ring drawn around a glowing badge. */
function ringTexture() {
  return canvasTexture('ring', (ctx) => {
    ctx.beginPath();
    ctx.arc(64, 64, 56, 0, Math.PI * 2);
    ctx.lineWidth = 6;
    ctx.strokeStyle = CONFIG.hotspots.color;
    ctx.stroke();
  });
}

/** Chooses the symbol from the popup content: ▶ video, ♪ audio only, i otherwise. */
function iconFor(hotspot) {
  if (hotspot.icon) return hotspot.icon;
  const popup = hotspot.popup || {};
  if (popup.video) return '▶';
  if (popup.audio && !popup.text && !popup.image) return '♪';
  return 'i';
}

/** Does the straight line from (x1, z1) to (x2, z2) pass through rectangle r? (floor-plan test) */
function lineCrossesRect(x1, z1, x2, z2, r) {
  let tMin = 0;
  let tMax = 1;
  for (const [start, delta, min, max] of [[x1, x2 - x1, r.minX, r.maxX], [z1, z2 - z1, r.minZ, r.maxZ]]) {
    if (Math.abs(delta) < 1e-9) {
      if (start < min || start > max) return false;
      continue;
    }
    let t1 = (min - start) / delta;
    let t2 = (max - start) / delta;
    if (t1 > t2) [t1, t2] = [t2, t1];
    tMin = Math.max(tMin, t1);
    tMax = Math.min(tMax, t2);
    if (tMin > tMax) return false;
  }
  return true;
}

/* ---------- Manager ---------- */
export class HotspotManager {
  /**
   * @param colliders  floor-plan rectangles from the environment (kit/building.js); kind 'wall' hides markers behind it
   */
  constructor(scene, camera, canvas, tooltip, colliders = []) {
    this.camera = camera;
    this.canvas = canvas;
    this.tooltip = tooltip;
    this.walls = colliders.filter((c) => c.kind === 'wall');
    this.group = new THREE.Group();
    this.group.name = 'hotspots';
    scene.add(this.group);

    this.items = [];        // { root, core, ring, data, stopIndex, phase }
    this.activeStop = null; // markers of this stop always glow
    this.onlyActiveStop = false; // true = only the active stop's markers are shown (360° photo tours)
    this.hovered = null;
    this.enabled = true;    // false while a popup is open
    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();

    canvas.addEventListener('pointermove', (event) => this.onPointerMove(event));
    canvas.addEventListener('pointerleave', () => this.setHovered(null));
  }

  build(stops) {
    stops.forEach((stop, stopIndex) => {
      (stop.hotspots || []).forEach((data, i) => {
        const root = new THREE.Group();
        root.position.set(...data.position);

        // depthTest: true → walls and furniture in front of a marker hide it
        const spriteOptions = { transparent: true, depthWrite: false };
        const ring = new THREE.Sprite(new THREE.SpriteMaterial({ map: ringTexture(), ...spriteOptions }));
        const core = new THREE.Sprite(new THREE.SpriteMaterial({ map: iconTexture(iconFor(data)), ...spriteOptions }));
        ring.renderOrder = 998;
        core.renderOrder = 999;
        core.scale.setScalar(CONFIG.hotspots.size);
        root.add(ring, core);
        this.group.add(root);

        const item = { root, core, ring, data, stopIndex, phase: i * 0.7 };
        core.userData.item = item;
        this.items.push(item);
      });
    });
  }

  /** The stop the camera is standing at (its markers glow even from far away), or null. */
  setActiveStop(index) {
    this.activeStop = index;
    this.setHovered(null);
  }

  /** Returns the hotspot data at screen position (x, y), or null. */
  pick(clientX, clientY) {
    const item = this.hitTest(clientX, clientY);
    return item ? item.data : null;
  }

  hitTest(clientX, clientY) {
    const rect = this.canvas.getBoundingClientRect();
    this.pointer.set(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1);
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const clickable = this.items.filter((item) => item.root.visible && item.core.material.opacity > 0.5); // hidden or faded-out markers can't be clicked
    const hits = this.raycaster.intersectObjects(clickable.map((item) => item.core), false);
    const hit = hits.find((h) => !this.isBehindWall(h.object.userData.item));
    return hit ? hit.object.userData.item : null;
  }

  /** True if a solid wall stands between the camera and the marker. */
  isBehindWall(item) {
    const from = this.camera.position;
    const to = item.root.position;
    return this.walls.some((wall) => lineCrossesRect(from.x, from.z, to.x, to.z, wall));
  }

  onPointerMove(event) {
    if (event.buttons !== 0 || !this.enabled) {  // dragging, or popup open
      this.setHovered(null);
      return;
    }
    this.setHovered(this.hitTest(event.clientX, event.clientY), event.clientX, event.clientY);
  }

  setHovered(item, x = 0, y = 0) {
    this.hovered = item;
    this.canvas.style.cursor = item ? 'pointer' : '';
    this.tooltip.classList.toggle('is-visible', Boolean(item));
    if (item) {
      this.tooltip.textContent = item.data.label || item.data.popup?.title || '';
      this.tooltip.style.left = `${x}px`;
      this.tooltip.style.top = `${y}px`;
    }
  }

  /** Glow animation. `time` = seconds since start, `cameraPosition` = where the visitor is. */
  update(time, cameraPosition) {
    const { size, glowDistance } = CONFIG.hotspots;
    this.items.forEach((item) => {
      const distance = item.root.position.distanceTo(cameraPosition);
      // Fade out when you are about to walk right through a marker, so it doesn't fill the screen
      const fade = THREE.MathUtils.smoothstep(distance, 0.8, 1.6);
      item.root.visible = fade > 0 && (!this.onlyActiveStop || item.stopIndex === this.activeStop);
      item.core.material.opacity = fade;

      const hoverScale = item === this.hovered ? 1.2 : 1;
      const glowing = fade > 0 && (item.stopIndex === this.activeStop || distance < glowDistance);
      item.ring.visible = glowing;

      if (!glowing) {                 // far away: just the plain icon
        item.core.scale.setScalar(size * hoverScale);
        return;
      }
      const t = time * 1.6 + item.phase;
      item.core.scale.setScalar(size * hoverScale * (1 + 0.06 * Math.sin(t * 2)));
      const wave = (t % 1.6) / 1.6;   // 0 → 1, repeating
      item.ring.scale.setScalar(size * (1 + wave * 1.1));
      item.ring.material.opacity = (1 - wave) * fade;
    });
  }
}
