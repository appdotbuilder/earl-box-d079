import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { filesTable } from '../db/schema';
import { getFileStats } from '../handlers/get_file_stats';

describe('getFileStats', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return zero files when database is empty', async () => {
    const result = await getFileStats();

    expect(result.totalFiles).toEqual(0);
    expect(typeof result.totalFiles).toBe('number');
  });

  it('should return correct count with single file', async () => {
    // Insert a test file
    await db.insert(filesTable)
      .values({
        slug: 'test-file-1',
        object_name: 'uploads/test-file-1.txt',
        size_bytes: 1024,
        content_type: 'text/plain'
      })
      .execute();

    const result = await getFileStats();

    expect(result.totalFiles).toEqual(1);
    expect(typeof result.totalFiles).toBe('number');
  });

  it('should return correct count with multiple files', async () => {
    // Insert multiple test files
    await db.insert(filesTable)
      .values([
        {
          slug: 'test-file-1',
          object_name: 'uploads/test-file-1.txt',
          size_bytes: 1024,
          content_type: 'text/plain'
        },
        {
          slug: 'test-file-2',
          object_name: 'uploads/test-file-2.jpg',
          size_bytes: 2048,
          content_type: 'image/jpeg'
        },
        {
          slug: 'test-file-3',
          object_name: 'uploads/test-file-3.pdf',
          size_bytes: 4096,
          content_type: 'application/pdf'
        }
      ])
      .execute();

    const result = await getFileStats();

    expect(result.totalFiles).toEqual(3);
    expect(typeof result.totalFiles).toBe('number');
  });

  it('should count files with null content_type', async () => {
    // Insert files with different content types including null
    await db.insert(filesTable)
      .values([
        {
          slug: 'test-file-with-content-type',
          object_name: 'uploads/with-content-type.txt',
          size_bytes: 1024,
          content_type: 'text/plain'
        },
        {
          slug: 'test-file-without-content-type',
          object_name: 'uploads/without-content-type.bin',
          size_bytes: 2048,
          content_type: null
        }
      ])
      .execute();

    const result = await getFileStats();

    expect(result.totalFiles).toEqual(2);
    expect(typeof result.totalFiles).toBe('number');
  });

  it('should count files with different sizes', async () => {
    // Insert files with various sizes including zero
    await db.insert(filesTable)
      .values([
        {
          slug: 'empty-file',
          object_name: 'uploads/empty-file.txt',
          size_bytes: 0,
          content_type: 'text/plain'
        },
        {
          slug: 'small-file',
          object_name: 'uploads/small-file.txt',
          size_bytes: 100,
          content_type: 'text/plain'
        },
        {
          slug: 'large-file',
          object_name: 'uploads/large-file.bin',
          size_bytes: 1048576, // 1MB
          content_type: 'application/octet-stream'
        }
      ])
      .execute();

    const result = await getFileStats();

    expect(result.totalFiles).toEqual(3);
    expect(typeof result.totalFiles).toBe('number');
  });

  it('should return correct stats structure', async () => {
    const result = await getFileStats();

    // Verify the returned object has the correct structure
    expect(result).toHaveProperty('totalFiles');
    expect(Object.keys(result)).toHaveLength(1);
    expect(typeof result.totalFiles).toBe('number');
    expect(result.totalFiles).toBeGreaterThanOrEqual(0);
  });
});