/**
 * engine/boot.js — the first script that runs
 * ---------------------------------------------------------------
 * 1. Finds out which project to show: ?project=<folder> in the URL,
 *    otherwise ACTIVE_PROJECT in engine/config.js.
 * 2. Loads projects/<folder>/project-config.js and merges it into CONFIG.
 * 3. Puts the project's name, colours, texts and logo on the page.
 * 4. Starts the engine (main.js), which loads the project's
 *    environment.js and tour-data.js.
 * ---------------------------------------------------------------
 */
import { applyProject, ACTIVE_PROJECT } from './config.js';
import { applyBranding } from './ui/branding.js';

const name = new URLSearchParams(location.search).get('project') || ACTIVE_PROJECT;
const folder = `projects/${name}`;

try {
  if (!/^[\w-]+$/.test(name || '')) throw new Error(`"${name}" is not a valid project folder name`);
  const project = (await import(`../${folder}/project-config.js`)).default;
  applyProject(folder, project);
} catch (error) {
  document.getElementById('intro-status').textContent =
    `Could not load project "${name}" (${folder}/project-config.js). Check ACTIVE_PROJECT in engine/config.js or ?project= in the address.`;
  throw error;
}

applyBranding();
await import('./main.js');
