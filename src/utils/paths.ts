/**
 * Path utilities for CodeTandem internal files
 * All CodeTandem files should be in .codetandem/ folder
 */

import { join } from 'path';

const CODETANDEM_DIR = '.codetandem';

/**
 * Get path to CodeTandem's internal state file
 */
export function getStatePath(projectPath: string = '.'): string {
  return join(projectPath, CODETANDEM_DIR, 'codetandem.state.json');
}

/**
 * Get path to modules.json file
 */
export function getModulesPath(projectPath: string = '.'): string {
  return join(projectPath, CODETANDEM_DIR, 'modules.json');
}

/**
 * Get path to curriculum.md file
 */
export function getCurriculumPath(projectPath: string = '.'): string {
  return join(projectPath, CODETANDEM_DIR, 'curriculum.md');
}

/**
 * Get path to settings.json file
 */
export function getSettingsPath(projectPath: string = '.'): string {
  return join(projectPath, CODETANDEM_DIR, 'settings.json');
}

/**
 * Get path to lrd.md (Learning Requirements Document)
 */
export function getLrdPath(projectPath: string = '.'): string {
  return join(projectPath, CODETANDEM_DIR, 'lrd.md');
}

/**
 * Get path to .codetandem directory
 */
export function getCodetandemDir(projectPath: string = '.'): string {
  return join(projectPath, CODETANDEM_DIR);
}
