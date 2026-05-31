import { resolve } from 'node:path';
import { loadGlobalConfig, saveGlobalConfig } from './config.js';

export async function addWatchedProject(projectPath) {
  const config = await loadGlobalConfig();
  const resolved = resolve(projectPath);

  if (!config.watchedProjects.includes(resolved)) {
    config.watchedProjects.push(resolved);
    await saveGlobalConfig(config);
  }
}

export async function removeWatchedProject(projectPath) {
  const config = await loadGlobalConfig();
  const resolved = resolve(projectPath);
  config.watchedProjects = config.watchedProjects.filter((project) => project !== resolved);
  await saveGlobalConfig(config);
}

export async function listWatchedProjects() {
  const config = await loadGlobalConfig();
  return config.watchedProjects;
}
