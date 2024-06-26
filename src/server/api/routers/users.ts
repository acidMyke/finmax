import { TRPCError } from '@trpc/server';
import { eq } from 'drizzle-orm';
import { usersTable } from '~/server/db/schema';
import { authenticatedProcedure, createTRPCRouter } from '../trpc';

export const usersRouter = createTRPCRouter({
  init: authenticatedProcedure.query(async ({ ctx: { auth, db } }) => {
    const { userId: clerkUserId } = auth;
    // Massive query to db
    const res = await db.query.usersTable.findFirst({
      where: eq(usersTable.clerkId, clerkUserId),
      columns: { defaultAccountId: true, defaultMethodId: true, settings: true },
      with: {
        accounts: {
          columns: { id: true, label: true, currency: true, iconId: true },
        },
        methods: {
          columns: { id: true, label: true, iconId: true },
        },
        categories: {
          columns: { id: true, label: true, iconId: true },
        },
      },
    });

    if (!res) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'User not found' });
    }

    return res;
  }),
});

export default usersRouter;
