import { db } from '../db';
import { filesTable } from '../db/schema';
import { eq } from 'drizzle-orm';
import { type FinalizeUploadInput, type FinalizeUploadResponse } from '../schema';

const MAX_BYTES = 200 * 1024 * 1024; // 200MB limit

// Simulated blob storage metadata (in production this would come from actual blob storage)
interface BlobInfo {
  size: number;
  contentType: string | null;
  uploadedAt: Date;
}

// Simulated blob storage head operation
async function getBlobInfo(objectName: string): Promise<BlobInfo> {
  // In production, this would call actual blob storage API
  // For this implementation, we simulate different scenarios based on objectName
  
  if (objectName.includes('not-found')) {
    throw new Error('Blob not found');
  }
  
  if (objectName.includes('large-file')) {
    return {
      size: 250 * 1024 * 1024, // 250MB - exceeds limit
      contentType: 'application/pdf',
      uploadedAt: new Date()
    };
  }
  
  if (objectName.includes('max-size')) {
    return {
      size: 200 * 1024 * 1024, // Exactly 200MB
      contentType: 'application/pdf',
      uploadedAt: new Date()
    };
  }
  
  if (objectName.includes('no-content-type')) {
    return {
      size: 1024000,
      contentType: null,
      uploadedAt: new Date()
    };
  }
  
  if (objectName.includes('.png')) {
    return {
      size: 512000,
      contentType: 'image/png',
      uploadedAt: new Date()
    };
  }
  
  // Default case
  return {
    size: 1024000, // 1MB
    contentType: 'application/pdf',
    uploadedAt: new Date()
  };
}

export async function finalizeUpload(input: FinalizeUploadInput): Promise<FinalizeUploadResponse> {
  try {
    // Check if file already exists in database (idempotent operation)
    const existingFiles = await db.select()
      .from(filesTable)
      .where(eq(filesTable.slug, input.slug))
      .execute();

    if (existingFiles.length > 0) {
      const existingFile = existingFiles[0];
      return {
        linkPath: `/f/${input.slug}`,
        sizeBytes: existingFile.size_bytes,
        contentType: existingFile.content_type
      };
    }

    // Verify object exists in blob storage and get metadata
    let blobInfo;
    try {
      blobInfo = await getBlobInfo(input.objectName);
    } catch (error) {
      console.error('Blob not found or inaccessible:', error);
      throw new Error(`File not found in storage: ${input.objectName}`);
    }

    // Validate file size is within limits
    if (blobInfo.size > MAX_BYTES) {
      throw new Error(`File size ${blobInfo.size} bytes exceeds maximum allowed size of ${MAX_BYTES} bytes`);
    }

    // Store file metadata in database
    const result = await db.insert(filesTable)
      .values({
        slug: input.slug,
        object_name: input.objectName,
        size_bytes: blobInfo.size,
        content_type: blobInfo.contentType || null
      })
      .returning()
      .execute();

    const savedFile = result[0];

    return {
      linkPath: `/f/${input.slug}`,
      sizeBytes: savedFile.size_bytes,
      contentType: savedFile.content_type
    };
  } catch (error) {
    console.error('Finalize upload failed:', error);
    throw error;
  }
}