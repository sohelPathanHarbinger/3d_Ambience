/**
 * tour-data.js
 * ---------------------------------------------------------------
 * THE CONTENT OF THE TOUR — edit this file to change what visitors
 * see and read. There is no 3D code in here, only data.
 *
 * The tour visits the stops in the order they are listed in TOUR_STOPS.
 *
 * STOP fields
 *   id           unique text id
 *   name         title shown in the bottom panel
 *   description  short sentence shown under the title
 *   camera       { position: [x, y, z], lookAt: [x, y, z] } — where the camera stands and looks
 *   via          (optional) points the camera passes through on the way TO this stop
 *                from the previous one — used to go through doors instead of walls
 *   panorama     (360° photo projects only) the photo shown at this stop
 *   hotspots     clickable markers that belong to this stop (see below). Every marker is always
 *                visible; it glows while you stand at its stop or walk within
 *                CONFIG.hotspots.glowDistance of it.
 *
 * HOTSPOT fields
 *   id           unique text id (also usable in the URL: index.html?stop=2&hotspot=reception-desk)
 *   label        tooltip shown when the mouse hovers the marker
 *   position     [x, y, z] where the glowing marker floats
 *   icon         (optional) 'i', '▶', '♪' … — picked automatically from the content if omitted
 *   popup        what the info window shows. Every field except `title` is OPTIONAL,
 *                so any combination works (text only, image + audio, video only, ...):
 *     title          header text
 *     subtitle       small line under the header
 *     text           a string, or an array of strings (one per paragraph). Simple HTML is allowed.
 *     image          an image (png, jpg, svg, gif, webp): a path inside this project folder,
 *                    e.g. 'assets/images/photo.jpg', or a full URL (same for audio and video)
 *     imageCaption   small caption under the image
 *     layout         'side' = image on the left, text on the right (default: stacked)
 *     audio          path or URL of an audio file (mp3, wav, ogg)
 *     audioLabel     label above the audio player
 *     audioAutoplay  true = start playing as soon as the popup opens
 *     video          mp4/webm file path or URL, OR a YouTube / Vimeo link
 *
 * COORDINATES are in metres. Standing outside, looking at the entrance:
 *   x = left (-) / right (+)     y = height     z = towards you (+) / deeper inside (-)
 *   Outside z > 8 · Lobby z 0…8 · Workspace z -14…0 · Meeting room & cabins z -26…-14 · Pantry z -34…-26
 *   (see the floor plan at the top of environment.js)
 * ---------------------------------------------------------------
 */
import { CONFIG } from '../../engine/config.js';
import PROJECT from './project-config.js';

const EYE = CONFIG.camera.eyeHeight;
const COMPANY = PROJECT.companyName;
const [CEO, CTO, HR] = PROJECT.cabins;

// Demo video (a free CC0 clip hosted by MDN). Replace it with your own file,
// e.g. 'assets/video/company-intro.mp4', or with a YouTube link.
const SAMPLE_VIDEO = 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4';

