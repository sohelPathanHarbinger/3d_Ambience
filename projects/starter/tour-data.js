/**
 * tour-data.js — STARTER tour: two stops, two markers
 * ---------------------------------------------------------------
 * Same format as every project. For all popup fields (image, audio,
 * video, layout…) see projects/harbinger-office/tour-data.js.
 * Media paths are relative to this project folder, e.g. 'assets/images/photo.jpg'.
 * ---------------------------------------------------------------
 */
import { CONFIG } from '../../engine/config.js';
import PROJECT from './project-config.js';

const EYE = CONFIG.camera.eyeHeight;

export const TOUR_STOPS = [
  {
    id: 'outside',
    name: 'Entrance',
    description: `Welcome to ${PROJECT.companyName}. The door opens as you walk up to it.`,
    camera: { position: [0, EYE, 8], lookAt: [0, 1.8, 0] },
    hotspots: [
      {
        id: 'about',
        label: 'About us',
        position: [2.1, 2.8, 0.5],
        popup: {
          title: `About ${PROJECT.companyName}`,
          subtitle: PROJECT.companyTagline,
          text: [
            'Replace this text in projects/starter/tour-data.js.',
            'Popups can also show an image, audio and video in any combination.',
          ],
          // image: 'assets/images/photo.jpg',
          // audio: 'assets/audio/welcome.mp3',
          // video: 'https://www.youtube.com/watch?v=XXXXXXXXXXX',
        },
      },
    ],
  },
  {
    id: 'inside',
    name: 'Reception',
    description: 'The only room of the starter project. Walk around with the arrow keys.',
    camera: { position: [0, EYE, -2.5], lookAt: [0, 1.4, -9] },
    hotspots: [
      {
        id: 'desk',
        label: 'Reception desk',
        position: [0, 1.6, -5.4],
        popup: {
          title: 'Reception Desk',
          text: 'Every marker opens a popup like this one.',
        },
      },
    ],
  },
];
