import { initTRPC } from '@trpc/server';
import { createHTTPServer } from '@trpc/server/adapters/standalone';
import 'dotenv/config';
import cors from 'cors';
import superjson from 'superjson';
import { z } from 'zod';

// Import schemas
import { 
  requestUploadInputSchema,
  finalizeUploadInputSchema
} from './schema';

// Import handlers
import { requestUpload } from './handlers/request_upload';
import { finalizeUpload } from './handlers/finalize_upload';
import { getFile } from './handlers/get_file';
import { getFileStats } from './handlers/get_file_stats';

const t = initTRPC.create({
  transformer: superjson,
});

const publicProcedure = t.procedure;
const router = t.router;

const appRouter = router({
  // Health check endpoint
  healthcheck: publicProcedure.query(() => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }),

  // File upload flow endpoints
  requestUpload: publicProcedure
    .input(requestUploadInputSchema)
    .mutation(({ input }) => requestUpload(input)),

  finalizeUpload: publicProcedure
    .input(finalizeUploadInputSchema)
    .mutation(({ input }) => finalizeUpload(input)),

  // File retrieval endpoint
  getFile: publicProcedure
    .input(z.string())
    .query(({ input }) => getFile(input)),

  // Statistics endpoint
  getFileStats: publicProcedure
    .query(() => getFileStats()),
});

export type AppRouter = typeof appRouter;

async function start() {
  const port = process.env['SERVER_PORT'] || 2022;
  const server = createHTTPServer({
    middleware: (req, res, next) => {
      cors()(req, res, next);
    },
    router: appRouter,
    createContext() {
      return {};
    },
  });
  server.listen(port);
  console.log(`Earl Box TRPC server listening at port: ${port}`);
}

start();