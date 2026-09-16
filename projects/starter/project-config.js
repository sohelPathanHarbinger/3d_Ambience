/**
 * project-config.js — STARTER project
 * ---------------------------------------------------------------
 * A minimal, complete project: one room, two stops, two markers.
 * Copy this folder to begin a new project (e.g. projects/bank-branch),
 * then set ACTIVE_PROJECT = 'bank-branch' in engine/config.js.
 *
 * All engine settings you can override under `settings` are listed
 * in engine/config.js.
 * ---------------------------------------------------------------
 */
export default {
  // ---- Identity ---------------------------------------------------
  title: 'Your Company · 3D Tour',
  companyName: 'Your Company',
  companyTagline: 'Your tagline goes here',
  // logoMark: 'assets/images/logo-mark.svg',  // small logo in the top-left badge (optional)
  favicon: '✨',                               // an emoji or an image path

  // ---- Start screen ------------------------------------------------
  intro: {
    kicker: '3D tour',
    text: 'A minimal starter project: one room, two stops and two markers. Copy this folder to begin a new project.',
  },

  // ---- Brand colours ----------------------------------------------
  theme: {
    primary: '#2f6fdf',
    primaryDark: '#2459b8',
    primaryLight: '#6aa0ff',
    secondary: '#1f2937',
    glow: '#5aa2ff',
  },

  // ---- Environment (optional) ---------------------------------------
  // Left out here, so the 3D world is built in environment.js. Instead you can name a file
  // and the engine detects the type automatically:
  // environment: 'assets/models/building.glb', // a 3D model (.glb / .gltf)
  // environment: 'assets/360/entrance.jpg',    // a 360° photo (.jpg / .png / .webp)

  // ---- Engine settings changed for this project ---------------------
  settings: {
    camera: {
      introPosition: [0, 5, 18],   // start-screen view: outside the room
      introLookAt: [0, 1.5, 0],
    },
  },
};
