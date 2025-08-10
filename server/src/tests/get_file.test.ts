import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { filesTable } from '../db/schema';
import { getFile } from '../handlers/get_file';
import { eq } from 'drizzle-orm';

describe('getFile', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should get file by slug', async () => {
    // Create test file record
    await db.insert(filesTable)
      .values({
        slug: 'test-file-123',
        object_name: 'uploads/test-file-123.jpg',
        size_bytes: 1024,
        content_type: 'image/jpeg'
      })
      .execute();

    const result = await getFile('test-file-123');

    expect(result.url).toEqual('https://blob.vercel-storage.com/uploads/test-file-123.jpg');
    expect(result.contentType).toEqual('image/jpeg');
  });

  it('should handle null content type', async () => {
    // Create test file record with null content_type
    await db.insert(filesTable)
      .values({
        slug: 'test-file-null-type',
        object_name: 'uploads/unknown-type.bin',
        size_bytes: 2048,
        content_type: null
      })
      .execute();

    const result = await getFile('test-file-null-type');

    expect(result.url).toEqual('https://blob.vercel-storage.com/uploads/unknown-type.bin');
    expect(result.contentType).toBeNull();
  });

  it('should handle different file types correctly', async () => {
    const testCases = [
      {
        slug: 'pdf-doc',
        object_name: 'documents/report.pdf',
        content_type: 'application/pdf'
      },
      {
        slug: 'text-file',
        object_name: 'texts/readme.txt',
        content_type: 'text/plain'
      },
      {
        slug: 'video-file',
        object_name: 'media/video.mp4',
        content_type: 'video/mp4'
      }
    ];

    // Insert all test files
    for (const testCase of testCases) {
      await db.insert(filesTable)
        .values({
          slug: testCase.slug,
          object_name: testCase.object_name,
          size_bytes: 5000,
          content_type: testCase.content_type
        })
        .execute();
    }

    // Test each file
    for (const testCase of testCases) {
      const result = await getFile(testCase.slug);
      
      expect(result.url).toEqual(`https://blob.vercel-storage.com/${testCase.object_name}`);
      expect(result.contentType).toEqual(testCase.content_type);
    }
  });

  it('should throw error for non-existent file', async () => {
    await expect(getFile('non-existent-slug')).rejects.toThrow(/File with slug non-existent-slug not found/i);
  });

  it('should verify file exists in database after insertion', async () => {
    const testSlug = 'verify-existence';
    const testObjectName = 'test/verify.png';
    
    // Insert test file
    await db.insert(filesTable)
      .values({
        slug: testSlug,
        object_name: testObjectName,
        size_bytes: 8192,
        content_type: 'image/png'
      })
      .execute();

    // Verify file was actually inserted
    const dbRecords = await db.select()
      .from(filesTable)
      .where(eq(filesTable.slug, testSlug))
      .execute();

    expect(dbRecords).toHaveLength(1);
    expect(dbRecords[0].slug).toEqual(testSlug);
    expect(dbRecords[0].object_name).toEqual(testObjectName);

    // Now test the handler
    const result = await getFile(testSlug);
    expect(result.url).toEqual(`https://blob.vercel-storage.com/${testObjectName}`);
    expect(result.contentType).toEqual('image/png');
  });

  it('should handle special characters in object names', async () => {
    const testSlug = 'special-chars';
    const objectNameWithSpaces = 'folder/file with spaces & symbols.jpg';

    await db.insert(filesTable)
      .values({
        slug: testSlug,
        object_name: objectNameWithSpaces,
        size_bytes: 3072,
        content_type: 'image/jpeg'
      })
      .execute();

    const result = await getFile(testSlug);

    expect(result.url).toEqual(`https://blob.vercel-storage.com/${objectNameWithSpaces}`);
    expect(result.contentType).toEqual('image/jpeg');
  });
});