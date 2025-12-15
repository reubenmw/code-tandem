import { describe, it, expect } from 'vitest';
import { parseCurriculum, CurriculumParser } from './curriculum.js';

describe('CurriculumParser', () => {
  it('should parse a simple curriculum with one module', () => {
    const content = `
# Introduction to Python

- Learn basic syntax
- Understand variables and types
- Work with functions
`;

    const modules = parseCurriculum(content);

    expect(modules).toHaveLength(1);
    expect(modules[0].id).toBe('introduction-to-python');
    expect(modules[0].title).toBe('Introduction to Python');
    expect(modules[0].objectives).toHaveLength(3);
    expect(modules[0].objectives[0]).toBe('Learn basic syntax');
  });

  it('should parse multiple modules', () => {
    const content = `
# Module One

- Objective 1
- Objective 2

# Module Two

- Objective A
- Objective B
- Objective C
`;

    const modules = parseCurriculum(content);

    expect(modules).toHaveLength(2);
    expect(modules[0].id).toBe('module-one');
    expect(modules[0].objectives).toHaveLength(2);
    expect(modules[1].id).toBe('module-two');
    expect(modules[1].objectives).toHaveLength(3);
  });

  it('should ignore H2 headers', () => {
    const content = `
# Main Module

## Subsection

- Objective 1
- Objective 2
`;

    const modules = parseCurriculum(content);

    expect(modules).toHaveLength(1);
    expect(modules[0].objectives).toHaveLength(2);
  });

  it('should handle both - and * list markers', () => {
    const content = `
# Module

- Objective with dash
* Objective with asterisk
`;

    const modules = parseCurriculum(content);

    expect(modules).toHaveLength(1);
    expect(modules[0].objectives).toHaveLength(2);
  });

  it('should skip empty objectives', () => {
    const content = `
# Module

- Valid objective
-
-
`;

    const modules = parseCurriculum(content);

    expect(modules).toHaveLength(1);
    expect(modules[0].objectives).toHaveLength(1);
  });

  it('should skip modules with no objectives', () => {
    const content = `
# Empty Module

# Module with Objectives

- Objective 1
`;

    const modules = parseCurriculum(content);

    expect(modules).toHaveLength(1);
    expect(modules[0].id).toBe('module-with-objectives');
  });

  it('should convert titles to valid IDs', () => {
    const content = `
# Advanced C++ Programming!

- Objective 1

# Data Structures & Algorithms

- Objective 2
`;

    const modules = parseCurriculum(content);

    expect(modules[0].id).toBe('advanced-c-programming');
    expect(modules[1].id).toBe('data-structures-algorithms');
  });

  it('should handle empty content', () => {
    const modules = parseCurriculum('');
    expect(modules).toHaveLength(0);
  });

  it('should handle content with no modules', () => {
    const content = `
Just some text

- Random list item
`;

    const modules = parseCurriculum(content);
    expect(modules).toHaveLength(0);
  });
});
