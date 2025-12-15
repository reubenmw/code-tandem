/**
 * Task Master integration for parsing PRD and task data
 */

import { readFile } from 'fs/promises';

export interface TaskmasterTask {
  id: string;
  title: string;
  description: string;
  dependencies: string[];
  status: string;
  priority?: string;
  tags?: string[];
}

export interface PRDSection {
  title: string;
  content: string;
  level: number;
  objectives: string[];
}

/**
 * Parse Task Master tasks.json file
 */
export async function parseTasksJson(filePath: string): Promise<TaskmasterTask[]> {
  const content = await readFile(filePath, 'utf-8');
  const data = JSON.parse(content);

  // Handle different structures
  const tasksData = Array.isArray(data) ? data : data.tasks || [];

  return tasksData.map((task: any) => ({
    id: String(task.id),
    title: task.title || '',
    description: task.description || '',
    dependencies: task.dependencies || [],
    status: task.status || 'pending',
    priority: task.priority,
    tags: task.tags,
  }));
}

/**
 * Parse PRD markdown file
 */
export async function parsePRD(filePath: string): Promise<PRDSection[]> {
  const content = await readFile(filePath, 'utf-8');
  return parsePRDContent(content);
}

/**
 * Parse PRD content string
 */
export function parsePRDContent(content: string): PRDSection[] {
  const sections: PRDSection[] = [];
  const lines = content.split('\n');

  let currentSection: { title: string; level: number } | null = null;
  let currentContent: string[] = [];
  let currentObjectives: string[] = [];

  for (const line of lines) {
    // Check for heading
    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);

    if (headingMatch) {
      // Save previous section
      if (currentSection) {
        sections.push({
          title: currentSection.title,
          content: currentContent.join('\n').trim(),
          level: currentSection.level,
          objectives: currentObjectives,
        });
      }

      // Start new section
      currentSection = {
        title: headingMatch[2]!.trim(),
        level: headingMatch[1]!.length,
      };
      currentContent = [];
      currentObjectives = [];
    } else if (currentSection) {
      // Check for objectives (list items)
      const objectiveMatch = line.match(/^[-*]\s+(.+)$/);
      if (objectiveMatch) {
        currentObjectives.push(objectiveMatch[1]!.trim());
      }
      currentContent.push(line);
    }
  }

  // Save final section
  if (currentSection) {
    sections.push({
      title: currentSection.title,
      content: currentContent.join('\n').trim(),
      level: currentSection.level,
      objectives: currentObjectives,
    });
  }

  return sections;
}

/**
 * Create mapping between curriculum topics and task IDs
 */
export function createCurriculumBacklogMapping(
  prdSections: PRDSection[],
  tasks: TaskmasterTask[]
): Record<string, string[]> {
  const mapping: Record<string, string[]> = {};

  // Extract topics from PRD (h1 and h2 headings)
  const topics = prdSections.filter((s) => s.level <= 2);

  for (const topic of topics) {
    const topicTitle = topic.title;
    const matchedTaskIds: string[] = [];

    // Extract keywords from topic
    const topicKeywords = new Set([
      ...topicTitle.toLowerCase().match(/\w+/g) || [],
      ...topic.objectives.flatMap((obj) => obj.toLowerCase().match(/\w+/g) || []),
    ]);

    // Match against tasks
    for (const task of tasks) {
      const taskKeywords = new Set([
        ...task.title.toLowerCase().match(/\w+/g) || [],
        ...task.description.toLowerCase().match(/\w+/g) || [],
      ]);

      // Check for keyword overlap (require at least 2 matches)
      const overlap = [...topicKeywords].filter((k) => taskKeywords.has(k));
      if (overlap.length >= 2) {
        matchedTaskIds.push(task.id);
      }
    }

    mapping[topicTitle] = matchedTaskIds;
  }

  return mapping;
}

/**
 * Filter tasks by criteria
 */
export function filterTasks(
  tasks: TaskmasterTask[],
  filters: {
    status?: string;
    priority?: string;
    tags?: string[];
  }
): TaskmasterTask[] {
  let filtered = tasks;

  if (filters.status) {
    filtered = filtered.filter((t) => t.status === filters.status);
  }

  if (filters.priority) {
    filtered = filtered.filter((t) => t.priority === filters.priority);
  }

  if (filters.tags && filters.tags.length > 0) {
    filtered = filtered.filter(
      (t) => t.tags && t.tags.some((tag) => filters.tags!.includes(tag))
    );
  }

  return filtered;
}
