import { Resource } from '@modelcontextprotocol/sdk/types.js';
import { loadState } from '../../utils/state.js';
import { loadModules } from '../../utils/modules.js';
import { readFile } from 'fs/promises';
import { join } from 'path';

/**
 * Resource URI schemes:
 * - codetandem://state - Current learning state
 * - codetandem://curriculum - Complete curriculum
 * - codetandem://module/{moduleId} - Specific module details
 * - codetandem://settings - Current settings
 */

/**
 * List all available resources
 */
export async function listResources(): Promise<Resource[]> {
  const resources: Resource[] = [
    {
      uri: 'codetandem://state',
      name: 'Learning State',
      description:
        'Current learning state including progress, completed modules, and proficiency tracking',
      mimeType: 'application/json',
    },
    {
      uri: 'codetandem://curriculum',
      name: 'Curriculum',
      description: 'Complete learning curriculum with all modules and objectives',
      mimeType: 'application/json',
    },
    {
      uri: 'codetandem://settings',
      name: 'Settings',
      description: 'Current CodeTandem settings and preferences',
      mimeType: 'application/json',
    },
  ];

  // Add individual module resources
  try {
    const modules = await loadModules('./modules.json');
    for (const module of modules) {
      resources.push({
        uri: `codetandem://module/${module.id}`,
        name: `Module: ${module.title}`,
        description: `Details for module ${module.id}: ${module.title}`,
        mimeType: 'application/json',
      });
    }
  } catch (error) {
    // If curriculum not loaded, just return basic resources
  }

  return resources;
}

/**
 * Read a specific resource
 */
export async function readResource(
  uri: string
): Promise<{ contents: Array<{ uri: string; mimeType: string; text: string }> }> {
  // Parse URI
  const url = new URL(uri);

  if (url.protocol !== 'codetandem:') {
    throw new Error(`Unsupported protocol: ${url.protocol}`);
  }

  const path = url.pathname.slice(2); // Remove leading //

  // Handle different resource types
  switch (path) {
    case 'state':
      return await getStateResource(uri);

    case 'curriculum':
      return await getCurriculumResource(uri);

    case 'settings':
      return await getSettingsResource(uri);

    default:
      // Check if it's a module resource
      if (path.startsWith('module/')) {
        const moduleId = path.replace('module/', '');
        return await getModuleResource(uri, moduleId);
      }

      throw new Error(`Unknown resource: ${path}`);
  }
}

/**
 * Get learning state resource
 */
async function getStateResource(uri: string) {
  try {
    const state = await loadState('./codetandem.state.json');

    return {
      contents: [
        {
          uri,
          mimeType: 'application/json',
          text: JSON.stringify(state, null, 2),
        },
      ],
    };
  } catch (error: any) {
    throw new Error(`Failed to load state: ${error.message}`);
  }
}

/**
 * Get curriculum resource
 */
async function getCurriculumResource(uri: string) {
  try {
    const modules = await loadModules('./modules.json');
    const state = await loadState('./codetandem.state.json');

    // Enrich curriculum with completion status
    const enrichedCurriculum = modules.map((module) => ({
      ...module,
      completed: state.completedModules?.includes(module.id) || false,
      isCurrent: state.currentModuleId === module.id,
    }));

    return {
      contents: [
        {
          uri,
          mimeType: 'application/json',
          text: JSON.stringify(enrichedCurriculum, null, 2),
        },
      ],
    };
  } catch (error: any) {
    throw new Error(`Failed to load curriculum: ${error.message}`);
  }
}

/**
 * Get settings resource
 */
async function getSettingsResource(uri: string) {
  try {
    const settingsPath = join('.codetandem', 'settings.json');
    const settingsContent = await readFile(settingsPath, 'utf-8');
    const settings = JSON.parse(settingsContent);

    return {
      contents: [
        {
          uri,
          mimeType: 'application/json',
          text: JSON.stringify(settings, null, 2),
        },
      ],
    };
  } catch (error: any) {
    throw new Error(`Failed to load settings: ${error.message}`);
  }
}

/**
 * Get specific module resource
 */
async function getModuleResource(uri: string, moduleId: string) {
  try {
    const modules = await loadModules('./modules.json');
    const module = modules.find((m) => m.id === moduleId);

    if (!module) {
      throw new Error(`Module not found: ${moduleId}`);
    }

    const state = await loadState('./codetandem.state.json');
    const progress = state.moduleProgress?.[moduleId] || {
      attempts: 0,
      objectivesCompleted: [],
      hintsUsed: 0,
      solutionsUsed: 0,
      bestScore: 0,
    };

    // Enrich module with progress data
    const enrichedModule = {
      ...module,
      completed: state.completedModules?.includes(moduleId) || false,
      isCurrent: state.currentModuleId === moduleId,
      progress: {
        attempts: progress.attempts,
        objectivesCompleted: progress.objectivesCompleted.length,
        totalObjectives: module.objectives.length,
        proficiencyPercentage:
          module.objectives.length > 0
            ? (progress.objectivesCompleted.length / module.objectives.length) * 100
            : 0,
        bestScore: progress.bestScore,
        hintsUsed: progress.hintsUsed,
        solutionsUsed: progress.solutionsUsed,
      },
      objectiveDetails: module.objectives.map((obj, index) => {
        const objId = `obj-${index + 1}`;
        const completion = progress.objectivesCompleted.find((c) => c.objectiveId === objId);

        return {
          objectiveId: objId,
          description: obj,
          todoFormat: `// TODO: [${objId}] ${obj}`,
          completed: !!completion,
          completedAt: completion?.completedAt,
          score: completion?.score,
        };
      }),
    };

    return {
      contents: [
        {
          uri,
          mimeType: 'application/json',
          text: JSON.stringify(enrichedModule, null, 2),
        },
      ],
    };
  } catch (error: any) {
    throw new Error(`Failed to load module: ${error.message}`);
  }
}
