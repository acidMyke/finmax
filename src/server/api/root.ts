import { createTRPCRouter } from '~/server/api/trpc';
import userCheck from './routers/userCheck';
import usersRouter from './routers/users';

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
  userCheck,
  users: usersRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;
