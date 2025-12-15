/**
 * Curriculum parsing functionality.
 *
 * Parses markdown files to extract learning modules and objectives.
 */

export interface Module {
  id: string;
  title: string;
  objectives: string[];
}

export class CurriculumParser {
  private modules: Module[] = [];
  private currentModule: Module | null = null;

  /**
   * Parse a curriculum markdown file.
   *
   * Format:
   * - H1 headers (#) become module titles
   * - List items under H1 become objectives
   * - H2 headers (##) are ignored
   *
   * @param content Markdown content to parse
   * @returns Array of parsed modules
   */
  parse(content: string): Module[] {
    this.modules = [];
    this.currentModule = null;

    const lines = content.split('\n');

    for (const line of lines) {
      const trimmed = line.trim();

      // H1 header - new module
      if (trimmed.startsWith('# ') && !trimmed.startsWith('## ')) {
        this.finishCurrentModule();

        const title = trimmed.substring(2).trim();
        const id = this.titleToId(title);

        this.currentModule = {
          id,
          title,
          objectives: []
        };
      }
      // List item - objective
      else if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
        if (this.currentModule) {
          const objective = trimmed.substring(2).trim();
          if (objective) {
            this.currentModule.objectives.push(objective);
          }
        }
      }
      // H2 headers and other lines are ignored
    }

    // Don't forget the last module
    this.finishCurrentModule();

    return this.modules;
  }

  /**
   * Finish processing current module and add to list.
   */
  private finishCurrentModule(): void {
    if (this.currentModule && this.currentModule.objectives.length > 0) {
      this.modules.push(this.currentModule);
    }
  }

  /**
   * Convert module title to ID.
   *
   * @param title Module title
   * @returns Module ID (lowercase, hyphenated)
   */
  private titleToId(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }
}

/**
 * Parse a curriculum markdown file.
 *
 * @param content Markdown content
 * @returns Array of modules
 */
export function parseCurriculum(content: string): Module[] {
  const parser = new CurriculumParser();
  return parser.parse(content);
}
