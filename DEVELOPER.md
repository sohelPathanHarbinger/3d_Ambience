# Developer Guide

Everything you need to maintain and extend the 3D tour without help: where things are, every setting, and step-by-step recipes for common changes.

> **Rule of thumb:** change **projects** (`projects/<name>/`) for content and branding, and change **settings** in `engine/config.js` (or override them per project). You rarely need to touch the rest of `engine/`.

---

## 1. Run it

Browsers only load this page from a web server. Double-clicking `index.html` does **not** work.

| Option | How | Open |
|---|---|---|
| VS Code | "Live Server" extension → right-click `index.html` → **Open with Live Server** | http://127.0.0.1:5500/index.html |
| Python | `python -m http.server 8080` in the project folder | http://localhost:8080/index.html |

You need internet, because Three.js loads from a CDN (see [Offline](#12-troubleshooting)).

### Choose which project opens
- **Default:** `ACTIVE_PROJECT` at the top of **`engine/config.js`**:
  ```js
  export const ACTIVE_PROJECT = 'harbinger-office';   // folder name inside /projects
  ```
- **For one visit:** add `?project=starter` to the address.

### Address options (combine with `&`)
| Option | Effect |
|---|---|
| `?project=starter` | open another project |
| `?stop=5` | jump straight to stop 5 |
| `?stop=2&hotspot=reception-desk` | …and open that marker's popup |
| `?pick` | coordinate picker, for placing things (see §8) |

---

## 2. Folder map

```
index.html                 page shell (no project text in it)
css/style.css              all styles; brand colours come from the project's theme
engine/                    SHARED — the same for every project
  config.js                ★ ACTIVE_PROJECT + ALL default settings
  boot.js                  picks the project, applies branding, starts main.js
  main.js                  renderer, scene, camera, wires everything, animation loop
  core/tour.js             driving the camera between stops
  core/look-controls.js    looking around: drag + mouse-follow
  core/walk-controls.js    keyboard walking + collision
  core/hotspots.js         markers: glow, hover, click, hidden behind walls
  ui/hud.js                start screen, bottom panel, buttons, help texts
  ui/popup.js              info popup (text / image / audio / video)
  ui/branding.js           project name, colours, logo, favicon on the page
  ui/picker.js             coordinate picker (?pick)
  environments/load.js     detects the environment type (code / model / 360°)
  environments/model.js    loads .glb/.gltf models
  environments/panorama.js 360° photos
  kit/building.js          walls, floors, doors, windows, lights, place(), collision
  kit/furniture.js         ready-made objects (createDesk… createPlant… createSign…)
  kit/materials.js         colours (MAT.xxx) and canvas-drawn textures
projects/<name>/           ONE FOLDER PER PROJECT
  project-config.js        ★ name, texts, logo, colours, environment type, setting overrides
  tour-data.js             ★ stops, markers, popup content
  environment.js           the 3D world in code (only for code-built environments)
  assets/                  images, audio, video, models, 360° photos
```

★ = the files you edit most.

---

## 3. Settings reference (`engine/config.js`)

These are the defaults for **every** project. To change one for a single project, override it in that project's `project-config.js` under `settings` (§4). Don't edit the defaults for one project.

### camera
| Setting | Default | Meaning |
|---|---|---|
| `fov` | `65` | field of view in degrees (wider = see more) |
| `eyeHeight` | `1.65` | eye height in metres (`EYE` in tour-data) |
| `introPosition` / `introLookAt` | `null` | start-screen view; `null` = automatic |

### tour
| Setting | Default | Meaning |
|---|---|---|
| `moveSpeed` | `2.8` | m/s while driving between stops |
| `minMoveTime` | `1.6` | minimum seconds for any drive |
| `autoPlayDelay` | `8` | seconds at each stop in Auto mode |

### look (mouse)
| Setting | Default | Meaning |
|---|---|---|
| `sensitivity` | `1` | mouse speed: 0.5 = slower, 2 = faster |
| `maxPitchDeg` | `55` | how far you can look up / down |
| `mouseFollow` | `'turn'` | `'turn'` = keep turning towards the mouse side · `'lean'` = lean a little towards the mouse · `'off'` = drag only |
| `followSpeed` | `60` | `'turn'`: degrees/second at the screen edge |
| `followAngle` | `25` | `'lean'`: degrees of lean at the edge |
| `followDeadZone` | `0.3` | middle part of the screen (0…1) that does nothing |
| `followVertical` | `true` | also look up/down with the mouse near the top/bottom |
| `drag` | `'auto'` | `'auto'` = mouse drag off while mouseFollow is on · `true` · `false` (touch can always drag) |
| `invertDrag` | `false` | `true` = dragging pulls the view the other way |

### walk (keyboard)
| Setting | Default | Meaning |
|---|---|---|
| `speed` | `2.2` | m/s |
| `bodyRadius` | `0.3` | how close you can get to walls |
| `keys` | arrows + W A S D | `{ forward, back, left, right }` lists of key codes (`'KeyW'`, `'ArrowUp'`…) |

The on-screen help updates itself from these settings.

### hotspots (markers)
| Setting | Default | Meaning |
|---|---|---|
| `size` | `0.38` | marker size in metres |
| `color` | `null` | `null` = the project's `theme.primary` |
| `glowDistance` | `4` | glows when closer than this (metres) |

### graphics
| Setting | Default | Meaning |
|---|---|---|
| `shadows` | `true` | set `false` on slow machines (biggest speed-up) |
| `maxPixelRatio` | `2` | `1` = faster, a bit blurrier |
| `showCeiling` | `true` | code environments build a roof/ceiling |
| `mergeStaticMeshes` | `true` | performance; turn off only when debugging |

---

## 4. Project config (`projects/<name>/project-config.js`)

```js
export default {
  title: 'Bank · 3D Tour',                 // browser tab
  companyName: 'My Bank',
  companyTagline: 'Banking made simple',
  logoMark: 'assets/images/logo-mark.svg', // small logo, top-left badge (optional)
  favicon: '🏦',                           // emoji or image path

  intro: { kicker: 'Virtual tour', title: 'Welcome', text: 'Start-screen paragraph…' },

  theme: {                                 // UI + 3D signs, feature walls, counters, markers
    primary: '#e23744', primaryDark: '#c4283a', primaryLight: '#ff6b78',
    secondary: '#1e2a4b', glow: '#ff3b4e', panel: 'rgba(20, 29, 54, 0.82)',
  },

  environment: 'assets/models/bank.glb',   // optional — see §7. Leave out for environment.js

  settings: {                              // override any engine setting from §3
    look: { mouseFollow: 'off' },
    graphics: { shadows: false },
    camera: { introPosition: [0, 7, 42], introLookAt: [0, 2, 8] },
  },

  // Anything else is project-only data, e.g. names used on 3D signs:
  cabins: [{ title: 'CEO', name: 'Jane Doe' }],
};
```

Your own `environment.js` and `tour-data.js` read it with `import PROJECT from './project-config.js'`.

---

## 5. Tour content (`projects/<name>/tour-data.js`)

```js
export const TOUR_STOPS = [
  {
    id: 'reception',                          // unique
    name: 'Reception & Lobby',                // bottom panel title
    description: 'Short sentence.',
    camera: { position: [2.5, EYE, 6.4], lookAt: [-4.5, 1.3, 2.5] },
    via: [[0, EYE, 9.8]],                     // optional: pass through doorways on the way here
    panorama: 'assets/360/lobby.jpg',         // 360° projects only
    hotspots: [
      {
        id: 'reception-desk', label: 'Reception desk',   // label = hover tooltip
        position: [-5, 1.6, 3.9],
        icon: 'i',                                        // optional; auto: ▶ video, ♪ audio only
        popup: {
          title: 'Reception Desk',                        // only required field
          subtitle: 'Staffed 8:30 – 18:30',
          text: ['Paragraph 1', 'Paragraph <b>2</b>'],
          image: 'assets/images/desk.jpg', imageCaption: '…', layout: 'side',
          audio: 'assets/audio/welcome.mp3', audioLabel: '🔊 Listen', audioAutoplay: false,
          video: 'https://www.youtube.com/watch?v=XXXXXXXXXXX',  // or 'assets/video/x.mp4'
        },
      },
    ],
  },
];
```

- Stops play in list order.
- **Media paths are relative to the project folder** (`assets/...`). Full URLs work too.
- Popup order: header, video, image/text, audio.

---

## 6. Recipes (common changes)

| I want to… | Do this |
|---|---|
| Show a different project | `ACTIVE_PROJECT` in `engine/config.js` |
| Change name, tagline, logo, colours, start text | the project's `project-config.js` |
| Change a popup's text/image/audio/video | the hotspot's `popup` in `tour-data.js` |
| Move a marker | open `?pick`, click the new spot, paste the `position:` line |
| Add a marker | copy a hotspot block in `tour-data.js`, give it a new `id`, set `position` with `?pick` |
| Add or move a stop | copy a stop block, set `camera:` with `?pick` (stand where you want, copy "Stop camera") |
| Stop the camera driving through a wall | add `via: [[x, EYE, z]]` points through the doorway (get them with `?pick`) |
| Replace audio | save over the file with the same name, or change the `audio:` path |
| Change walking keys | `walk.keys` (all projects) or `settings.walk.keys` (one project) |
| Mouse too fast / too eager | `look.sensitivity`, `followDeadZone` (bigger = calmer), `followSpeed` |
| Classic drag-to-look only | `look.mouseFollow: 'off'` |
| Faster on old laptops | `graphics.shadows: false`, `maxPixelRatio: 1` |
| Add furniture (code environments) | `place(g, F.createPlant(), x, z, FACE.left)` in `environment.js`; get `x, z` with `?pick` |
| Make a new kind of object | copy a `createXxx()` in `engine/kit/furniture.js` into `projects/<name>/props.js` and change the boxes |
| Recolour a material everywhere | `MAT` in `engine/kit/materials.js` (brand colours come from `theme`) |
| Start a new project | copy `projects/starter` → `projects/new-name`, set `ACTIVE_PROJECT = 'new-name'` |

---

## 7. Environment types (detected automatically)

| `environment` in project-config.js | Type | Needs |
|---|---|---|
| *(none)* | **Code** | `environment.js` using the kit |
| `'assets/models/x.glb'` / `.gltf` | **3D model** | the model file |
| `'assets/360/x.jpg'` / `.png` / `.webp` | **360° photos** | 2:1 panorama photos |

Options go in an object, for example `environment: { file: 'assets/models/x.glb', scale: 0.01, rotationDeg: 90, position: [0, 0, 0], collision: true }`. Add `type: 'model'` or `type: 'panorama'` if the extension is unusual.

### Code environment (`environment.js`)
```js
export function buildEnvironment(scene) {
  const world = startWorld(scene, { wallHeight: 3.2 });
  addLights(scene, { center: [0, 0, -5], size: 20 });
  const g = world.group;
  addFloor(g, -6, -10, 6, 0, MAT.floorWood);                                   // corners (x1,z1)–(x2,z2)
  buildWall(g, { axis: 'x', at: 0, from: -6, to: 6, doors: [{ center: 0, width: 2 }] });
  buildWall(g, { axis: 'z', at: 3, from: -10, to: 0, glass: true });          // glass wall
  addProximityDoors(g, { x: 0, z: 0, leafWidth: 1, height: 2.4, triggerRadius: 4 });
  place(g, F.createSofa(2.2), -5, -3, FACE.right);                            // place(parent, obj, x, z, facing, y)
  return finishWorld({ bounds: { minX: -20, maxX: 20, minZ: -15, maxZ: 20 } });
}
```
- `FACE.entrance` (+z), `FACE.back` (−z), `FACE.left` (−x), `FACE.right` (+x) set which way an object's front points.
- Walls from `buildWall()` and objects placed with `place()` block walking automatically. For boxes added directly, call `blockWalking(mesh)`.

### 3D model (.glb / .gltf): step by step

You need **one `.glb` file** (recommended, everything in one file), or a `.gltf` file together with its `.bin` and texture files in the same folder.

#### Step 1 — Prepare and export the model
Export from Blender with **File → Export → glTF 2.0**. SketchUp, 3ds Max and Revit need a glTF exporter plugin.

| Rule | Why |
|---|---|
| Units in **metres**, **floor at height 0** where visitors walk | eye height (`EYE` = 1.65) and walking assume it; otherwise fix with `scale` / `position` (Step 3) |
| **Y is up** (glTF exporters do this automatically) | |
| Walls, doors and furniture are **separate objects** | walking collision uses each object's outline |
| **Split walls at doorways** (left piece, right piece, piece above) | one wall object with a hole has an outline that blocks the door |
| Name an invisible blocking box `…collider…` (for example `wall-collider`) | it blocks walking and is hidden |
| Name walk-through objects `…nocollide…` (rugs, low decor) | never block |
| Export **with materials and textures**, apply transforms | |
| **No Draco or meshopt compression** | the loader doesn't read these unless you make the code change below |
| Keep the file under about **50 MB** (textures 2048 px maximum) | loading time |
| Lighting: the engine adds sky and sun light; baked lighting in textures also works | |

#### Step 2 — Put the file in the project
```
projects/bank-branch/
  project-config.js
  tour-data.js
  assets/models/bank.glb      ← here (a .gltf goes here together with its .bin and textures)
```

#### Step 3 — Point the project at the model (`project-config.js`)
The simplest form, where the type is detected from `.glb`:
```js
export default {
  title: 'My Bank · 3D Tour',
  companyName: 'My Bank',
  // intro, theme, logoMark … as usual
  environment: 'assets/models/bank.glb',
};
```
With options:
```js
  environment: {
    file: 'assets/models/bank.glb',
    scale: 1,              // 0.01 = made in centimetres · 0.001 = millimetres · 0.3048 = feet
    position: [0, 0, 0],   // move the whole model, e.g. [0, -0.2, 0] if its floor is at 0.2 m
    rotationDeg: 0,        // turn it so the entrance faces +z (towards the start view)
    collision: true,       // false = visitors can walk through everything
  },
```

| Option | Default | Meaning |
|---|---|---|
| `file` | — | path inside the project folder (required) |
| `type` | from the extension | `'model'`, needed only for unusual extensions |
| `scale` | `1` | size multiplier |
| `position` | `[0, 0, 0]` | move the model in metres |
| `rotationDeg` | `0` | turn around the vertical axis |
| `collision` | `true` | automatic walking collision on or off |

#### Step 4 — Remove what only code environments need
- **Delete `environment.js`.** It isn't loaded when `environment` is set, so leaving it does no harm.
- **Start view:** remove `introPosition` / `introLookAt` from `settings.camera` for the automatic view (looking at the model from the +z side), or set your own.
- **Not applied to models:** `graphics.showCeiling`, the kit, and the `MAT` colours only affect code environments.

#### Step 5 — Build the tour on top of the model
Open `index.html?project=bank-branch&pick`, walk around, and create the stops and markers as described in **§8**.

#### Step 6 — Check and fix
| What you see | Fix |
|---|---|
| Model tiny or huge | `scale` |
| Model on its side or facing away | `rotationDeg` (and check Y-up in the export) |
| Camera below or above the floor | `position: [0, -floorHeight, 0]`, or `settings.camera.eyeHeight` |
| You walk through a wall | the wall is part of a very large object (over 40 m² footprint is ignored); split it, or add a `…collider…` box |
| A doorway is blocked | split the wall at the door, or name the blocking object `…nocollide…` |
| Stuck on small things | name them `…nocollide…`, or lower `settings.walk.bodyRadius` |
| Markers too small or large | `settings.hotspots.size` |
| Slow | smaller textures, `settings.graphics.shadows: false` |
| "Could not load the 3D model…" | wrong path, missing `.bin` or textures next to a `.gltf`, or a compressed file (see below) |

#### Code changes: only if you need these (all in `engine/environments/model.js`)
| Need | Change |
|---|---|
| **Draco-compressed** model | `import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js'`, then `const draco = new DRACOLoader().setDecoderPath('https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/libs/draco/')` and `loader.setDRACOLoader(draco)` before `loadAsync` |
| **meshopt-compressed** model | `import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js'`, then `loader.setMeshoptDecoder(MeshoptDecoder)` |
| Play the **model's animations** (fans, doors) | `const mixer = new THREE.AnimationMixer(model); gltf.animations.forEach((clip) => mixer.clipAction(clip).play());`, then in the returned `update(dt)` call `mixer.update(dt)` |
| Different **collision rules** | the numbers in `autoColliders()`: 0.3 m minimum height, 1 m above the floor, 40 m² maximum footprint |
| Extra **lights** or another **sky** | add lights after `addLights(...)`; set `scene.background` |
| Use it **offline** | put `loaders/GLTFLoader.js` (plus the Draco files if used) in `vendor/` (see §12) |

**Not supported for models:** the model's own animations and doors (unless you add the code above), brand colours on the model's materials, and exact collision for diagonal walls (they block their bounding rectangle).

### 360° photos
- Set `environment: 'assets/360/entrance.jpg'`. That's the first photo.
- Each stop gets `panorama: 'assets/360/…jpg'` and `camera: { position: [0, 0, 0], lookAt: [0, 0, -1] }`.
- The **middle of each photo faces `lookAt: [0, 0, -1]`**. Use `rotationDeg` to turn all photos.
- There is no walking, stops fade into each other, and only the current stop's markers show.
- Tip: `settings.look.mouseFollow: 'off'` gives classic drag-to-look.

---

## 8. Coordinate picker (`?pick`): capture positions and put them in the right file

### 8.1 Turn it on
Start your local server (§1) and add `?pick` to the address:
- http://127.0.0.1:5500/index.html?pick (Live Server) or http://localhost:8080/index.html?pick (Python)
- another project: `index.html?project=starter&pick`
- start at a stop: `index.html?stop=4&pick`

A **📍 Coordinate picker** panel appears at the top left. Visitors never see it, because it only appears with `?pick`.

### 8.2 Capture
1. **Go to the area:** Start, ◀ ▶, the dots, walk with the keys, and look around with the mouse.
2. **For a marker:** click the exact spot where it should float (a wall, desk, screen, floor, or a point on a 360° photo). A small pin marks the spot, and the values are **copied automatically**.
   - Clicking an existing marker opens its popup instead, so click next to it.
3. **For a stop's camera:** stand where the visitor should stand and look where they should look. You don't need to click, because "Stop camera" updates live. Then press **Copy all**.
4. Paste into your editor and take the lines you need.

What is copied (the title above each line says where it goes):
```
// Marker → tour-data.js, inside a hotspot { … }
position: [-4.5, 1.75, -10],
// Stop camera → tour-data.js, inside a stop { … }
camera: { position: [0, EYE, -1.8], lookAt: [0, 1.36, -7.79] },
// Floor x, z → environment.js: place(parent, object, x, z)
-4.5, -10
```
The marker position is 0.3 m in front of the clicked surface, so the marker floats. The values are also printed in the browser console (F12).

### 8.3 Where each value goes
Everything goes in **`projects/<your project>/tour-data.js`** (for example `projects/harbinger-office/tour-data.js`). Find things with **Ctrl+F** by their `id`.

**A. Move an existing marker.** Search for the hotspot's `id` (the name used in `?hotspot=`, or search its label). Replace its `position:` line with the copied one:
```js
{
  id: 'reception-desk',
  label: 'Reception desk',
  position: [-5, 1.6, 3.9],        // ← replace this whole line with the copied "position: […],"
  popup: { … },
},
```

**B. Add a new marker.** Search for the **stop** it belongs to (for example `id: 'reception'`). Inside that stop's `hotspots: [ … ]` list, add a block. Blocks are separated by commas.
```js
hotspots: [
  { id: 'reception-desk', … },     // existing marker
  {
    id: 'visitor-badges',           // new, must be unique
    label: 'Visitor badges',        // tooltip on hover
    position: [-3.2, 1.5, 3.1],     // ← pasted from the picker
    popup: {
      title: 'Visitor Badges',
      text: 'Collect your badge here.',
    },
  },
],
```
A marker belongs to its stop: it glows while you stand there, and in 360° tours it only shows at that stop. Pick it while standing at that stop, so it's in view.

**C. Change where a stop stands and looks.** Search for the stop's `id` (for example `id: 'workspace'`) and replace its `camera:` line with the copied one.

**D. Add a new stop.** Copy a whole stop block `{ id: …, hotspots: […] },`. Paste it where it should come in the tour (stops play top to bottom), then change `id`, `name` and `description`, paste the `camera:` line, and start with `hotspots: []`:
```js
{
  id: 'server-room',
  name: 'Server Room',
  description: 'Where our systems live.',
  camera: { position: [6.2, EYE, -12.4], lookAt: [9.1, 1.4, -15.8] },  // ← pasted
  via: [[1.4, EYE, -12]],           // optional, see E
  hotspots: [],
},
```
`EYE` is defined at the top of `tour-data.js` (eye height). Keep it.

**E. The camera drives through a wall to reach a stop.** Stand in the doorway with `?pick` and copy "Stop camera". Use only its position as a `via` point on the stop you're driving **to**: `via: [[x, EYE, z]]`. Several points are allowed, in order.

**F. Place furniture (code environments only).** Use "Floor x, z" in `environment.js`: `place(g, F.createPlant(), -4.5, -10);`

### 8.4 Check the result
1. Save and hard-refresh (Ctrl+F5).
2. Open the stop and popup directly: `index.html?stop=N&hotspot=<id>`.
3. Keep `?pick` while adjusting, and remove it to see what visitors see.

If a marker sinks into an object, raise its y value a little. The numbers are rounded to centimetres.

---

## 9. Coordinates & units

- All distances are in **metres**. **x** runs left (−) to right (+) and **z** runs towards the entrance (+) or deeper inside (−), looking from the entrance. **y** is height.
- Eye level is `EYE` (1.65). Markers usually sit at y 1.5–2.5.
- Each project's `environment.js` has a drawn floor plan in its header.

---

## 10. How it works (for code changes)

**Start-up:**
`index.html` → `engine/boot.js` → loads `projects/<ACTIVE_PROJECT>/project-config.js` → merges it into `CONFIG` → applies branding → `engine/main.js` → loads `tour-data.js` → `environments/load.js` builds the world.

**Every frame (`main.js`):**
`tour.update` → `look.update` (mouse-follow) → `walk.update` → `world.update` (doors) → `hotspots.update` (glow) → `picker.update` → render.

**World contract.** Every environment type returns:
```
{ group, colliders, bounds, update(dt, camera) }
optional: walkable, drive, markersPerStop, introView, onStop(index, stop, camera)
```
A new environment type is a new file in `engine/environments/` returning this object, plus one line in `load.js`.

**Colliders** are floor-plan rectangles `{ minX, maxX, minZ, maxZ, kind }`:
- kind `'wall'` also hides markers behind it
- `'glass'` and `'object'` only block walking

---

## 11. Conventions

- **One job per file.** Settings live in `engine/config.js`, content in `tour-data.js`, branding in `project-config.js`.
- **The engine never contains project names or text.** If you find yourself typing a company name in `engine/`, it belongs in the project instead.
- **Animated objects** (doors, the scanner) set `userData.dynamic = true`, so the performance merge leaves them alone.
- **Shared by several projects?** Put it in `engine/kit/`. **Only one project?** Put it in that project's folder.

---

## 12. Troubleshooting

| Problem | Cause / fix |
|---|---|
| Page stuck on "Loading…" | not served from a web server (§1), or no internet for the CDN |
| "Could not load project …" | wrong `ACTIVE_PROJECT` or `?project=` folder name |
| "Could not load the environment …" | wrong `environment` path, or an unsupported file |
| Image/audio missing in a popup | path must be relative to the project folder (`assets/...`) |
| Camera drives through a wall | add `via` points through the doorway |
| Marker not visible | behind a solid wall, too close (fades within 1.5 m), or (360°) belongs to another stop |
| Can't drag | `look.drag` is `'auto'` and mouse-follow is on; set `drag: true` or `mouseFollow: 'off'` |
| Slow | `graphics.shadows: false`, `maxPixelRatio: 1` |
| Offline use | download `three.module.js` and the used `examples/jsm` files (RoomEnvironment, BufferGeometryUtils, GLTFLoader) into `vendor/`, then update the two URLs in the `importmap` in `index.html` |
| Browser shows old code | hard refresh with Ctrl+F5 |

Use F12 → Console to see errors.
