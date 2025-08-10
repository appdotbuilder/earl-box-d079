import { z } from 'zod';

// File schema for database records
export const fileSchema = z.object({
  slug: z.string(),
  object_name: z.string(),
  size_bytes: z.number().int().nonnegative(),
  content_type: z.string().nullable(),
  created_at: z.coerce.date()
});

export type File = z.infer<typeof fileSchema>;

// Request upload schema
export const requestUploadInputSchema = z.object({
  filename: z.string().min(1),
  contentType: z.string().min(1)
});

export type RequestUploadInput = z.infer<typeof requestUploadInputSchema>;

export const requestUploadResponseSchema = z.object({
  slug: z.string(),
  objectName: z.string(),
  uploadUrl: z.string(),
  maxBytes: z.number().int().positive()
});

export type RequestUploadResponse = z.infer<typeof requestUploadResponseSchema>;

// Finalize upload schema
export const finalizeUploadInputSchema = z.object({
  slug: z.string().min(1),
  objectName: z.string().min(1)
});

export type FinalizeUploadInput = z.infer<typeof finalizeUploadInputSchema>;

export const finalizeUploadResponseSchema = z.object({
  linkPath: z.string(),
  sizeBytes: z.number().int().nonnegative(),
  contentType: z.string().nullable()
});

export type FinalizeUploadResponse = z.infer<typeof finalizeUploadResponseSchema>;

// Get file schema
export const getFileResponseSchema = z.object({
  url: z.string(),
  contentType: z.string().nullable()
});

export type GetFileResponse = z.infer<typeof getFileResponseSchema>;

// Stats schema for total files count
export const fileStatsSchema = z.object({
  totalFiles: z.number().int().nonnegative()
});

export type FileStats = z.infer<typeof fileStatsSchema>;