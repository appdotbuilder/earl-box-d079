import { db } from '../db';
import { filesTable } from '../db/schema';
import { count } from 'drizzle-orm';
import { type FileStats } from '../schema';

export async function getFileStats(): Promise<FileStats> {
  try {
    // Count the total number of files in the database
    const result = await db.select({ count: count() })
      .from(filesTable)
      .execute();

    const totalFiles = result[0]?.count ?? 0;

    return {
      totalFiles
    };
  } catch (error) {
    console.error('Get file stats failed:', error);
    throw error;
  }
}