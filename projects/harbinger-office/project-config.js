/**
 * project-config.js — Harbinger Group office
 * ---------------------------------------------------------------
 * Everything that makes this project different from others:
 * identity, start-screen texts, brand colours and any engine
 * settings to change. The engine reads the fields below;
 * environment.js and tour-data.js can also import this file for
 * project-only data (like `cabins`).
 *
 * NEW PROJECT: copy this folder (or projects/starter), rename it,
 * then set ACTIVE_PROJECT = '<new folder name>' in engine/config.js.
 * ---------------------------------------------------------------
 */
export default {
  // ---- Identity ---------------------------------------------------
  title: 'Harbinger Group · 3D Office Tour',   // browser tab
  companyName: 'Harbinger Group',
  companyTagline: 'Transforming The Way People Work and Learn',
  logoMark: 'assets/images/logo-mark.svg',     // small logo in the top-left badge (optional)
  favicon: '🏢',                               // an emoji or an image path

  // ---- Start screen ------------------------------------------------
  intro: {
    kicker: 'Virtual office tour',
    // title: 'Welcome to …',                  // optional; default "Welcome to <companyName>"
    text: 'Take a walk through our office — from the main entrance, past reception and the secure door, '
      + 'through the workspace, meeting room and leadership cabins, all the way to the pantry.',
  },

  // ---- Brand colours: on-screen interface + 3D signs, walls and markers ----
  theme: {
    primary: '#e23744',                // Harbinger red — markers, buttons, accent signs
    primaryDark: '#c4283a',            // hover states, red chairs
    primaryLight: '#ff6b78',           // red text on the dark panels
    secondary: '#1e2a4b',              // Harbinger navy — feature walls, counters, sign backgrounds
    glow: '#ff3b4e',                   // glowing strips
    panel: 'rgba(20, 29, 54, 0.82)',   // on-screen panels
  },

  // ---- Environment (optional) ---------------------------------------
  // Left out here, so the 3D world is built in environment.js. Instead you can name a file
  // and the engine detects the type automatically:
  // environment: 'assets/models/office.glb',   // a 3D model (.glb / .gltf)
  // environment: 'assets/360/lobby.jpg',       // a 360° photo (.jpg / .png / .webp)

  // ---- Engine settings changed for this project (all options: engine/config.js) ----
  settings: {
    camera: {
      introPosition: [0, 7, 42],       // start-screen view: outside, in front of the building
      introLookAt: [0, 2, 8],
    },
  },

  // ---- Project-only data (used by environment.js and tour-data.js) ----
  meetingRoomName: 'Everest',

  // The 3 leadership cabins, front to back along the right-hand corridor.
  // Used for the sign above each cabin door and the desk name plate.
  cabins: [
    { title: 'CEO', name: 'Jane Doe' },
    { title: 'CTO', name: 'Raj Mehta' },
    { title: 'HR Head', name: 'Sara Khan' },
  ],
};