export const TOUR_STOPS = [
  // 1 ── ENTRANCE ───────────────────────────────────────────────────
  {
    id: 'entrance',
    name: 'Main Entrance',
    description: `Welcome to ${COMPANY}. The glass doors open automatically as you walk in.`,
    camera: { position: [0, EYE, 18], lookAt: [0, 2.4, 8] },
    hotspots: [
      {
        id: 'welcome',
        label: 'Welcome message',
        position: [4.6, 3.75, 8.6],
        popup: {
          title: `Welcome to ${COMPANY}`,
          subtitle: 'Headquarters · Ground floor',
          image: 'assets/images/logo.svg',
          text: [
            `Thank you for visiting ${COMPANY}. This short tour takes you through our office,
             from the entrance all the way to the pantry.`,
            'Look for the glowing markers at every stop and click them to learn more.',
          ],
          audio: 'assets/audio/welcome.wav',
          audioLabel: '🔊 Listen to the welcome message',
        },
      },
      {
        id: 'visitor-info',
        label: 'Visitor information',
        position: [3.0, 1.95, 12.5],
        popup: {
          title: 'Visitor Information',
          subtitle: 'Office hours: Mon – Fri, 9:00 – 18:00',
          image: 'assets/images/floor-plan.svg',
          imageCaption: 'Floor plan. The numbers are the tour stops.',
          layout: 'side',
          text: [
            'All visitors must register at the reception desk and wear a visitor badge at all times.',
            '<b>Parking:</b> visitor parking is on the left side of the building.',
            '<b>Wi-Fi:</b> ask the receptionist for the guest network password.',
          ],
        },
      },
    ],
  },

  // 2 ── RECEPTION ──────────────────────────────────────────────────
  {
    id: 'reception',
    name: 'Reception & Lobby',
    description: 'Check in with our front-desk team, collect your visitor badge and relax in the waiting lounge.',
    camera: { position: [2.5, EYE, 6.4], lookAt: [-4.5, 1.3, 2.5] },
    via: [[0, EYE, 9.8], [0.6, EYE, 7.4]], // straight through the entrance doors
    hotspots: [
      {
        id: 'reception-desk',
        label: 'Reception desk',
        position: [-5, 1.6, 3.9],
        popup: {
          title: 'Reception Desk',
          subtitle: 'Staffed 8:30 – 18:30',
          text: [
            'Our front-desk team welcomes every guest, issues visitor badges and helps with deliveries and meeting-room guests.',
            'Please keep your badge visible while you are in the building.',
          ],
          audio: 'assets/audio/reception.wav',
          audioLabel: '🔊 A message from the front desk',
        },
      },
      {
        id: 'logo-wall',
        label: 'About us',
        position: [-2.4, 2.5, 0.4],
        popup: {
          title: `About ${COMPANY}`,
          image: 'assets/images/logo.svg',
          layout: 'side',
          text: [
            `${COMPANY} was founded with a simple mission: build useful products with great people.`,
            'Today we are a team of 250+ people in 4 countries, serving customers in 30 markets.',
          ],
        },
      },
      {
        id: 'lobby-screen',
        label: 'Company video',
        position: [-11.6, 2.75, 4.5],
        popup: {
          title: 'Our Story in 60 Seconds',
          subtitle: 'Playing on the lobby screen',
          video: SAMPLE_VIDEO,
          text: 'This is a sample video. Replace it in <code>projects/harbinger-office/tour-data.js</code> with your own company film or a YouTube link.',
        },
      },
    ],
  },

  // 3 ── BIOMETRIC DOOR ─────────────────────────────────────────────
  {
    id: 'biometric',
    name: 'Secure Access Door',
    description: 'Employees sign in with a fingerprint scan. Visitors are escorted by their host.',
    camera: { position: [0.3, EYE, 3.2], lookAt: [0.8, 1.45, 0] },
    hotspots: [
      {
        id: 'scanner',
        label: 'Biometric scanner',
        position: [1.55, 1.8, 0.35],
        popup: {
          title: 'Biometric Login',
          subtitle: 'Fingerprint and card access control',
          image: 'assets/images/biometric.svg',
          layout: 'side',
          text: [
            'Place a registered finger on the scanner. The screen turns <b>green</b> and the door slides open.',
            'Every scan also records your attendance, so there is no separate login.',
            'Lost access? Contact IT support on extension 4040.',
          ],
          audio: 'assets/audio/biometric.wav',
          audioLabel: '🔊 How it works',
        },
      },
      {
        id: 'secure-door',
        label: 'Security door',
        position: [-0.5, 2.05, 0.3],
        popup: {
          title: 'Access-Controlled Door',
          text: 'Beyond this door is the employee-only area. The door stays closed for unregistered people and every entry is logged for security.',
        },
      },
    ],
  },

  // 4 ── WORKSPACE ──────────────────────────────────────────────────
  {
    id: 'workspace',
    name: 'Open Workspace',
    description: 'Our open-plan work area with team cubicles, hot desks and a print station.',
    camera: { position: [0, EYE, -1.8], lookAt: [0, 1.15, -12] },
    hotspots: [
      {
        id: 'cubicles',
        label: 'Team cubicles',
        position: [-4.5, 1.75, -10],
        popup: {
          title: 'Team Cubicles',
          subtitle: '32 workstations · ergonomic chairs',
          image: 'assets/images/workspace.svg',
          layout: 'side',
          text: [
            'Teams sit together in pods of four. Low acoustic panels keep the noise down without blocking conversation.',
            'Every desk has a monitor, a docking station and a height-adjustable chair.',
          ],
        },
      },
      {
        id: 'hot-desks',
        label: 'Hot desks',
        position: [4.5, 1.75, -10],
        popup: {
          title: 'Hot Desks',
          text: [
            'Visiting colleagues can book any free hot desk in the office app.',
            'Please clear the desk at the end of the day. Lockers are available near the pantry.',
          ],
        },
      },
      {
        id: 'print-station',
        label: 'Print station',
        position: [3.8, 1.55, -13.4],
        popup: {
          title: 'Print Station',
          text: 'Secure printing: send your document, then tap your ID card on the printer to release it.',
        },
      },
    ],
  },

  // 5 ── MEETING ROOM ───────────────────────────────────────────────
  {
    id: 'meeting-room',
    name: `Meeting Room · ${PROJECT.meetingRoomName}`,
    description: 'A 9-seat room with video conferencing and a whiteboard wall.',
    camera: { position: [-4.3, EYE, -20], lookAt: [-10.5, 1.1, -20.4] },
    via: [[0, EYE, -18.5], [-1.6, EYE, -20]], // down the corridor, then left through the glass door
    hotspots: [
      {
        id: 'conference-table',
        label: 'Conference table',
        position: [-7.6, 1.25, -20],
        popup: {
          title: 'Conference Table',
          subtitle: 'Seats 9 · book it in your calendar',
          image: 'assets/images/meeting-room.svg',
          text: `Add "${PROJECT.meetingRoomName}" as the location of your calendar invite to book the room. Please finish on time, the next team is usually waiting!`,
        },
      },
      {
        id: 'vc-screen',
        label: 'Video conferencing',
        position: [-11.6, 2.5, -18.2],
        popup: {
          title: 'Video Conferencing',
          subtitle: 'One-touch join from the table remote',
          video: SAMPLE_VIDEO,
          text: 'The large screen and ceiling microphones work with Teams, Zoom and Meet.',
        },
      },
      {
        id: 'whiteboard',
        label: 'Whiteboard',
        position: [-11.6, 2.35, -22.8],
        popup: {
          title: 'Whiteboard Wall',
          text: 'Markers and erasers are in the tray. Take a photo of your work and wipe the board clean when you leave.',
        },
      },
    ],
  },

  // 6 ── CABIN 1 ────────────────────────────────────────────────────
  {
    id: 'cabin-ceo',
    name: `${CEO.title} Cabin`,
    description: `The office of ${CEO.name}, our ${CEO.title}.`,
    camera: { position: [4.4, EYE, -16], lookAt: [10.5, 1.2, -16] },
    via: [[-1.6, EYE, -20], [1.4, EYE, -16]], // out of the meeting room and across the corridor
    hotspots: [
      {
        id: 'ceo-profile',
        label: `${CEO.name} · ${CEO.title}`,
        position: [9.4, 1.55, -16],
        popup: {
          title: CEO.name,
          subtitle: 'Chief Executive Officer',
          image: 'assets/images/person-ceo.svg',
          layout: 'side',
          text: [
            `${CEO.name} co-founded the company and has led it for 12 years, growing it from a garage start-up to a global team.`,
            'Her door is open every Friday afternoon for anyone who wants to share an idea.',
          ],
          audio: 'assets/audio/ceo-message.wav',
          audioLabel: '🔊 A message from our CEO',
        },
      },
      {
        id: 'ceo-awards',
        label: 'Awards shelf',
        position: [11.4, 2.55, -15.9],
        popup: {
          title: 'Awards & Recognition',
          text: ['🏆 Best Workplace 2025', '🏆 Innovation Award 2024', '🏆 Customer Choice 2023'],
        },
      },
    ],
  },

  // 7 ── CABIN 2 ────────────────────────────────────────────────────
  {
    id: 'cabin-cto',
    name: `${CTO.title} Cabin`,
    description: `The office of ${CTO.name}, our ${CTO.title}.`,
    camera: { position: [4.4, EYE, -20], lookAt: [10.5, 1.2, -20] },
    via: [[1.4, EYE, -16], [1.4, EYE, -20]], // back into the corridor, then into the next cabin
    hotspots: [
      {
        id: 'cto-profile',
        label: `${CTO.name} · ${CTO.title}`,
        position: [9.4, 1.55, -20],
        popup: {
          title: CTO.name,
          subtitle: 'Chief Technology Officer',
          image: 'assets/images/person-cto.svg',
          layout: 'side',
          text: [
            `${CTO.name} leads engineering, product architecture and our R&D lab.`,
            'Ask about the internal hackathon. It happens every quarter.',
          ],
        },
      },
    ],
  },

  // 8 ── CABIN 3 ────────────────────────────────────────────────────
  {
    id: 'cabin-hr',
    name: `${HR.title} Cabin`,
    description: `The office of ${HR.name}, our ${HR.title}.`,
    camera: { position: [4.4, EYE, -24], lookAt: [10.5, 1.2, -24] },
    via: [[1.4, EYE, -20], [1.4, EYE, -24]],
    hotspots: [
      {
        id: 'hr-profile',
        label: `${HR.name} · ${HR.title}`,
        position: [9.4, 1.55, -24],
        popup: {
          title: HR.name,
          subtitle: 'Head of People & Culture',
          image: 'assets/images/person-hr.svg',
          text: `${HR.name} looks after hiring, onboarding, learning programmes and employee well-being. New joiners meet her on day one.`,
        },
      },
    ],
  },

  // 9 ── PANTRY (end of the tour) ───────────────────────────────────
  {
    id: 'pantry',
    name: 'Pantry & Café',
    description: 'Free coffee, fresh snacks and a place to recharge. This is the end of the tour. Enjoy!',
    camera: { position: [0, EYE, -27], lookAt: [0, 1.2, -34] },
    via: [[1.4, EYE, -24], [0, EYE, -25.4]],
    hotspots: [
      {
        id: 'coffee',
        label: 'Coffee station',
        position: [0.9, 1.6, -33.5],
        popup: {
          title: 'Coffee Station',
          subtitle: 'Bean-to-cup · open all day',
          text: 'Espresso, cappuccino, tea and hot chocolate, all free. Please rinse your mug after use.',
          audio: 'assets/audio/pantry.wav',
          audioLabel: '🔊 Pantry guidelines',
        },
      },
      {
        id: 'menu',
        label: "Today's menu",
        position: [6.3, 2.75, -33.6],
        popup: {
          title: "Today's Menu",
          image: 'assets/images/pantry-menu.svg',
          imageCaption: 'Lunch is served 12:30 – 14:30.',
        },
      },
      {
        id: 'dining',
        label: 'Dining area',
        position: [-3.0, 1.2, -30.8],
        popup: {
          title: 'Dining Area',
          text: [
            'Seating for 20 people. Lunch is catered on Tuesdays and Thursdays.',
            'Thank you for taking the tour! Use the ↺ Restart button to start again.',
          ],
        },
      },
    ],
  },
];
