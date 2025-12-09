import { describe, it, expect } from 'vitest';

describe('Project Setup', () => {
  it('should have Node.js environment', () => {
    expect(process.version).toBeDefined();
    expect(process.version).toMatch(/^v\d+\.\d+\.\d+/);
  });

  it('should support ES modules', () => {
    expect(import.meta.url).toBeDefined();
  });
});
