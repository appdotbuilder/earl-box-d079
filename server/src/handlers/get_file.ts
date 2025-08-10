import { db } from '../db';
import { filesTable } from '../db/schema';
import { type GetFileResponse } from '../schema';
import { eq } from 'drizzle-orm';

export async function getFile(slug: string): Promise<GetFileResponse> {
  try {
    // Look up the file record by slug in the database
    const fileRecords = await db.select()
      .from(filesTable)
      .where(eq(filesTable.slug, slug))
      .execute();

    if (fileRecords.length === 0) {
      throw new Error(`File with slug ${slug} not found`);
    }

    const fileRecord = fileRecords[0];

    // Generate a public URL to the file in Vercel Blob storage
    // Using the object_name to construct the blob URL
    const url = `https://blob.vercel-storage.com/${fileRecord.object_name}`;

    return {
      url,
      contentType: fileRecord.content_type
    };
  } catch (error) {
    console.error('Get file failed:', error);
    throw error;
  }
}