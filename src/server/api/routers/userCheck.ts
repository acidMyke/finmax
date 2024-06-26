import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { clerkClient } from '~/server/clerk';
import { publicProcedure } from '../trpc';

export const userCheckProcedure = publicProcedure
  .input(
    z.object({
      email: z.string().email(),
    }),
  )
  .mutation(async ({ input: { email } }) => {
    // Check if user exists
    const usersRes = await clerkClient.users.getUserList({ emailAddress: [email] });
    if (usersRes.totalCount === 0 || !usersRes.data[0]) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'User not found' });
    }

    const { fullName, passwordEnabled, emailAddresses } = usersRes.data[0];

    if (passwordEnabled) {
      return { authMethod: 'password', fullName };
    } else if (emailAddresses.length > 0) {
      const isCurrentEmailVerified =
        emailAddresses.find(emailAddress => emailAddress.emailAddress === email)?.verification?.status === 'verified';
      if (isCurrentEmailVerified) {
        return { authMethod: 'magic-link', fullName };
      } else {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Email not verified' });
      }
    } else {
      throw new TRPCError({ code: 'FORBIDDEN', message: 'No auth method available' });
    }
  });

export default userCheckProcedure;
