import { TRPCError } from '@trpc/server';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { clerkClient } from '../clerk';
import { usersTable } from '../db/schema';
import { createTRPCRouter, publicProcedure, authenticatedProcedure } from './trpc';

// #region libs
const idSchema = z.string().length(12, 'id must be 12 characters long');
// #endregion

// #region userCheck
const userCheckProcedure = publicProcedure
  .input(z.object({ email: z.string().email() }))
  .mutation(async ({ input: { email } }) => {
    // Check if user exists
    const usersRes = await clerkClient.users.getUserList({ emailAddress: [email] });
    if (usersRes.totalCount === 0 || !usersRes.data[0]) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'User not found' });
    }

    const { fullName, passwordEnabled, emailAddresses } = usersRes.data[0];

    if (passwordEnabled) {
      return { authMethod: 'password', fullName } as const;
    } else if (emailAddresses.length > 0) {
      const isCurrentEmailVerified =
        emailAddresses.find(emailAddress => emailAddress.emailAddress === email)?.verification?.status === 'verified';
      if (isCurrentEmailVerified) {
        return { authMethod: 'email-link', fullName } as const;
      } else {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Email not verified' });
      }
    } else {
      throw new TRPCError({ code: 'FORBIDDEN', message: 'No auth method available' });
    }
  });

const usersRouter = createTRPCRouter({
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

const routes = {
  userCheck: userCheckProcedure,
  users: usersRouter,
} satisfies Parameters<typeof createTRPCRouter>[0];

export default routes;
