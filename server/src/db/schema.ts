import { text, pgTable, timestamp, bigint, index } from 'drizzle-orm/pg-core';

export const filesTable = pgTable('files', {
  slug: text('slug').primaryKey(),
  object_name: text('object_name').notNull().unique(),
  size_bytes: bigint('size_bytes', { mode: 'number' }).notNull(), // Use number mode for TypeScript compatibility
  content_type: text('content_type'), // Nullable by default
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  createdAtIdx: index('files_created_at_idx').on(table.created_at.desc())
}));

// TypeScript types for the table schema
export type File = typeof filesTable.$inferSelect; // For SELECT operations
export type NewFile = typeof filesTable.$inferInsert; // For INSERT operations

// Export all tables for proper query building
export const tables = { files: filesTable };