import { TRPCError } from '@trpc/server';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '~/server/db';
import { usersTable } from '~/server/db/schema';
import { publicProcedure } from '../trpc';

export const userCheckProcedure = publicProcedure.input(z.string().email()).mutation(async ({ input }) => {
  const u = await db.query.usersTable.findFirst({
    where: and(eq(usersTable.email, input), eq(usersTable.inactive, false)),
    columns: {
      authMethod: true,
    },
  });
  if (!u) throw new TRPCError({ code: 'NOT_FOUND', message: `User with email ${input} not found` });
  return u;
});

export default userCheckProcedure;
