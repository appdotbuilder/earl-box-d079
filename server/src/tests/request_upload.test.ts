import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { type RequestUploadInput } from '../schema';
import { requestUpload } from '../handlers/request_upload';

// Set up test environment variable
process.env['BLOB_READ_WRITE_TOKEN'] = 'test-blob-token-for-testing';

// Test inputs
const testInput: RequestUploadInput = {
  filename: 'test-document.pdf',
  contentType: 'application/pdf'
};

const testInputWithSpecialChars: RequestUploadInput = {
  filename: 'my file (1) @#$%.txt',
  contentType: 'text/plain'
};

const testInputWithoutExtension: RequestUploadInput = {
  filename: 'README',
  contentType: 'text/plain'
};

describe('requestUpload', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should generate upload request with valid slug and object name', async () => {
    const result = await requestUpload(testInput);

    // Validate slug format (8 alphanumeric characters)
    expect(result.slug).toBeDefined();
    expect(typeof result.slug).toBe('string');
    expect(result.slug).toMatch(/^[a-zA-Z0-9]{8}$/);

    // Validate object name format
    expect(result.objectName).toBeDefined();
    expect(typeof result.objectName).toBe('string');
    expect(result.objectName).toMatch(/^\d+_[a-z0-9]+_test-document\.pdf$/);

    // Validate upload URL
    expect(result.uploadUrl).toBeDefined();
    expect(typeof result.uploadUrl).toBe('string');
    expect(result.uploadUrl).toMatch(/^https:\/\/blob\.vercel-storage\.com\/upload/);
    expect(result.uploadUrl).toContain('pathname=');
    expect(result.uploadUrl).toContain('contentType=');
    expect(result.uploadUrl).toContain('token=');
    expect(result.uploadUrl).toContain('x-vercel-blob-ttl=3600');

    // Validate maxBytes (200MB)
    expect(result.maxBytes).toBe(209715200);
  });

  it('should handle filenames with special characters', async () => {
    const result = await requestUpload(testInputWithSpecialChars);

    // Object name should clean special characters
    // 'my file (1) @#$%.txt' becomes 'my_file__1______.txt' after cleaning
    expect(result.objectName).toMatch(/^\d+_[a-z0-9]+_my_file__1______\.txt$/);
    
    // Slug should still be valid
    expect(result.slug).toMatch(/^[a-zA-Z0-9]{8}$/);
    
    // Upload URL should properly encode the filename
    expect(result.uploadUrl).toContain('pathname=');
    expect(result.uploadUrl).toContain('contentType=text%2Fplain');
  });

  it('should handle filenames without extensions', async () => {
    const result = await requestUpload(testInputWithoutExtension);

    // Object name should not have an extension
    expect(result.objectName).toMatch(/^\d+_[a-z0-9]+_README$/);
    expect(result.objectName).not.toContain('.');
    
    // Other properties should be valid
    expect(result.slug).toMatch(/^[a-zA-Z0-9]{8}$/);
    expect(result.uploadUrl).toBeDefined();
    expect(result.maxBytes).toBe(209715200);
  });

  it('should generate unique slugs for multiple requests', async () => {
    const result1 = await requestUpload(testInput);
    const result2 = await requestUpload(testInput);
    const result3 = await requestUpload(testInput);

    // All slugs should be different
    expect(result1.slug).not.toBe(result2.slug);
    expect(result2.slug).not.toBe(result3.slug);
    expect(result1.slug).not.toBe(result3.slug);

    // All should be valid format
    expect(result1.slug).toMatch(/^[a-zA-Z0-9]{8}$/);
    expect(result2.slug).toMatch(/^[a-zA-Z0-9]{8}$/);
    expect(result3.slug).toMatch(/^[a-zA-Z0-9]{8}$/);
  });

  it('should generate unique object names for multiple requests', async () => {
    const result1 = await requestUpload(testInput);
    const result2 = await requestUpload(testInput);

    // Object names should be different due to timestamp and random suffix
    expect(result1.objectName).not.toBe(result2.objectName);
    
    // Both should contain the cleaned filename
    expect(result1.objectName).toContain('test-document.pdf');
    expect(result2.objectName).toContain('test-document.pdf');
  });

  it('should handle different content types correctly', async () => {
    const imageInput: RequestUploadInput = {
      filename: 'photo.jpg',
      contentType: 'image/jpeg'
    };

    const result = await requestUpload(imageInput);

    // Upload URL should contain the correct encoded content type
    expect(result.uploadUrl).toContain('contentType=image%2Fjpeg');
    expect(result.objectName).toContain('photo.jpg');
  });

  it('should return consistent maxBytes value', async () => {
    const results = await Promise.all([
      requestUpload(testInput),
      requestUpload(testInputWithSpecialChars),
      requestUpload(testInputWithoutExtension)
    ]);

    // All results should have the same 200MB limit
    results.forEach(result => {
      expect(result.maxBytes).toBe(209715200);
    });
  });

  it('should encode object names properly in upload URLs', async () => {
    const complexInput: RequestUploadInput = {
      filename: 'file with spaces & symbols.pdf',
      contentType: 'application/pdf'
    };

    const result = await requestUpload(complexInput);

    // Object name should be cleaned
    // 'file with spaces & symbols.pdf' becomes 'file_with_spaces___symbols.pdf'
    expect(result.objectName).toMatch(/^\d+_[a-z0-9]+_file_with_spaces___symbols\.pdf$/);
    
    // Upload URL should properly encode the pathname
    expect(result.uploadUrl).toContain('pathname=');
    expect(result.uploadUrl).toContain(encodeURIComponent(result.objectName));
  });

  it('should include TTL parameter in upload URL', async () => {
    const result = await requestUpload(testInput);

    // Upload URL should include TTL for signed URL expiration
    expect(result.uploadUrl).toContain('x-vercel-blob-ttl=3600');
  });
});

describe('requestUpload - Environment Variable Validation', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should handle missing environment variable gracefully', async () => {
    // Save and remove the environment variable
    const originalToken = process.env['BLOB_READ_WRITE_TOKEN'];
    delete process.env['BLOB_READ_WRITE_TOKEN'];

    try {
      await expect(requestUpload(testInput)).rejects.toThrow(/BLOB_READ_WRITE_TOKEN environment variable is required/i);
    } finally {
      // Restore the environment variable
      process.env['BLOB_READ_WRITE_TOKEN'] = originalToken;
    }
  });
});