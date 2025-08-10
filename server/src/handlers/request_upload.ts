import { type RequestUploadInput, type RequestUploadResponse } from '../schema';

// Generate a random short slug for file sharing (8 characters)
function generateSlug(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Generate a unique object name for storage
function generateObjectName(filename: string): string {
  const timestamp = Date.now();
  const randomSuffix = Math.random().toString(36).substring(2, 8);
  
  // Extract file extension if present
  const lastDotIndex = filename.lastIndexOf('.');
  const extension = lastDotIndex > 0 ? filename.substring(lastDotIndex) : '';
  const baseName = lastDotIndex > 0 ? filename.substring(0, lastDotIndex) : filename;
  
  // Clean the base name to remove special characters
  const cleanBaseName = baseName.replace(/[^a-zA-Z0-9-_]/g, '_');
  
  return `${timestamp}_${randomSuffix}_${cleanBaseName}${extension}`;
}

// Generate signed upload URL for Vercel Blob storage
function generateSignedUploadUrl(objectName: string, contentType: string): string {
  const token = process.env['BLOB_READ_WRITE_TOKEN'];
  if (!token) {
    throw new Error('BLOB_READ_WRITE_TOKEN environment variable is required');
  }

  // Create signed upload URL with required parameters
  const baseUrl = 'https://blob.vercel-storage.com/upload';
  const params = new URLSearchParams({
    token,
    pathname: objectName,
    contentType,
    // Add TTL of 3600 seconds (1 hour) for the signed URL
    'x-vercel-blob-ttl': '3600'
  });

  return `${baseUrl}?${params.toString()}`;
}

export async function requestUpload(input: RequestUploadInput): Promise<RequestUploadResponse> {
  try {
    // Generate unique identifiers
    const slug = generateSlug();
    const objectName = generateObjectName(input.filename);
    
    // Generate signed upload URL for client to upload directly to Vercel Blob
    const uploadUrl = generateSignedUploadUrl(objectName, input.contentType);
    
    const maxBytes = 209715200; // 200MB limit
    
    return {
      slug,
      objectName,
      uploadUrl,
      maxBytes
    };
  } catch (error) {
    console.error('Upload request failed:', error);
    throw error;
  }
}