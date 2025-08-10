import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { filesTable } from '../db/schema';
import { eq } from 'drizzle-orm';
import { type FinalizeUploadInput } from '../schema';
import { finalizeUpload } from '../handlers/finalize_upload';

// Test inputs
const testInput: FinalizeUploadInput = {
  slug: 'test-file-123',
  objectName: 'uploads/test-file-123.pdf'
};

describe('finalizeUpload', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should finalize upload and store file metadata', async () => {
    const result = await finalizeUpload(testInput);

    // Validate response structure
    expect(result.linkPath).toEqual('/f/test-file-123');
    expect(result.sizeBytes).toEqual(1024000);
    expect(result.contentType).toEqual('application/pdf');

    // Verify data was saved to database
    const savedFiles = await db.select()
      .from(filesTable)
      .where(eq(filesTable.slug, testInput.slug))
      .execute();

    expect(savedFiles).toHaveLength(1);
    expect(savedFiles[0].slug).toEqual(testInput.slug);
    expect(savedFiles[0].object_name).toEqual(testInput.objectName);
    expect(savedFiles[0].size_bytes).toEqual(1024000);
    expect(savedFiles[0].content_type).toEqual('application/pdf');
    expect(savedFiles[0].created_at).toBeInstanceOf(Date);
  });

  it('should handle null content type', async () => {
    const inputWithNoContentType: FinalizeUploadInput = {
      slug: 'test-no-content-type',
      objectName: 'uploads/no-content-type.bin'
    };

    const result = await finalizeUpload(inputWithNoContentType);

    expect(result.contentType).toBeNull();

    // Verify null content type is stored correctly
    const savedFiles = await db.select()
      .from(filesTable)
      .where(eq(filesTable.slug, inputWithNoContentType.slug))
      .execute();

    expect(savedFiles[0].content_type).toBeNull();
  });

  it('should be idempotent - return existing file if already exists', async () => {
    // First, create an existing file record
    await db.insert(filesTable)
      .values({
        slug: testInput.slug,
        object_name: testInput.objectName,
        size_bytes: 2048000,
        content_type: 'text/plain'
      })
      .execute();

    // Call finalize upload - should return existing data
    const result = await finalizeUpload(testInput);

    // Should return existing file data, not simulated blob data
    expect(result.linkPath).toEqual('/f/test-file-123');
    expect(result.sizeBytes).toEqual(2048000);
    expect(result.contentType).toEqual('text/plain');

    // Verify only one record exists
    const allFiles = await db.select()
      .from(filesTable)
      .where(eq(filesTable.slug, testInput.slug))
      .execute();

    expect(allFiles).toHaveLength(1);
  });

  it('should throw error when blob not found in storage', async () => {
    const notFoundInput: FinalizeUploadInput = {
      slug: 'not-found-file',
      objectName: 'uploads/not-found.pdf'
    };

    await expect(finalizeUpload(notFoundInput))
      .rejects.toThrow(/file not found in storage/i);

    // Verify no database record was created
    const savedFiles = await db.select()
      .from(filesTable)
      .where(eq(filesTable.slug, notFoundInput.slug))
      .execute();

    expect(savedFiles).toHaveLength(0);
  });

  it('should throw error when file exceeds size limit', async () => {
    const largeFileInput: FinalizeUploadInput = {
      slug: 'large-file-test',
      objectName: 'uploads/large-file.pdf'
    };

    await expect(finalizeUpload(largeFileInput))
      .rejects.toThrow(/file size.*exceeds maximum allowed size/i);

    // Verify no database record was created
    const savedFiles = await db.select()
      .from(filesTable)
      .where(eq(filesTable.slug, largeFileInput.slug))
      .execute();

    expect(savedFiles).toHaveLength(0);
  });

  it('should handle file at exactly the size limit', async () => {
    const maxSizeInput: FinalizeUploadInput = {
      slug: 'max-size-test',
      objectName: 'uploads/max-size.pdf'
    };

    const result = await finalizeUpload(maxSizeInput);

    expect(result.sizeBytes).toEqual(200 * 1024 * 1024);

    // Verify file was saved
    const savedFiles = await db.select()
      .from(filesTable)
      .where(eq(filesTable.slug, maxSizeInput.slug))
      .execute();

    expect(savedFiles).toHaveLength(1);
    expect(savedFiles[0].size_bytes).toEqual(200 * 1024 * 1024);
  });

  it('should handle different file types correctly', async () => {
    const imageInput: FinalizeUploadInput = {
      slug: 'test-image-456',
      objectName: 'uploads/test-image-456.png'
    };

    const result = await finalizeUpload(imageInput);

    expect(result.linkPath).toEqual('/f/test-image-456');
    expect(result.sizeBytes).toEqual(512000);
    expect(result.contentType).toEqual('image/png');

    // Verify correct data in database
    const savedFiles = await db.select()
      .from(filesTable)
      .where(eq(filesTable.slug, imageInput.slug))
      .execute();

    expect(savedFiles[0].content_type).toEqual('image/png');
    expect(savedFiles[0].size_bytes).toEqual(512000);
  });

  it('should handle multiple different slugs correctly', async () => {
    const inputs = [
      { slug: 'file-1', objectName: 'uploads/file-1.pdf' },
      { slug: 'file-2', objectName: 'uploads/file-2.png' },
      { slug: 'file-3', objectName: 'uploads/file-3.txt' }
    ];

    // Process all files
    const results = await Promise.all(
      inputs.map(input => finalizeUpload(input))
    );

    // Verify all results
    expect(results).toHaveLength(3);
    expect(results[0].linkPath).toEqual('/f/file-1');
    expect(results[1].linkPath).toEqual('/f/file-2');
    expect(results[2].linkPath).toEqual('/f/file-3');

    // Verify all were saved to database
    const allFiles = await db.select()
      .from(filesTable)
      .execute();

    expect(allFiles).toHaveLength(3);
    
    // Verify unique slugs and object names
    const slugs = allFiles.map(f => f.slug);
    const objectNames = allFiles.map(f => f.object_name);
    
    expect(new Set(slugs).size).toEqual(3); // All unique
    expect(new Set(objectNames).size).toEqual(3); // All unique
  });
});