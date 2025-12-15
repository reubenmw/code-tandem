/**
 * Module management functionality.
 *
 * Handles loading and managing learning modules.
 */

import { readFile, writeFile } from 'fs/promises';
import type { Module } from './curriculum.js';
import { parseCurriculum } from './curriculum.js';

/**
 * Generate modules.json from a curriculum markdown file.
 *
 * @param curriculumPath Path to curriculum.md file
 * @param outputPath Path to output modules.json file
 * @returns Array of generated modules
 */
export async function generateModulesJson(
  curriculumPath: string,
  outputPath: string
): Promise<Module[]> {
  // Read curriculum file
  const content = await readFile(curriculumPath, 'utf-8');

  // Parse modules
  const modules = parseCurriculum(content);

  // Write modules.json
  await writeFile(outputPath, JSON.stringify(modules, null, 2), 'utf-8');

  return modules;
}

/**
 * Load modules from a modules.json file.
 *
 * @param modulesPath Path to modules.json file
 * @returns Array of modules
 */
export async function loadModules(modulesPath: string): Promise<Module[]> {
  const content = await readFile(modulesPath, 'utf-8');
  const modules = JSON.parse(content) as Module[];

  // Validate structure
  if (!Array.isArray(modules)) {
    throw new Error('modules.json must contain an array of modules');
  }

  for (const module of modules) {
    if (!module.id || !module.title || !Array.isArray(module.objectives)) {
      throw new Error(`Invalid module structure: ${JSON.stringify(module)}`);
    }
  }

  return modules;
}

/**
 * Get a specific module by ID.
 *
 * @param modules Array of modules
 * @param moduleId Module ID to find
 * @returns The module
 * @throws Error if module not found
 */
export function getModuleById(modules: Module[], moduleId: string): Module {
  const module = modules.find((m) => m.id === moduleId);

  if (!module) {
    throw new Error(`Module not found: ${moduleId}`);
  }

  return module;
}
