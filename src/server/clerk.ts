import { env } from '~/env';
import { createClerkClient } from '@clerk/nextjs/server';

const globalForClerk = globalThis as unknown as {
  clerkClient: ReturnType<typeof createClerkClient>;
};

export const clerkClient = globalForClerk.clerkClient ?? createClerkClient({ secretKey: env.CLERK_SECRET_KEY });
if (env.NODE_ENV !== 'production') globalForClerk.clerkClient = clerkClient;

export default clerkClient;
6;
