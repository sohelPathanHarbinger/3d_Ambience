# 3D Tour Template

> **Maintaining or extending it?** See **[DEVELOPER.md](DEVELOPER.md)**: every setting, recipes for common changes, environment types, the coordinate picker and troubleshooting.

A reusable **3D walkthrough** for the browser, built with plain **HTML, CSS, JavaScript and [Three.js](https://threejs.org/)**, with no build step and no npm.

Visitors are driven through an environment stop by stop, or walk around freely with the keyboard. Glowing markers open popups that can show a **header**, **text**, an **image**, **audio** and **video** (a file or YouTube/Vimeo link), in any combination.

The environment can be **built in code**, loaded from a **3D model** (.glb/.gltf), or made from **360° photos**. The type is detected automatically.

The code is split into:
- **the engine**, which is shared by every project and never edited for one, and
- **projects**, one folder each (for example a Harbinger office or a bank branch), holding everything that makes a tour unique.

---

## How to run

The page uses JavaScript modules, which browsers only load from a web server. Double-clicking `index.html` will **not** work. Use one of these options:

| Option | How | Address |
|---|---|---|
| **VS Code (easiest)** | Install the **Live Server** extension, right-click `index.html`, choose **Open with Live Server** | http://127.0.0.1:5500/index.html |
| Python | `python -m http.server 8080` in this folder | http://localhost:8080/index.html |
| Node | `npx serve .` in this folder | the URL it prints |

You need an internet connection, because Three.js loads from a CDN (see "Working offline" below).

### Running another project (for example the starter)

Every project lives in `projects/<folder>`. To open one:

- **For one visit:** add `?project=<folder>` to the address, for example:
  - http://127.0.0.1:5500/index.html?project=starter (Live Server)
  - http://localhost:8080/index.html?project=starter (Python)
- **As the default:** set `ACTIVE_PROJECT = 'starter'` at the top of `engine/config.js`.

### Controls
- **Arrow keys** (plus the letter keys in `walk.keys`, W A S D by default) walk forward, back and sideways in the direction you are looking. Walls and furniture block the way.
- **Move the mouse** to look around. With `look.mouseFollow: 'turn'` (default), the view keeps turning while the mouse is towards the left or right side. With `'lean'` it leans a little towards the mouse. Turning pauses while the mouse is on a marker.
- **Drag** to look around (including up and down). By default, mouse dragging is off while mouse-follow is on, and on when `mouseFollow: 'off'`. Change this with `look.drag`. On touch screens dragging always works.
- **Mouse speed** is set by `look.sensitivity` (0.5 = half as fast, 2 = twice as fast).
- **Click** a marker to open its popup. Markers glow when you are near them, otherwise they show as a plain icon.
- **◀ / ▶ buttons** move to the previous or next stop. After walking around freely, they fade and jump instead of driving.
- **Dots** jump straight to any stop.
- **▾ / ▴** collapses or expands the bottom panel.
- **Auto** moves on by itself every few seconds.
- **Esc** closes a popup.

The on-screen help always describes the current keys and mouse settings.

### Address options
| Add to the address | What it does |
|---|---|
| `?project=starter` | show another project |
| `?stop=5` | open directly at stop 5 |
| `?stop=2&hotspot=reception-desk` | also open that marker's popup |
| `?pick` | turn on the **coordinate picker** (see below) |

Combine them with `&`, for example `index.html?project=starter&stop=2&pick`.

---

## Folder structure

```
index.html                  shared page shell
css/style.css               shared styles; brand colours come from the project
engine/                     ← SHARED ENGINE: don't edit for one project
  boot.js                   loads the chosen project, applies its settings and branding, starts main.js
  config.js                 ALL default settings (camera, tour, mouse, walking, markers, graphics)
  main.js                   renderer, scene, camera; wires everything together
  core/                     tour.js, look-controls.js, walk-controls.js, hotspots.js
  ui/                       popup.js, hud.js, branding.js, picker.js (coordinate picker)
  environments/             load.js (detects the type), model.js (3D models), panorama.js (360° photos)
  kit/                      building blocks for code-built environments
    building.js             walls, floors, doors, windows, lights, place(), collision
    furniture.js            desks, chairs, sofas, counters, plants, signs, screens, doors, scanner…
    materials.js            colours and canvas-drawn textures
projects/
  harbinger-office/         ← one folder per project
    project-config.js       name, texts, logo, brand colours, environment type, setting overrides
    environment.js          builds this 3D world in code (only for code-built environments)
    tour-data.js            TOUR_STOPS: stops, markers, popup content
    assets/                 images, audio, video (and 3D models / 360° photos)
  starter/                  minimal example (one room, two stops) to copy for new projects
```

---

## What is configurable, and where

| What | Where |
|---|---|
| Company name, tagline, browser-tab title, favicon, small logo | `projects/<name>/project-config.js` |
| Start-screen texts (kicker, title, paragraph) | `project-config.js` → `intro` |
| Brand colours for the on-screen interface **and** the 3D world | `project-config.js` → `theme` |
| Environment type: code, 3D model or 360° photo | `project-config.js` → `environment` (see below) |
| Camera, tour speed, Auto delay, mouse sensitivity, mouse-follow, dragging, walking speed/keys, marker size/glow, shadows… | Defaults and documentation in `engine/config.js`; override in `project-config.js` → `settings` |
| Tour stops, camera positions, markers, popup text/image/audio/video | `projects/<name>/tour-data.js` |
| The code-built 3D world: rooms, walls, furniture | `projects/<name>/environment.js` |
| Project-only data such as leader names or room names | Anything extra in `project-config.js`, imported by your own `environment.js` and `tour-data.js` |

Example of overriding engine settings for one project:

```js
settings: {
  look: { mouseFollow: 'off', sensitivity: 1.5 },   // drag only, a bit faster
  walk: { speed: 3 },
  graphics: { shadows: false },
  camera: { introPosition: [0, 8, 40], introLookAt: [0, 2, 0] },
}
```

---

## Environment types (detected automatically)

The `environment` line in `project-config.js` decides how the world is made:

| In `project-config.js` | Type | What you provide |
|---|---|---|
| *(no `environment` line)* | **Code** | `environment.js`, built with the kit (like the Harbinger office and the starter) |
| `environment: 'assets/models/bank.glb'` | **3D model** | a `.glb` or `.gltf` file from Blender, SketchUp, 3ds Max, Revit… |
| `environment: 'assets/360/lobby.jpg'` | **360° photo** | 2:1 panorama photos (`.jpg` `.png` `.webp`) from a 360° camera or phone app |

The type is taken from the file extension. Options can be given as an object, for example `environment: { file: 'assets/models/bank.glb', scale: 0.01, rotationDeg: 90 }`, and `type: 'model'` or `type: 'panorama'` can be written out if the extension is unusual.

### 3D model
- Model in **metres**, with y = up and the floor where visitors walk. Use `scale: 0.01` for a model made in centimetres. `position` and `rotationDeg` move and turn it.
- **Walking collision is automatic:** every separate object that stands on the floor and is taller than 30 cm blocks the way. Floors, ceilings, lights and very large combined objects are ignored.
  - Name an object `…nocollide…` to let visitors walk through it.
  - Name one `…collider…` to make it an invisible wall.
  - It works best when walls and furniture are separate objects in the model.
- The start-screen view is chosen automatically, looking at the model from the front. Set `settings.camera.introPosition` to choose your own.
- `collision: false` turns walking collision off.

### 360° photos
- The visitor stands in the middle of the photo and looks around. There is no keyboard walking, and moving to another stop fades to that stop's photo.
- Give each stop its own photo in `tour-data.js`: `panorama: 'assets/360/reception.jpg'`, and `camera: { position: [0, 0, 0], lookAt: [0, 0, -1] }`.
- The **middle of each photo faces forward** (`lookAt: [0, 0, -1]`). Use `rotationDeg` in `environment` to turn all photos.
- Only the current stop's markers are shown. Place them with the coordinate picker.
- Tip: for photo tours, `settings: { look: { mouseFollow: 'off' } }` gives classic drag-to-look, including looking up and down.

---

## Coordinate picker

A tool for building tours, turned on by adding `?pick` to the address, for example `index.html?pick` or `index.html?project=starter&pick`. Visitors never see it.

1. Drive or walk to the area you are working on.
2. **Click any spot** (a floor, a wall, a desk, or a point on a 360° photo). The panel shows, and copies to the clipboard:
   - **Marker:** `position: [x, y, z],`, placed 0.3 m in front of the clicked surface, ready to paste into a hotspot in `tour-data.js`.
   - **Floor x, z:** for `place(parent, object, x, z)` in `environment.js`.
3. **Stop camera** always shows where you are standing and looking right now, for example `camera: { position: [0, EYE, -1.8], lookAt: […] },`. Press its **Copy** button and paste it into a stop.

A small pin marks the last clicked spot. Clicking a marker still opens its popup. The values are also printed in the browser console (F12).

---

## Creating a new project (for example a bank branch)

1. **Copy** `projects/starter` (or `projects/harbinger-office`) to `projects/bank-branch`.
2. **Show it:** open `index.html?project=bank-branch`. To make it the default, set `ACTIVE_PROJECT = 'bank-branch'` in `engine/config.js`.
3. **Branding:** edit `project-config.js`, which sets the name, tagline, intro texts, `theme` colours, `logoMark` and `favicon`.
4. **Choose the environment:**
   - **Code:** build it in `environment.js` with the kit (see below).
   - **3D model:** put the model in `assets/models/`, set `environment: 'assets/models/bank.glb'` and delete `environment.js`.
   - **360° photos:** put them in `assets/360/`, set `environment: 'assets/360/entrance.jpg'` and delete `environment.js`.
5. **Add the tour** in `tour-data.js`: stops, markers and popups. Use `?pick` to get the coordinates.
6. **Add media** to `projects/bank-branch/assets/` and refer to it as `'assets/images/…'`.

You don't need to change anything in `engine/`, `index.html` (apart from the default project) or `css/`.

**Bank props already in the kit (code-built):** walls, glass walls, automatic doors, the fingerprint scanner, signs, screens (for example a token display), sofas, chairs, the executive desk, the conference table, the reception desk, plants, the pantry set, trees and lamp posts.

**Props you would add:** a teller counter, an ATM, queue barriers and a vault door. Write them as `createXxx()` functions in `projects/bank-branch/props.js`, in the style of `engine/kit/furniture.js`.

---

## Building an environment in code (the kit)

A code-built environment's `environment.js` exports one function that the engine calls:

```js
import { FACE, startWorld, finishWorld, addLights, place, addFloor, buildWall,
         addWindow, addProximityDoors, blockWalking, onEveryFrame } from '../../engine/kit/building.js';
import * as F from '../../engine/kit/furniture.js';
import { MAT } from '../../engine/kit/materials.js';

export function buildEnvironment(scene) {
  const world = startWorld(scene, { wallHeight: 3.2 });           // 1. start
  addLights(scene, { center: [0, 0, -5], size: 20 });            //    sun + sky light, shadows over ±20 m
  const g = world.group;

  addFloor(g, -6, -10, 6, 0, MAT.floorWood);                     // 2. build: floor from (x1,z1) to (x2,z2)
  buildWall(g, { axis: 'x', at: 0, from: -6, to: 6, doors: [{ center: 0, width: 2 }] });
  addProximityDoors(g, { x: 0, z: 0, leafWidth: 1, height: 2.4, triggerRadius: 4 });
  place(g, F.createPlant(), 4, -2);                              //    place(parent, object, x, z, facing, y)
  place(g, F.createSofa(2.2), -5.3, -3, FACE.right);

  return finishWorld({ bounds: { minX: -20, maxX: 20, minZ: -15, maxZ: 20 } }); // 3. finish
}
```

- **Coordinates** are in metres. Looking from the entrance into the building, **x** runs left (−) to right (+), **y** is height (1.65 = eye level), and **z** runs towards the entrance (+) or deeper inside (−).
- **`FACE`** sets which way the front of an object points: `FACE.entrance`, `FACE.back`, `FACE.left` or `FACE.right`.
- **Collision is automatic:** walls from `buildWall()` and anything standing on the floor via `place()` block walking. For boxes added directly, call `blockWalking(mesh)`.
- **Brand-coloured materials:** `MAT.accentWall`, `MAT.brandDark`, `MAT.fabricBrand` and `MAT.accentGlow` follow the project's `theme`.
- `projects/starter/environment.js` is the smallest complete example.

---

## Tour content (`tour-data.js`)

Each stop has an `id`, `name`, `description`, `camera: { position, lookAt }`, optional `via` points (the camera passes through them on the way to this stop, for example through doorways), an optional `panorama` (360° photo projects) and a list of `hotspots`.

Each hotspot has an `id`, a `label` (the tooltip), a `position: [x, y, z]` and a `popup`. Every popup field except `title` is optional:

```js
popup: {
  title: 'Reception Desk',                 // header (required)
  subtitle: 'Staffed 8:30 – 18:30',        // small line under the header
  text: ['First paragraph.', 'Second <b>bold</b> paragraph.'],  // string or array
  image: 'assets/images/reception.jpg',    // path inside the project folder, or a full URL
  imageCaption: 'Our front desk',
  layout: 'side',                           // image left, text right
  audio: 'assets/audio/welcome.mp3',
  audioLabel: '🔊 Listen',
  audioAutoplay: false,
  video: 'https://www.youtube.com/watch?v=XXXXXXXXXXX', // or 'assets/video/intro.mp4'
}
```

---

## Performance

On a slow laptop, override `graphics` in the project's `settings`:
- `shadows: false` gives the biggest speed-up.
- `maxPixelRatio: 1`.

For 3D models, keep the file small (compressed textures, under ~50 MB).

## Working offline

Download these into a `vendor/` folder and change the two URLs in the `importmap` in `index.html`:
- `https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js`
- the `examples/jsm/` folder of the same version (used: `environments/RoomEnvironment.js`, `utils/BufferGeometryUtils.js`, `loaders/GLTFLoader.js`)

The demo video in the Harbinger `tour-data.js` is also online. Replace it with a local file in the project's `assets/video/`.
