import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { VectorStore, createVectorStore } from './vector-store.js';
import { mkdtemp, rm } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';

describe('VectorStore', () => {
  let store: VectorStore;
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'vector-store-test-'));
    store = await createVectorStore(tempDir);
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  describe('addDocuments', () => {
    it('should add documents to the store', async () => {
      const ids = await store.addDocuments(
        ['Document 1', 'Document 2'],
        [{ type: 'test' }, { type: 'test' }]
      );

      expect(ids).toHaveLength(2);
      expect(ids[0]).toBeDefined();
      expect(ids[1]).toBeDefined();
    });

    it('should return empty array for empty input', async () => {
      const ids = await store.addDocuments([]);
      expect(ids).toEqual([]);
    });

    it('should not duplicate documents with same content', async () => {
      const ids1 = await store.addDocuments(['Same content']);
      const ids2 = await store.addDocuments(['Same content']);

      expect(ids1[0]).toBe(ids2[0]);
    });

    it('should handle documents without metadata', async () => {
      const ids = await store.addDocuments(['Doc without metadata']);
      expect(ids).toHaveLength(1);
    });
  });

  describe('search', () => {
    beforeEach(async () => {
      await store.addDocuments([
        'JavaScript programming language',
        'Python programming basics',
        'TypeScript advanced features',
      ]);
    });

    it('should find documents by query', async () => {
      const results = await store.search('programming');

      expect(results.length).toBeGreaterThan(0);
      expect(results[0]?.content).toContain('programming');
    });

    it('should limit results by k parameter', async () => {
      const results = await store.search('programming', 1);

      expect(results.length).toBeLessThanOrEqual(1);
    });

    it('should return empty array when no matches', async () => {
      const results = await store.search('nonexistent query xyz');

      expect(results).toEqual([]);
    });

    it('should be case insensitive', async () => {
      const results = await store.search('PROGRAMMING');

      expect(results.length).toBeGreaterThan(0);
    });
  });

  describe('getStats', () => {
    it('should return store statistics', async () => {
      await store.addDocuments(['Doc 1', 'Doc 2', 'Doc 3']);

      const stats = store.getStats();

      expect(stats.numDocuments).toBe(3);
      expect(stats.persistDirectory).toBe(tempDir);
    });

    it('should return zero documents for empty store', () => {
      const stats = store.getStats();

      expect(stats.numDocuments).toBe(0);
    });
  });

  describe('clear', () => {
    it('should remove all documents', async () => {
      await store.addDocuments(['Doc 1', 'Doc 2', 'Doc 3']);

      await store.clear();

      const stats = store.getStats();
      expect(stats.numDocuments).toBe(0);
    });

    it('should allow adding documents after clear', async () => {
      await store.addDocuments(['Doc 1']);
      await store.clear();
      await store.addDocuments(['Doc 2']);

      const stats = store.getStats();
      expect(stats.numDocuments).toBe(1);
    });
  });

  describe('persistence', () => {
    it('should persist and reload documents', async () => {
      await store.addDocuments(['Persisted doc 1', 'Persisted doc 2']);

      // Create new store instance with same directory
      const store2 = await createVectorStore(tempDir);
      const stats = store2.getStats();

      expect(stats.numDocuments).toBe(2);
    });
  });

  describe('createVectorStore', () => {
    it('should create and initialize a store', async () => {
      const newTempDir = await mkdtemp(join(tmpdir(), 'vector-test-'));
      const newStore = await createVectorStore(newTempDir);

      expect(newStore).toBeDefined();
      expect(newStore.getStats().persistDirectory).toBe(newTempDir);

      await rm(newTempDir, { recursive: true, force: true });
    });
  });
});
